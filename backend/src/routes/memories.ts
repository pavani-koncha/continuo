import { Router, Response } from 'express';
import { storageService } from '../services/storageService.js';
import { hindsightService } from '../services/hindsightService.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// GET memories (optionally filtered by customerId and category, strictly for authenticated user)
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.query.customerId as string | undefined;
    const category = req.query.category as string | undefined;

    let memories = storageService.getMemories(customerId, req.user?.id);

    if (category && category !== 'All') {
      memories = memories.filter(m => m.category.toLowerCase() === category.toLowerCase());
    }

    res.json(memories);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch memories', details: err.message });
  }
});

// Manual memory creation for authenticated user
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { customerId, content, category, source } = req.body;
    if (!customerId || !content || !category) {
      return res.status(400).json({ error: 'customerId, content, and category are required' });
    }

    const customer = storageService.getCustomer(customerId, req.user?.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const memory = await hindsightService.storeMemory({
      userId: req.user?.id,
      customerId,
      content,
      category,
      source: source || 'Manual Agent Note'
    });

    res.status(201).json(memory);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to add memory', details: err.message });
  }
});

export default router;
