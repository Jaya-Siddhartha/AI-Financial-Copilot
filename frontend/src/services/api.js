import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

const data = (promise) => promise.then((res) => res.data);

export const fetchAllAccounts = () => data(api.get('/account/all'));

export const fetchDashboardData = (userId) => data(api.get('/account/dashboard', { params: { userId } }));

export const resetDemo = () => data(api.post('/account/reset'));

export const checkBankBalanceApi = ({ userId, upiPin }) => data(api.post('/account/check-balance', { userId, upiPin }));

export const updateUpiPinApi = ({ userId, oldPin, newPin }) =>
  data(api.post('/account/update-pin', { userId, oldPin, newPin }));

export const fetchTransactions = (params) => data(api.get('/transactions', { params }));

export const makePaymentApi = (payload) => data(api.post('/transactions/payment', payload));

export const receiveMoneyApi = (payload) => data(api.post('/transactions/receive', payload));

export const createEMIApi = (payload) => data(api.post('/emi', payload));

export const payEMIApi = (emiId, userId) => data(api.post(`/emi/${emiId}/pay`, { userId }));

export const deleteEMIApi = (emiId, userId) => data(api.delete(`/emi/${emiId}`, { params: { userId } }));

export const updateTransactionCategoryApi = (txId, category) =>
  data(api.patch(`/transactions/${txId}/category`, { category }));
