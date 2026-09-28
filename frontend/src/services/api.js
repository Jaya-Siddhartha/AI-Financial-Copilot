import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// 'server' (the Express API) or 'browser' (the same API answered inside this page).
let mode = null;

const useBrowserApi = () => {
  api.defaults.baseURL = '/';
  api.defaults.adapter = (config) => import('./browserApi.js').then((m) => m.browserAdapter(config));
  mode = 'browser';
};

// The standalone demo build always answers API calls inside the page. A normal build asks the
// server first: on a host without lasting storage (Vercel without a database), every serverless
// copy keeps its own data, so balances would lag, jump or miss the other account's payments.
// There the in-page API is used instead, which is instant and consistent on this device.
const ready = __BROWSER_DEMO__
  ? Promise.resolve(useBrowserApi())
  : api
      .get('/health', { timeout: 8000 })
      .then((res) => {
        if (res.data?.storage === 'temporary') useBrowserApi();
        else mode = 'server';
      })
      .catch(() => {
        mode = 'server';
      });

export const dataMode = () => mode;
export const whenReady = () => ready;

const call = (request) => ready.then(request).then((res) => res.data);

export const fetchAllAccounts = () => call(() => api.get('/account/all'));

export const fetchDashboardData = (userId) => call(() => api.get('/account/dashboard', { params: { userId } }));

export const resetDemo = () => call(() => api.post('/account/reset'));

export const checkBankBalanceApi = ({ userId, upiPin }) => call(() => api.post('/account/check-balance', { userId, upiPin }));

export const verifyUpiPinApi = ({ userId, upiPin }) => call(() => api.post('/account/verify-pin', { userId, upiPin }));

export const updateUpiPinApi = ({ userId, oldPin, newPin }) =>
  call(() => api.post('/account/update-pin', { userId, oldPin, newPin }));

export const fetchTransactions = (params) => call(() => api.get('/transactions', { params }));

export const makePaymentApi = (payload) => call(() => api.post('/transactions/payment', payload));

export const receiveMoneyApi = (payload) => call(() => api.post('/transactions/receive', payload));

export const createEMIApi = (payload) => call(() => api.post('/emi', payload));

export const payEMIApi = (emiId, userId, upiPin) => call(() => api.post(`/emi/${emiId}/pay`, { userId, upiPin }));

export const deleteEMIApi = (emiId, userId) => call(() => api.delete(`/emi/${emiId}`, { params: { userId } }));

export const updateTransactionCategoryApi = (txId, category, userId) =>
  call(() => api.patch(`/transactions/${txId}/category`, { category, userId }));
