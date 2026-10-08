import { Router, Request, Response } from 'express';
import { storageService } from '../services/storageService.js';
import { hindsightService } from '../services/hindsightService.js';

const router = Router();

// GET memories (optionally filtered by customerId and category)
router.get('/', (req: Request, res: Response) => {
  try {
    const customerId = req.query.customerId as string | undefined;
    const category = req.query.category as string | undefined;

    let memories = storageService.getMemories(customerId);

    if (category && category !== 'All') {
      memories = memories.filter(m => m.category.toLowerCase() === category.toLowerCase());
    }

    res.json(memories);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch memories', details: err.message });
  }
});

// Manual memory creation
router.post('/', async (req: Request, res: Response) => {
  try {
    const { customerId, content, category, source } = req.body;
    if (!customerId || !content || !category) {
      return res.status(400).json({ error: 'customerId, content, and category are required' });
    }

    const memory = await hindsightService.storeMemory({
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
