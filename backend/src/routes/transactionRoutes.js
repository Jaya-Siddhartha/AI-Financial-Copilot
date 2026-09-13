import express from 'express';
import {
  getTransactions,
  makePayment,
  receiveMoney,
} from '../controllers/transactionController.js';

const router = express.Router();

router.get('/', getTransactions);
router.post('/payment', makePayment);
router.post('/receive', receiveMoney);

export default router;
