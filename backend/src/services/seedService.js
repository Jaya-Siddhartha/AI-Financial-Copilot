import { dataService } from './dataService.js';
import { DEMO_USERS } from '../config/store.js';
import { CATEGORIES } from '../config/categories.js';

export const seedDualDemoAccounts = async () => {
  await dataService.resetAll();

  const now = new Date();
  const makeDate = (dayOffsetAgo, hour = 14, min = 30) => {
    const d = new Date(now.getTime() - dayOffsetAgo * 24 * 60 * 60 * 1000);
    d.setHours(hour, min, 0, 0);
    return d.toISOString();
  };

  // ==========================================
  // 1. SEED ACCOUNT A: SIDDHARTHA
  // ==========================================
  const userA = await dataService.upsertUser({
    id: DEMO_USERS.SIDDHARTHA.id,
    _id: DEMO_USERS.SIDDHARTHA.id,
    name: DEMO_USERS.SIDDHARTHA.name,
    fullName: DEMO_USERS.SIDDHARTHA.fullName,
    mobile: DEMO_USERS.SIDDHARTHA.mobile,
    phoneOnly: DEMO_USERS.SIDDHARTHA.phoneOnly,
    upiId: DEMO_USERS.SIDDHARTHA.upiId,
    upiPin: '1234',
    monthlyIncome: 50000,
    salaryDate: 1,
    currency: '₹',
  });

  const accountA = await dataService.upsertAccount(userA.id, {
    id: 'account_siddhartha',
    _id: 'account_siddhartha',
    userId: userA.id,
    accountHolder: userA.name,
    bankName: 'HDFC Bank (Simulated UPI)',
    accountNumberMasked: '•••• 4092',
    startingBalance: 50000,
    currentBalance: 50000,
    verifiedBalance: 50000,
    lastBalanceCheckDate: makeDate(1, 10, 30),
    totalCredited: 50000,
    totalDebited: 18000,
    currency: '₹',
  });

  const txsA = [
    {
      title: 'Salary Credited',
      merchant: 'TechCorp Global Payroll',
      category: CATEGORIES.SALARY,
      type: 'credit',
      amount: 50000,
      date: makeDate(8, 9, 0),
      description: 'Monthly salary credited via NEFT',
      status: 'completed',
      paymentMethod: 'Direct Bank Transfer',
    },
    {
      title: 'Apartment Monthly Rent',
      merchant: 'Amit Kumar (Landlord)',
      category: CATEGORIES.HOUSING,
      type: 'debit',
      amount: 10000,
      date: makeDate(7, 10, 30),
      description: 'Paid via UPI',
      status: 'completed',
      paymentMethod: 'UPI',
    },
    {
      title: 'Fresh Market Groceries',
      merchant: 'Fresh Harvest Supermart',
      category: CATEGORIES.GROCERIES,
      type: 'debit',
      amount: 2000,
      date: makeDate(5, 18, 15),
      description: 'Paid via UPI',
      status: 'completed',
      paymentMethod: 'UPI',
    },
    {
      title: 'Metro & Cab Transport',
      merchant: 'Uber Rides India',
      category: CATEGORIES.TRANSPORT,
      type: 'debit',
      amount: 1000,
      date: makeDate(3, 8, 45),
      description: 'Paid via UPI',
      status: 'completed',
      paymentMethod: 'UPI',
    },
    {
      title: 'Paid to Rahul Sharma',
      merchant: 'Rahul Sharma',
      category: CATEGORIES.OTHER,
      type: 'debit',
      amount: 3000,
      date: makeDate(2, 20, 10),
      description: 'Paid via UPI',
      status: 'completed',
      paymentMethod: 'UPI',
    },
    {
      title: 'Weekend Dining',
      merchant: 'The Olive Bistro & Cafe',
      category: CATEGORIES.FOOD,
      type: 'debit',
      amount: 800,
      date: makeDate(1, 19, 30),
      description: 'Paid via UPI',
      status: 'completed',
      paymentMethod: 'UPI',
    },
    {
      title: 'Airtel Broadband Bill',
      merchant: 'Airtel Fiber Broadband',
      category: CATEGORIES.UTILITIES,
      type: 'debit',
      amount: 1200,
      date: makeDate(1, 8, 0),
      description: 'Paid via UPI',
      status: 'completed',
      paymentMethod: 'UPI',
    },
  ];

  await dataService.seedTransactions(userA, accountA, txsA);

  const emiDueDateA = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();
  await dataService.createEMI({
    id: 'emi_siddhartha_1',
    _id: 'emi_siddhartha_1',
    userId: userA.id,
    accountId: accountA.id,
    name: 'Personal Loan',
    lender: 'ABC Finance',
    amount: 20000,
    dueDay: ((now.getDate() + 10 - 1) % 28) + 1,
    dueDate: emiDueDateA,
    frequency: 'Monthly',
    totalLoanAmount: 240000,
    remainingInstallments: 12,
    status: 'upcoming',
  });

  // ==========================================
  // 2. SEED ACCOUNT B: RAHUL
  // ==========================================
  const userB = await dataService.upsertUser({
    id: DEMO_USERS.RAHUL.id,
    _id: DEMO_USERS.RAHUL.id,
    name: DEMO_USERS.RAHUL.name,
    fullName: DEMO_USERS.RAHUL.fullName,
    mobile: DEMO_USERS.RAHUL.mobile,
    phoneOnly: DEMO_USERS.RAHUL.phoneOnly,
    upiId: DEMO_USERS.RAHUL.upiId,
    upiPin: '1234',
    monthlyIncome: 30000,
    salaryDate: 5,
    currency: '₹',
  });

  const accountB = await dataService.upsertAccount(userB.id, {
    id: 'account_rahul',
    _id: 'account_rahul',
    userId: userB.id,
    accountHolder: userB.name,
    bankName: 'ICICI Bank (Simulated UPI)',
    accountNumberMasked: '•••• 8831',
    startingBalance: 30000,
    currentBalance: 30000,
    verifiedBalance: 30000,
    lastBalanceCheckDate: makeDate(1, 11, 45),
    totalCredited: 30000,
    totalDebited: 3000,
    currency: '₹',
  });

  const txsB = [
    {
      title: 'Freelance Project Payout',
      merchant: 'Acme Digital Labs',
      category: CATEGORIES.SALARY,
      type: 'credit',
      amount: 20000,
      date: makeDate(6, 12, 0),
      description: 'Client payment received via UPI',
      status: 'completed',
      paymentMethod: 'UPI',
    },
    {
      title: 'Received from Siddhartha',
      merchant: 'Siddhartha Mukherjee',
      category: CATEGORIES.OTHER,
      type: 'credit',
      amount: 3000,
      date: makeDate(2, 20, 10),
      description: 'Received via UPI',
      status: 'completed',
      paymentMethod: 'UPI',
    },
    {
      title: 'Jio 5G Mobile Recharge',
      merchant: 'Reliance Jio Prepaid',
      category: CATEGORIES.RECHARGE,
      type: 'debit',
      amount: 499,
      date: makeDate(3, 14, 20),
      description: 'Paid via UPI',
      status: 'completed',
      paymentMethod: 'UPI',
    },
    {
      title: 'Swiggy Food Delivery',
      merchant: 'Swiggy Online Food',
      category: CATEGORIES.FOOD,
      type: 'debit',
      amount: 650,
      date: makeDate(2, 21, 0),
      description: 'Paid via UPI',
      status: 'completed',
      paymentMethod: 'UPI',
    },
    {
      title: 'Delhi Metro Card Recharge',
      merchant: 'DMRC Transit Card',
      category: CATEGORIES.TRANSPORT,
      type: 'debit',
      amount: 500,
      date: makeDate(1, 9, 30),
      description: 'Paid via UPI',
      status: 'completed',
      paymentMethod: 'UPI',
    },
  ];

  await dataService.seedTransactions(userB, accountB, txsB);

  const emiDueDateB = new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString();
  await dataService.createEMI({
    id: 'emi_rahul_1',
    _id: 'emi_rahul_1',
    userId: userB.id,
    accountId: accountB.id,
    name: 'Two-Wheeler Loan',
    lender: 'Bajaj Auto Finance',
    amount: 4000,
    dueDay: ((now.getDate() + 12 - 1) % 28) + 1,
    dueDate: emiDueDateB,
    frequency: 'Monthly',
    totalLoanAmount: 48000,
    remainingInstallments: 12,
    status: 'upcoming',
  });

  return { userA, accountA, userB, accountB };
};
