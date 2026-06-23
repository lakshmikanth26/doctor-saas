import { Router } from 'express';
import { create, list, lookup, getOne, update, timeline } from './patients.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { tenantContext } from '../../middleware/tenantContext.js';

const router = Router();
router.use(authenticate, tenantContext);

router.get('/lookup', lookup);
router.get('/', list);
router.post('/', create);
router.get('/:id', getOne);
router.put('/:id', update);
router.get('/:id/timeline', timeline);

export default router;
