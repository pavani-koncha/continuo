import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

import customersRouter from './routes/customers.js';
import conversationsRouter from './routes/conversations.js';
import memoriesRouter from './routes/memories.js';
import issuesRouter from './routes/issues.js';
import timelineRouter from './routes/timeline.js';
import askRouter from './routes/ask.js';
import statsRouter from './routes/stats.js';
import settingsRouter from './routes/settings.js';

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    // Allow development and configured frontend URLs
    if (origin === FRONTEND_URL || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive for hackathon demos & preview URLs
  },
  credentials: true
}));

app.use(express.json());

// Request logging in development
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api/customers', customersRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/memories', memoriesRouter);
app.use('/api/issues', issuesRouter);
app.use('/api/timeline', timelineRouter);
app.use('/api/ask', askRouter);
app.use('/api/stats', statsRouter);
app.use('/api/settings', settingsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Continuo API Backend',
    timestamp: new Date().toISOString()
  });
});

// Root welcome endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Continuo API',
    tagline: 'The AI Support Agent That Remembers.',
    status: 'operational',
    docs: '/api/settings/status'
  });
});

// Central error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal server error occurred',
    message: err.message || 'Unknown error'
  });
});

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` CONTINUO Backend API Running`);
  console.log(` Port: ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Hindsight URL: ${process.env.HINDSIGHT_API_URL || 'https://api.hindsight.vectorize.io'}`);
  console.log(`=========================================`);
});
