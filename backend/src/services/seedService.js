import { dataService } from './dataService.js';
import { buildDemoSeed } from './seedData.js';

// Replaces all data with the two demo accounts (Siddhartha and Rahul).
export const seedDualDemoAccounts = async () => {
  await dataService.resetAll();
  const seed = buildDemoSeed();
  const result = {};

  for (const [i, userDoc] of seed.users.entries()) {
    const user = await dataService.upsertUser(userDoc);
    const account = await dataService.upsertAccount(user.id, seed.accounts[i]);
    await dataService.seedTransactions(user, account, seed.transactions[userDoc.id]);
    await dataService.createEMI(seed.emis[i]);
    Object.assign(result, i === 0 ? { userA: user, accountA: account } : { userB: user, accountB: account });
  }

  return result;
};
