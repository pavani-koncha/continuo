import { Router, Response } from 'express';
import { storageService } from '../services/storageService.js';
import { Customer, CustomerPriority, FollowUpTask } from '../types.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Protect all customer routes with authentication
router.use(requireAuth);

// GET all customers for authenticated user
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const customers = storageService.getCustomers(req.user?.id);
    res.json(customers);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch customers', details: err.message });
  }
});

// GET single customer for authenticated user
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const customer = storageService.getCustomer(id, req.user?.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch customer', details: err.message });
  }
});

// CREATE new customer for authenticated user
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, company, email, product, initialNotes, tags, priority } = req.body;

    if (!name || !company || !email) {
      return res.status(400).json({ error: 'Name, company, and email are required.' });
    }

    const newCustomer: Customer = {
      id: crypto.randomUUID(),
      userId: req.user?.id,
      name: name.trim(),
      company: company.trim(),
      email: email.trim(),
      product: (product || 'General Support').trim(),
      initialNotes: (initialNotes || '').trim(),
      tags: Array.isArray(tags) ? tags : typeof tags === 'string' && tags ? tags.split(',').map((t: string) => t.trim()) : [],
      health: 'Healthy',
      healthReason: 'Initial onboarding complete, active engagement',
      priority: (priority as CustomerPriority) || 'Medium',
      summary: `${name} from ${company} (${product || 'General Product'}). Initial profile created.`,
      conversationSummary: '',
      followUpTasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = storageService.addCustomer(newCustomer);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create customer', details: err.message });
  }
});

// UPDATE customer for authenticated user
router.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const updated = storageService.updateCustomer(id, req.body, req.user?.id);
    if (!updated) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update customer', details: err.message });
  }
});

// ADD follow-up task to customer
router.post('/:id/tasks', (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const customer = storageService.getCustomer(id, req.user?.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const { title, priority = 'medium', dueDate } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const newTask: FollowUpTask = {
      id: crypto.randomUUID(),
      userId: req.user?.id,
      customerId: id,
      title: title.trim(),
      dueDate: dueDate || 'Today',
      status: 'pending',
      priority: priority || 'medium',
      createdAt: new Date().toISOString()
    };

    const currentTasks = Array.isArray(customer.followUpTasks) ? customer.followUpTasks : [];
    const updated = storageService.updateCustomer(id, {
      followUpTasks: [newTask, ...currentTasks]
    }, req.user?.id);

    res.status(201).json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to add follow-up task', details: err.message });
  }
});

// TOGGLE follow-up task status
router.patch('/:id/tasks/:taskId', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, taskId } = req.params;
    const customer = storageService.getCustomer(id as string, req.user?.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const currentTasks = Array.isArray(customer.followUpTasks) ? customer.followUpTasks : [];
    const taskIdx = currentTasks.findIndex(t => t.id === taskId);
    if (taskIdx === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updatedTasks = [...currentTasks];
    updatedTasks[taskIdx] = {
      ...updatedTasks[taskIdx],
      ...req.body
    };

    const updated = storageService.updateCustomer(id as string, {
      followUpTasks: updatedTasks
    }, req.user?.id);

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update follow-up task', details: err.message });
  }
});

// DELETE customer for authenticated user
router.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const success = storageService.deleteCustomer(id, req.user?.id);
    if (!success) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ message: 'Customer deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete customer', details: err.message });
  }
});

export default router;
