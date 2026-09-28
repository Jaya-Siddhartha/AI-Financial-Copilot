import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import accountRoutes from './routes/accountRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import emiRoutes from './routes/emiRoutes.js';
import { dataService } from './services/dataService.js';
import { seedDualDemoAccounts } from './services/seedService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.disable('x-powered-by');

// CORS_ORIGIN is a comma-separated allow-list (e.g. https://fincopilot.example.com). Without it,
// any origin is allowed, which suits local development and the same-origin Vercel setup.
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors(allowedOrigins.length ? { origin: allowedOrigins } : undefined));

// Basic security headers for an API that only returns JSON.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  next();
});
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.use(morgan('dev'));
}

// On serverless platforms startServer() never runs, so make sure the database connection
// (a no-op without MONGODB_URI) is attempted before the first API request is handled.
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
  } catch (err) {
    console.error('[Server] Database connection error:', err.message);
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'FinCopilot Backend API',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/account', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/emi', emiRoutes);

// Root fallback
app.get('/', (req, res) => {
  res.json({
    message: 'FinCopilot API is running.',
    healthEndpoint: '/api/health',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('[Server Error]', err);
  res.status(status).json({
    success: false,
    // Client errors (e.g. malformed JSON) are safe to describe; server errors are not.
    message: status < 500 ? err.message : 'Something went wrong on our side. Please try again.',
  });
});

// Connect to Database and start server
export const startServer = async () => {
  try {
    await connectDB();
    const existingUsers = await dataService.getAllUsers();
    if (!existingUsers || existingUsers.length === 0) {
      console.log('[Server] Auto-seeding initial dual demo accounts (Siddhartha & Rahul Sharma)...');
      await seedDualDemoAccounts();
    }
    app.listen(PORT, () => {
      console.log(`[Server] FinCopilot Backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[Server] Fatal startup error:', error);
    process.exit(1);
  }
};

// Start listening only when run directly (`node src/server.js`); serverless handlers and
// tests import the app without opening a port.
if (!process.env.VERCEL && process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}

export default app;
