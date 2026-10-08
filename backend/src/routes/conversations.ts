import { Router, Response } from 'express';
import { storageService } from '../services/storageService.js';
import { hindsightService } from '../services/hindsightService.js';
import { groqService } from '../services/groqService.js';
import { Conversation, Message } from '../types.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Protect all conversation routes with authentication
router.use(requireAuth);

// GET conversations (optionally filter by customerId, strictly for authenticated user)
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.query.customerId as string | undefined;
    const conversations = storageService.getConversations(customerId, req.user?.id);
    res.json(conversations);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch conversations', details: err.message });
  }
});

// GET single conversation
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const conversation = storageService.getConversation(id, req.user?.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json(conversation);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch conversation', details: err.message });
  }
});

// POST create new conversation thread
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { customerId, title } = req.body;
    if (!customerId) {
      return res.status(400).json({ error: 'customerId is required' });
    }

    const customer = storageService.getCustomer(customerId, req.user?.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const existingConvs = storageService.getConversations(customerId, req.user?.id);
    const threadNumber = existingConvs.length + 1;

    const newConversation: Conversation = {
      id: crypto.randomUUID(),
      userId: req.user?.id,
      customerId,
      title: title?.trim() || `Support Conversation #${threadNumber}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: []
    };

    const created = storageService.createConversation(newConversation);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create conversation', details: err.message });
  }
});

// POST send message in conversation
router.post('/:id/messages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const conversationId = req.params.id as string;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message text cannot be empty' });
    }

    const conversation = storageService.getConversation(conversationId, req.user?.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const customer = storageService.getCustomer(conversation.customerId, req.user?.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customerMessageTime = new Date().toISOString();
    const customerMsg: Message = {
      id: crypto.randomUUID(),
      conversationId,
      customerId: customer.id,
      sender: 'customer',
      text: text.trim(),
      timestamp: customerMessageTime
    };

    // 1. Add customer message to conversation
    storageService.addMessageToConversation(conversationId, customerMsg);

    // 2. Retrieve relevant persistent memories from Hindsight (isolated per customer and user)
    const recalledMemories = await hindsightService.retrieveMemories(
      customer.id,
      text.trim(),
      4,
      req.user?.id
    );

    // 3. Generate personalized response and intelligence via Groq
    const aiResult = await groqService.generateSupportResponse(
      customer,
      conversation,
      text.trim(),
      recalledMemories
    );

    // 4. Retain new extracted memories into Hindsight
    const extractedMemoryItems = [];
    for (const mem of aiResult.extractedMemories) {
      const stored = await hindsightService.storeMemory({
        userId: req.user?.id,
        customerId: customer.id,
        conversationId,
        content: mem.content,
        category: mem.category,
        source: `${conversation.title} (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
      });
      extractedMemoryItems.push(stored);
    }

    // 5. Save any detected issues
    for (const issue of aiResult.detectedIssues) {
      if (issue.status === 'resolved') {
        const existing = storageService.getIssues(customer.id, req.user?.id).find(i => 
          i.title.toLowerCase().includes(issue.title.toLowerCase()) || 
          issue.title.toLowerCase().includes(i.title.toLowerCase())
        );
        if (existing) {
          storageService.updateIssue(existing.id, { status: 'resolved' }, req.user?.id);
        }
      } else {
        storageService.addIssue({
          id: crypto.randomUUID(),
          userId: req.user?.id,
          customerId: customer.id,
          title: issue.title,
          description: issue.description,
          severity: issue.severity,
          status: 'open',
          detectedAt: new Date().toISOString(),
          sourceConversationId: conversationId
        });
      }
    }

    // 6. Update customer health & summary if provided
    if (aiResult.customerHealth || aiResult.customerSummary) {
      storageService.updateCustomer(customer.id, {
        ...(aiResult.customerHealth && { health: aiResult.customerHealth }),
        ...(aiResult.healthReason && { healthReason: aiResult.healthReason }),
        ...(aiResult.customerSummary && { summary: aiResult.customerSummary })
      }, req.user?.id);
    }

    // 7. Create Continuo AI response message with explainability & Next Action
    const continuoMsg: Message = {
      id: crypto.randomUUID(),
      conversationId,
      customerId: customer.id,
      sender: 'continuo',
      text: aiResult.reply,
      timestamp: new Date().toISOString(),
      recalledMemories,
      recommendedNextAction: aiResult.recommendedNextAction,
      extractedMemories: extractedMemoryItems
    };

    storageService.addMessageToConversation(conversationId, continuoMsg);

    // Add timeline event for recommended next action
    if (aiResult.recommendedNextAction) {
      storageService.addTimelineEvent({
        id: crypto.randomUUID(),
        userId: req.user?.id,
        customerId: customer.id,
        type: 'action_recommended',
        title: `Recommended Next Action: ${aiResult.recommendedNextAction.action}`,
        description: aiResult.recommendedNextAction.reason,
        timestamp: new Date().toISOString(),
        relatedId: continuoMsg.id
      });
    }

    // Return the updated conversation along with the newly created messages
    const updatedConv = storageService.getConversation(conversationId, req.user?.id);
    res.json({
      conversation: updatedConv,
      customerMessage: customerMsg,
      continuoMessage: continuoMsg,
      recalledMemories,
      recommendedNextAction: aiResult.recommendedNextAction,
      extractedMemories: extractedMemoryItems
    });
  } catch (err: any) {
    console.error('Error handling message:', err);
    res.status(500).json({ error: 'Failed to process message', details: err.message });
  }
});

export default router;
