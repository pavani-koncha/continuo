import { Router, Request, Response } from 'express';
import { storageService } from '../services/storageService.js';
import { Customer } from '../types.js';

const router = Router();

// GET all customers
router.get('/', (req: Request, res: Response) => {
  try {
    const customers = storageService.getCustomers();
    res.json(customers);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch customers', details: err.message });
  }
});

// GET single customer
router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const customer = storageService.getCustomer(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch customer', details: err.message });
  }
});

// CREATE new customer
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, company, email, product, initialNotes, tags } = req.body;

    if (!name || !company || !email) {
      return res.status(400).json({ error: 'Name, company, and email are required.' });
    }

    const newCustomer: Customer = {
      id: crypto.randomUUID(),
      name: name.trim(),
      company: company.trim(),
      email: email.trim(),
      product: (product || 'General Support').trim(),
      initialNotes: (initialNotes || '').trim(),
      tags: Array.isArray(tags) ? tags : typeof tags === 'string' && tags ? tags.split(',').map(t => t.trim()) : [],
      health: 'Healthy',
      healthReason: 'Initial onboarding complete, active engagement',
      summary: `${name} from ${company} (${product || 'General Product'}). Initial profile created.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = storageService.addCustomer(newCustomer);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create customer', details: err.message });
  }
});

// UPDATE customer
router.put('/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const updated = storageService.updateCustomer(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update customer', details: err.message });
  }
});

// DELETE customer
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const success = storageService.deleteCustomer(id);
    if (!success) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ message: 'Customer deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete customer', details: err.message });
  }
});

export default router;
