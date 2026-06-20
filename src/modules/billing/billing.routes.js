import { Router } from 'express';
import { create, list, getOne, recordPayment, dashboardStats } from './billing.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { tenantContext } from '../../middleware/tenantContext.js';

const router = Router();
router.use(authenticate, tenantContext);

router.get('/stats', dashboardStats);
router.get('/', list);
router.post('/', create);
router.get('/:id', getOne);
router.post('/:id/payments', recordPayment);

export default router;
