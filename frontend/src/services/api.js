import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchAllAccounts = async () => {
  const response = await api.get('/account/all');
  return response.data;
};

export const fetchDashboardData = async (userId) => {
  const response = await api.get('/account/dashboard', {
    params: userId ? { userId } : {},
  });
  return response.data;
};

export const fetchCurrentAccount = async (userId) => {
  const response = await api.get('/account/current', {
    params: userId ? { userId } : {},
  });
  return response.data;
};

export const resetUserAccount = async () => {
  const response = await api.post('/account/reset');
  return response.data;
};

export const checkBankBalanceApi = async ({ userId, upiPin }) => {
  const response = await api.post('/account/check-balance', { userId, upiPin });
  return response.data;
};

export const updateUpiPinApi = async ({ userId, oldPin, newPin }) => {
  const response = await api.post('/account/update-pin', { userId, oldPin, newPin });
  return response.data;
};

export const fetchTransactions = async (params = {}) => {
  const response = await api.get('/transactions', { params });
  return response.data;
};

export const makePaymentApi = async (payload) => {
  const response = await api.post('/transactions/payment', payload);
  return response.data;
};

export const receiveMoneyApi = async (payload) => {
  const response = await api.post('/transactions/receive', payload);
  return response.data;
};

export const fetchEMIsApi = async (userId) => {
  const response = await api.get('/emi', {
    params: userId ? { userId } : {},
  });
  return response.data;
};

export const createEMIApi = async (payload) => {
  const response = await api.post('/emi', payload);
  return response.data;
};

export const payEMIApi = async (emiId, userId) => {
  const response = await api.post(`/emi/${emiId}/pay`, { userId });
  return response.data;
};

export const deleteEMIApi = async (emiId) => {
  const response = await api.delete(`/emi/${emiId}`);
  return response.data;
};

export default api;
