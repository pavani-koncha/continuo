import { Router, Request, Response } from 'express';
import { storageService } from '../services/storageService.js';

const router = Router();

// GET issues
router.get('/', (req: Request, res: Response) => {
  try {
    const customerId = req.query.customerId as string | undefined;
    const issues = storageService.getIssues(customerId);
    res.json(issues);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch issues', details: err.message });
  }
});

// CREATE issue
router.post('/', (req: Request, res: Response) => {
  try {
    const { customerId, title, description, severity } = req.body;
    if (!customerId || !title) {
      return res.status(400).json({ error: 'customerId and title are required' });
    }

    const issue = storageService.addIssue({
      id: crypto.randomUUID(),
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
router.patch('/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const updated = storageService.updateIssue(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Issue not found' });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update issue', details: err.message });
  }
});

export default router;
