import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { tenantContext } from '../../middleware/tenantContext.js';
import { sendSuccess } from '../../utils/response.js';
import * as service from './staff.service.js';

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', async (req, res, next) => {
  try {
    const { branchId, role, search, page, limit } = req.query;
    return sendSuccess(res, await service.listStaff(req.org.id, { branchId, role, search, page: +page || 1, limit: +limit || 25 }));
  } catch (e) { next(e); }
});

// Static paths before /:id (otherwise "attendance" is captured as an id)
router.get('/leave/requests', async (req, res, next) => {
  try {
    const { userId, status, page, limit } = req.query;
    return sendSuccess(res, await service.getLeaveRequests(req.org.id, { userId, status, page: +page || 1, limit: +limit || 25 }));
  } catch (e) { next(e); }
});

router.post('/leave/requests', async (req, res, next) => {
  try { return sendSuccess(res, await service.createLeaveRequest(req.org.id, req.user.id, req.body), 'Leave request submitted', 201); } catch (e) { next(e); }
});

router.patch('/leave/requests/:id/status', async (req, res, next) => {
  try { return sendSuccess(res, await service.updateLeaveStatus(req.org.id, req.params.id, req.body.status, req.user.id)); } catch (e) { next(e); }
});

// Attendance
router.get('/attendance', async (req, res, next) => {
  try {
    const { userId, branchId, from, to, page, limit } = req.query;
    return sendSuccess(res, await service.getAttendance(req.org.id, { userId, branchId, from, to, page: +page || 1, limit: +limit || 50 }));
  } catch (e) { next(e); }
});

router.post('/attendance', async (req, res, next) => {
  try { return sendSuccess(res, await service.recordAttendance(req.org.id, req.user.id, req.body), 'Attendance recorded', 201); } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try { return sendSuccess(res, await service.getStaff(req.org.id, req.params.id)); } catch (e) { next(e); }
});

router.put('/:id/profile', async (req, res, next) => {
  try { return sendSuccess(res, await service.updateProfile(req.org.id, req.params.id, req.body)); } catch (e) { next(e); }
});

export default router;
