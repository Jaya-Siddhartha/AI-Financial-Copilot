import express from 'express';
import {
  getAllAccounts,
  getCurrentAccount,
  getDashboardData,
  checkBankBalance,
  updateUpiPin,
  verifyUpiPin,
  resetAccount,
} from '../controllers/accountController.js';

const router = express.Router();

router.get('/all', getAllAccounts);
router.get('/current', getCurrentAccount);
router.get('/dashboard', getDashboardData);
router.post('/check-balance', checkBankBalance);
router.post('/verify-pin', verifyUpiPin);
router.post('/update-pin', updateUpiPin);
router.post('/reset', resetAccount);

export default router;
