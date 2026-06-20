import { Router } from 'express';
import * as service from './crm.service.js';
import { sendSuccess } from '../../utils/response.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireSystemRole } from '../../middleware/authenticate.js';

const router = Router();
router.use(authenticate, requireSystemRole('SYSTEM_ADMIN', 'SALES_REP', 'SALES_MANAGER'));

router.get('/stats', async (req, res, next) => {
  try { return sendSuccess(res, await service.getPipelineStats()); } catch (e) { next(e); }
});

router.get('/', async (req, res, next) => {
  try {
    const { status, assignedTo, page, limit } = req.query;
    return sendSuccess(res, await service.listLeads({ status, assignedTo, page: +page || 1, limit: +limit || 25 }));
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try { return sendSuccess(res, await service.createLead(req.body), 'Lead created', 201); } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try { return sendSuccess(res, await service.getLead(req.params.id)); } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try { return sendSuccess(res, await service.updateLead(req.params.id, req.body)); } catch (e) { next(e); }
});

router.post('/:id/activities', async (req, res, next) => {
  try { return sendSuccess(res, await service.addActivity(req.params.id, { ...req.body, createdBy: req.user.id }), 'Activity logged', 201); } catch (e) { next(e); }
});

export default router;
