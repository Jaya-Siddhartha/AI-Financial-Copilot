import express from 'express';
import { getEMIs, createEMI, payEMI, deleteEMI } from '../controllers/emiController.js';

const router = express.Router();

router.get('/', getEMIs);
router.post('/', createEMI);
router.post('/:id/pay', payEMI);
router.delete('/:id', deleteEMI);

export default router;
