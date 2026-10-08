import { Router, Response } from 'express';
import { storageService } from '../services/storageService.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// GET timeline events for authenticated user
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.query.customerId as string | undefined;
    const timeline = storageService.getTimeline(customerId, req.user?.id);
    res.json(timeline);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch timeline', details: err.message });
  }
});

export default router;
