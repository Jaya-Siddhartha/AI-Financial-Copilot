// Canonical Category Definitions for FinCopilot (Shared SSOT)

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

// Categorization helper mapping recipient keywords to canonical categories
export const autoCategorizeRecipient = (recipientName = '') => {
  const name = recipientName.toLowerCase().trim();

  if (
    name.includes('grocery') ||
    name.includes('supermart') ||
    name.includes('fresh') ||
    name.includes('market') ||
    name.includes('blinkit') ||
    name.includes('zepto') ||
    name.includes('instamart') ||
    name.includes('dmart') ||
    name.includes('bigbasket')
  ) {
    return CATEGORIES.GROCERIES;
  }

  if (
    name.includes('restaurant') ||
    name.includes('cafe') ||
    name.includes('bistro') ||
    name.includes('food') ||
    name.includes('zomato') ||
    name.includes('swiggy') ||
    name.includes('coffee') ||
    name.includes('starbucks') ||
    name.includes('dining') ||
    name.includes('dhaba') ||
    name.includes('mcdonald') ||
    name.includes('kfc') ||
    name.includes('burger')
  ) {
    return CATEGORIES.FOOD;
  }

  if (
    name.includes('rent') ||
    name.includes('landlord') ||
    name.includes('housing') ||
    name.includes('society') ||
    name.includes('flat') ||
    name.includes('apartment') ||
    name.includes('pg ') ||
    name.includes('hostel')
  ) {
    return CATEGORIES.HOUSING;
  }

  if (
    name.includes('power') ||
    name.includes('electric') ||
    name.includes('broadband') ||
    name.includes('water') ||
    name.includes('wifi') ||
    name.includes('utility') ||
    name.includes('bill') ||
    name.includes('bescom') ||
    name.includes('tneb') ||
    name.includes('tatapower') ||
    name.includes('gas') ||
    name.includes('indane') ||
    name.includes('hp gas')
  ) {
    return CATEGORIES.UTILITIES;
  }

  if (
    name.includes('recharge') ||
    name.includes('jio') ||
    name.includes('airtel') ||
    name.includes('vi ') ||
    name.includes('vodafone') ||
    name.includes('bsnl')
  ) {
    return CATEGORIES.RECHARGE;
  }

  if (
    name.includes('uber') ||
    name.includes('ola') ||
    name.includes('metro') ||
    name.includes('cab') ||
    name.includes('fuel') ||
    name.includes('petrol') ||
    name.includes('shell') ||
    name.includes('auto') ||
    name.includes('rapido') ||
    name.includes('indian oil') ||
    name.includes('bharat petroleum')
  ) {
    return CATEGORIES.TRANSPORT;
  }

  if (
    name.includes('amazon') ||
    name.includes('flipkart') ||
    name.includes('croma') ||
    name.includes('myntra') ||
    name.includes('store') ||
    name.includes('electronics') ||
    name.includes('shopping') ||
    name.includes('mall') ||
    name.includes('zara') ||
    name.includes('h&m') ||
    name.includes('clothing')
  ) {
    return CATEGORIES.SHOPPING;
  }

  if (
    name.includes('loan') ||
    name.includes('emi') ||
    name.includes('finance') ||
    name.includes('bank installment') ||
    name.includes('bajaj') ||
    name.includes('hdfc bank loan') ||
    name.includes('icici bank loan')
  ) {
    return CATEGORIES.EMI;
  }

  if (
    name.includes('salary') ||
    name.includes('payroll') ||
    name.includes('bonus') ||
    name.includes('freelance') ||
    name.includes('consulting') ||
    name.includes('dividend') ||
    name.includes('stipend')
  ) {
    return CATEGORIES.SALARY;
  }

  if (
    name.includes('hospital') ||
    name.includes('pharmacy') ||
    name.includes('apollo') ||
    name.includes('medplus') ||
    name.includes('1mg') ||
    name.includes('doctor') ||
    name.includes('clinic') ||
    name.includes('health')
  ) {
    return CATEGORIES.HEALTH;
  }

  if (
    name.includes('netflix') ||
    name.includes('prime') ||
    name.includes('hotstar') ||
    name.includes('spotify') ||
    name.includes('cinema') ||
    name.includes('pvr') ||
    name.includes('inox') ||
    name.includes('movie')
  ) {
    return CATEGORIES.ENTERTAINMENT;
  }

  // Default for person-to-person transfers
  return CATEGORIES.OTHER;
};
