import { Router, Response } from 'express';
import { storageService } from '../services/storageService.js';
import { groqService } from '../services/groqService.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// POST /api/ask (strictly scoped to customer and authenticated user)
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { customerId, question } = req.body;

    if (!customerId || !question || !question.trim()) {
      return res.status(400).json({ error: 'customerId and question are required' });
    }

    const customer = storageService.getCustomer(customerId, req.user?.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const memories = storageService.getMemories(customerId, req.user?.id);
    const issues = storageService.getIssues(customerId, req.user?.id);

    const result = await groqService.askContinuo(
      customer,
      memories,
      issues,
      question.trim()
    );

    res.json({
      question: question.trim(),
      customer: {
        id: customer.id,
        name: customer.name,
        company: customer.company
      },
      answer: result.answer,
      citedMemories: result.citedMemories
    });
  } catch (err: any) {
    console.error('Error in Ask Continuo:', err);
    res.status(500).json({ error: 'Failed to process question', details: err.message });
  }
});

export default router;
