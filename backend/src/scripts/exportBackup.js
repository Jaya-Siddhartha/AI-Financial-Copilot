// Administrative Data Export & Backup Utility for FinCopilot
// Usage: node backend/src/scripts/exportBackup.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectDB, closeDB } from '../config/db.js';
import { dataService } from '../services/dataService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUP_DIR = path.join(__dirname, '../../backups');

export const generateBackupArchive = async () => {
  console.log('[Backup Engine] Initializing database export...');

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  try {
    await connectDB();

    const users = await dataService.getAllUsers();
    const accounts = await dataService.getAllAccounts();
    const transactions = await dataService.getTransactions({}, 10000);
    const emis = [];

    for (const u of users) {
      const uId = u.id || u._id;
      const userEmis = await dataService.getEMIs(uId);
      emis.push(...userEmis);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupData = {
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        system: 'FinCopilot Backup System',
        counts: {
          users: users.length,
          accounts: accounts.length,
          transactions: transactions.length,
          emis: emis.length,
        },
      },
      data: {
        users,
        accounts,
        transactions,
        emis,
      },
    };

    const fileName = `fincopilot_backup_${timestamp}.json`;
    const filePath = path.join(BACKUP_DIR, fileName);

    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');

    console.log(`[Backup Engine] ✅ Backup successfully written to ${filePath}`);
    console.log(`[Backup Engine] Records exported: ${users.length} users, ${accounts.length} accounts, ${transactions.length} transactions, ${emis.length} EMIs.`);

    return {
      success: true,
      filePath,
      fileName,
      counts: backupData.meta.counts,
    };
  } catch (err) {
    console.error('[Backup Engine] ❌ Backup failed:', err.message);
    throw err;
  } finally {
    await closeDB();
  }
};

// If run directly via CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateBackupArchive()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
