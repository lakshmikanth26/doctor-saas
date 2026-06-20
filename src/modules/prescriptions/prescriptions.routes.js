import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { tenantContext } from '../../middleware/tenantContext.js';
import { sendSuccess } from '../../utils/response.js';
import * as service from './prescriptions.service.js';

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', async (req, res, next) => {
  try {
    const { patientId, doctorId, page, limit } = req.query;
    return sendSuccess(res, await service.listPrescriptions(req.org.id, { patientId, doctorId, page: +page || 1, limit: +limit || 25 }));
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { visitId, items } = req.body;
    return sendSuccess(res, await service.createPrescription(req.org.id, visitId, req.user.id, items), 'Prescription created', 201);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try { return sendSuccess(res, await service.getPrescription(req.org.id, req.params.id)); } catch (e) { next(e); }
});

router.patch('/:id/status', async (req, res, next) => {
  try { return sendSuccess(res, await service.updateStatus(req.org.id, req.params.id, req.body.status)); } catch (e) { next(e); }
});

export default router;
