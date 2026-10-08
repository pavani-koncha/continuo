import { Router, Request, Response } from 'express';
import { storageService } from '../services/storageService.js';

const router = Router();

// GET timeline events
router.get('/', (req: Request, res: Response) => {
  try {
    const customerId = req.query.customerId as string | undefined;
    const timeline = storageService.getTimeline(customerId);
    res.json(timeline);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch timeline', details: err.message });
  }
});

export default router;
