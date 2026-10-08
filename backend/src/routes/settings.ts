import { Router, Request, Response } from 'express';
import { hindsightService } from '../services/hindsightService.js';
import { groqService } from '../services/groqService.js';

const router = Router();

// GET /api/settings/status
router.get('/status', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    groq: {
      configured: groqService.isConfigured(),
      model: 'llama-3.3-70b-versatile',
      status: groqService.isConfigured() ? 'Connected' : 'Unset (Running intelligent fallback engine)'
    },
    hindsight: {
      configured: hindsightService.isConfigured(),
      endpoint: process.env.HINDSIGHT_API_URL || 'https://api.hindsight.vectorize.io',
      status: hindsightService.isConfigured() ? 'Connected' : 'Unset (Running persistent isolated local layer)'
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

export default router;
