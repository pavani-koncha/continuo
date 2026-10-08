import { Router, Response } from 'express';
import { storageService } from '../services/storageService.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// GET issues for authenticated user
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.query.customerId as string | undefined;
    const issues = storageService.getIssues(customerId, req.user?.id);
    res.json(issues);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch issues', details: err.message });
  }
});

// CREATE issue for authenticated user
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { customerId, title, description, severity } = req.body;
    if (!customerId || !title) {
      return res.status(400).json({ error: 'customerId and title are required' });
    }

    const customer = storageService.getCustomer(customerId, req.user?.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const issue = storageService.addIssue({
      id: crypto.randomUUID(),
      userId: req.user?.id,
      customerId,
      title,
      description: description || '',
      severity: severity || 'medium',
      status: 'open',
      detectedAt: new Date().toISOString()
    });

    res.status(201).json(issue);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create issue', details: err.message });
  }
});

// UPDATE issue status (resolve / reopen)
router.patch('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const updated = storageService.updateIssue(id, req.body, req.user?.id);
    if (!updated) {
      return res.status(404).json({ error: 'Issue not found' });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update issue', details: err.message });
  }
});

export default router;
