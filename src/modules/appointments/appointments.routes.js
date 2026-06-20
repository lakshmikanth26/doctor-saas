import { Router } from 'express';
import { getSlots, create, list, updateStatus, liveQueue } from './appointments.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { tenantContext } from '../../middleware/tenantContext.js';

const router = Router();
router.use(authenticate, tenantContext);

router.get('/slots', getSlots);
router.get('/queue', liveQueue);
router.get('/', list);
router.post('/', create);
router.patch('/:id/status', updateStatus);

export default router;
