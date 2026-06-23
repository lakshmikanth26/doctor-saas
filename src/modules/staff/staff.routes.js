import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { tenantContext } from '../../middleware/tenantContext.js';
import { sendSuccess } from '../../utils/response.js';
import { prisma } from '../../config/db.js';
import * as service from './staff.service.js';

const router = Router();

router.get('/public', async (req, res, next) => {
  try {
    const { orgSlug, limit } = req.query;
    if (!orgSlug) return res.status(400).json({ success: false, message: 'orgSlug required' });
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true, isActive: true },
    });
    if (!org || !org.isActive) return sendSuccess(res, { staff: [], total: 0, page: 1, limit: 50, pages: 0 });
    const result = await service.listStaff(org.id, { role: 'DOCTOR', limit: +limit || 50 });
    const staff = result.staff.map((member) => ({
      ...member,
      role: member.userBranches?.find((ub) => ub.role === 'DOCTOR')?.role || member.systemRole,
    }));
    return sendSuccess(res, { ...result, staff });
  } catch (e) { next(e); }
});

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
