import { Router, Response } from 'express';
import { storageService } from '../services/storageService.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// GET /api/stats (Dashboard overview for authenticated user)
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const customers = storageService.getCustomers(userId);
    const conversations = storageService.getConversations(undefined, userId);
    const memories = storageService.getMemories(undefined, userId);
    const issues = storageService.getIssues(undefined, userId);
    const timeline = storageService.getTimeline(undefined, userId);

    const openIssues = issues.filter(i => i.status === 'open');
    const needingAttention = customers.filter(c => c.health === 'Needs Attention' || c.health === 'At Risk');

    const recentConversations = conversations.slice(0, 5).map(c => {
      const cust = customers.find(cu => cu.id === c.customerId);
      const lastMsg = c.messages[c.messages.length - 1];
      return {
        id: c.id,
        title: c.title,
        customerName: cust?.name || 'Unknown Customer',
        company: cust?.company || '',
        updatedAt: c.updatedAt,
        messageCount: c.messages.length,
        lastMessageText: lastMsg?.text || 'Empty conversation'
      };
    });

    res.json({
      totalCustomers: customers.length,
      totalConversations: conversations.length,
      storedMemories: memories.length,
      openIssues: openIssues.length,
      customersNeedingAttention: needingAttention.length,
      recentActivity: timeline.slice(0, 8),
      recentConversations,
      healthCounts: {
        healthy: customers.filter(c => c.health === 'Healthy').length,
        needsAttention: customers.filter(c => c.health === 'Needs Attention').length,
        atRisk: customers.filter(c => c.health === 'At Risk').length
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to compute stats', details: err.message });
  }
});

// GET /api/stats/insights (Deep Insights aggregation for authenticated user)
router.get('/insights', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const customers = storageService.getCustomers(userId);
    const memories = storageService.getMemories(undefined, userId);
    const issues = storageService.getIssues(undefined, userId);
    const conversations = storageService.getConversations(undefined, userId);

    const openIssues = issues.filter(i => i.status === 'open');
    const resolvedIssues = issues.filter(i => i.status === 'resolved');

    const memoryCategoryCounts: Record<string, number> = {};
    for (const mem of memories) {
      memoryCategoryCounts[mem.category] = (memoryCategoryCounts[mem.category] || 0) + 1;
    }

    const customersNeedingAttention = customers.filter(c => c.health !== 'Healthy').map(c => {
      const custIssues = issues.filter(i => i.customerId === c.id && i.status === 'open');
      const custMems = memories.filter(m => m.customerId === c.id);
      return {
        id: c.id,
        name: c.name,
        company: c.company,
        health: c.health,
        healthReason: c.healthReason,
        openIssuesCount: custIssues.length,
        memoryCount: custMems.length
      };
    });

    res.json({
      totalCustomers: customers.length,
      openIssuesCount: openIssues.length,
      resolvedIssuesCount: resolvedIssues.length,
      customersNeedingAttention,
      openIssuesList: openIssues.slice(0, 10),
      memoryCategoryCounts,
      recentMemories: memories.slice(0, 8)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch insights', details: err.message });
  }
});

export default router;
