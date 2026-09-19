import express from 'express';
import {
  getTransactions,
  makePayment,
  receiveMoney,
  updateCategory,
} from '../controllers/transactionController.js';

const router = express.Router();

router.get('/', getTransactions);
router.post('/payment', makePayment);
router.post('/receive', receiveMoney);
router.patch('/:id/category', updateCategory);

export default router;
