import app from '../backend/src/server.js';
import { connectDB } from '../backend/src/config/db.js';
import { dataService } from '../backend/src/services/dataService.js';
import { seedDualDemoAccounts } from '../backend/src/services/seedService.js';

let isInitialized = false;

export default async function handler(req, res) {
  if (!isInitialized) {
    try {
      await connectDB();
      const existingUsers = await dataService.getAllUsers();
      if (!existingUsers || existingUsers.length === 0) {
        await seedDualDemoAccounts();
      }
      isInitialized = true;
    } catch (e) {
      console.error('[Vercel Handler Init Error]:', e);
    }
  }
  return app(req, res);
}
