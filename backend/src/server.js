import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import accountRoutes from './routes/accountRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import emiRoutes from './routes/emiRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

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
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

import { dataService } from './services/dataService.js';
import { seedDualDemoAccounts } from './services/seedService.js';

// Connect to Database and start server
const startServer = async () => {
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

startServer();

export default app;
