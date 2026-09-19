// Canonical Category Definitions for FinCopilot (Frontend)

export const CATEGORIES = {
  EMI: 'EMI & Loans',
  HOUSING: 'Housing & Rent',
  FOOD: 'Food & Dining',
  GROCERIES: 'Groceries & Food',
  TRANSPORT: 'Transport & Fuel',
  UTILITIES: 'Utilities & Bills',
  RECHARGE: 'Mobile & Recharge',
  SHOPPING: 'Shopping & Lifestyle',
  SALARY: 'Salary & Inflow',
  HEALTH: 'Healthcare & Wellness',
  ENTERTAINMENT: 'Entertainment & Leisure',
  OTHER: 'Daily Expenses',
};

export const CATEGORY_LIST = Object.values(CATEGORIES);
export const CANONICAL_CATEGORIES = CATEGORY_LIST;

export const FIXED_EXPENSE_CATEGORIES = [
  CATEGORIES.EMI,
  CATEGORIES.HOUSING,
  'Housing',
  'Housing & Rent',
  'EMI',
];

export const isFixedExpense = (category = '') => {
  return FIXED_EXPENSE_CATEGORIES.some(
    (fc) => fc.toLowerCase() === category.toLowerCase() || category.toLowerCase().includes('housing') || category.toLowerCase().includes('emi')
  );
};
