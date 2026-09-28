// Spending categories and the keyword rules that sort a transaction into one.

export const CATEGORIES = {
  EMI: 'EMI & Loans',
  RENT: 'Rent & Housing',
  FOOD: 'Food & Dining',
  GROCERIES: 'Groceries',
  TRANSPORT: 'Transport & Fuel',
  BILLS: 'Bills & Utilities',
  RECHARGE: 'Mobile & Internet',
  SHOPPING: 'Shopping',
  HEALTH: 'Health',
  ENTERTAINMENT: 'Entertainment',
  EDUCATION: 'Education',
  INVESTMENT: 'Savings & Investments',
  CASH: 'Cash withdrawal',
  TRANSFER: 'Sent to people',
  INCOME: 'Salary & Income',
  REFUND: 'Refunds & Cashback',
  RECEIVED: 'Received from people',
  OTHER: 'Other',
};

export const CATEGORY_LIST = Object.values(CATEGORIES);
export const DEBIT_CATEGORIES = CATEGORY_LIST.filter((c) => ![CATEGORIES.INCOME, CATEGORIES.REFUND, CATEGORIES.RECEIVED].includes(c));
export const CREDIT_CATEGORIES = [CATEGORIES.INCOME, CATEGORIES.REFUND, CATEGORIES.RECEIVED, CATEGORIES.OTHER];

// Commitments that are not "everyday spending": they are planned for separately.
export const FIXED_CATEGORIES = [CATEGORIES.EMI, CATEGORIES.RENT, CATEGORIES.INVESTMENT];

const RULES = [
  [CATEGORIES.EMI, ['emi', 'loan', 'bajaj fin', 'nach', 'ecs', 'installment', 'instalment', 'home credit', 'tvs credit', 'hdb fin', 'kreditbee', 'moneyview', 'navi']],
  [CATEGORIES.RENT, ['rent', 'landlord', 'society', 'maintenance', 'nobroker', 'housing', 'pg ', 'hostel']],
  [CATEGORIES.INVESTMENT, ['sip', 'mutual fund', 'zerodha', 'groww', 'upstox', 'kuvera', 'ppf', 'nps', 'recurring deposit', ' rd ', 'fixed deposit', 'lic ', 'insurance', 'policy']],
  [CATEGORIES.GROCERIES, ['grocery', 'grocer', 'supermart', 'supermarket', 'kirana', 'blinkit', 'zepto', 'instamart', 'dmart', 'd-mart', 'bigbasket', 'jiomart', 'reliance fresh', 'more retail', 'vegetable', 'milk', 'dairy']],
  [CATEGORIES.FOOD, ['swiggy', 'zomato', 'restaurant', 'cafe', 'coffee', 'starbucks', 'dominos', "domino's", 'pizza', 'kfc', 'mcdonald', 'burger', 'dhaba', 'hotel', 'bakery', 'food', 'eatery', 'biryani', 'chai', 'tea']],
  [CATEGORIES.TRANSPORT, ['uber', 'ola', 'rapido', 'metro', 'irctc', 'railway', 'redbus', 'fuel', 'petrol', 'diesel', 'hpcl', 'bpcl', 'iocl', 'indian oil', 'bharat petroleum', 'shell', 'fastag', 'parking', 'cab', 'auto ', 'makemytrip', 'indigo', 'air india', 'goibibo']],
  [CATEGORIES.RECHARGE, ['recharge', 'jio', 'airtel', 'vodafone', ' vi ', 'bsnl', 'broadband', 'fiber', 'act fibernet', 'hathway', 'dth', 'tata play', 'dish tv']],
  [CATEGORIES.BILLS, ['electricity', 'bescom', 'tneb', 'msedcl', 'tata power', 'adani', 'water bill', 'gas', 'indane', 'hp gas', 'bharat gas', 'bill', 'utility', 'municipal', 'property tax']],
  [CATEGORIES.HEALTH, ['hospital', 'clinic', 'pharmacy', 'medical', 'apollo', 'medplus', '1mg', 'netmeds', 'pharmeasy', 'doctor', 'diagnostic', 'lab ', 'health', 'dental']],
  [CATEGORIES.ENTERTAINMENT, ['netflix', 'prime video', 'hotstar', 'spotify', 'youtube', 'bookmyshow', 'pvr', 'inox', 'cinema', 'movie', 'gaming', 'steam', 'playstation']],
  [CATEGORIES.EDUCATION, ['school', 'college', 'tuition', 'fees', 'udemy', 'coursera', 'byju', 'unacademy', 'books', 'exam']],
  [CATEGORIES.SHOPPING, ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'croma', 'reliance digital', 'mall', 'store', 'shop', 'mart', 'fashion', 'clothing', 'decathlon', 'ikea', 'lenskart', 'tata cliq']],
  [CATEGORIES.CASH, ['atm', 'cash withdrawal', 'cash wdl', 'nfs', 'cwdr']],
];

const CREDIT_RULES = [
  [CATEGORIES.INCOME, ['salary', 'payroll', 'sal ', 'stipend', 'bonus', 'freelance', 'consulting', 'dividend', 'interest', 'int.pd', 'int pd']],
  [CATEGORIES.REFUND, ['refund', 'cashback', 'reversal', 'reversed', 'return', 'rewards']],
];

// Short keywords ("emi", "sip", "atm") must match whole words, so "academic" is not an EMI.
const matcher = (word) => {
  const w = word.trim();
  if (w.length > 4) return (text) => text.includes(w);
  // Short keywords are plain letters, digits and dots, so only the dot needs escaping.
  const re = new RegExp(`(^|[^a-z0-9])${w.replaceAll('.', '[.]')}([^a-z0-9]|$)`);
  return (text) => re.test(text);
};
const cache = new Map();
const includesAny = (text, words) =>
  words.some((w) => {
    if (!cache.has(w)) cache.set(w, matcher(w));
    return cache.get(w)(text);
  });

// Picks a category from the description. Person-to-person UPI payments fall back to "Sent to
// people" / "Received from people".
export const categorize = (description = '', type = 'debit') => {
  const text = ` ${String(description).toLowerCase()} `;
  if (type === 'credit') {
    for (const [category, words] of CREDIT_RULES) if (includesAny(text, words)) return category;
    return /received from|from\s+[a-z]/.test(text) || text.includes('upi') ? CATEGORIES.RECEIVED : CATEGORIES.OTHER;
  }
  for (const [category, words] of RULES) if (includesAny(text, words)) return category;
  if (/paid to|sent to|transfer to|upi|imps|neft/.test(text)) return CATEGORIES.TRANSFER;
  return CATEGORIES.OTHER;
};

export const isFixed = (category) => FIXED_CATEGORIES.includes(category);
