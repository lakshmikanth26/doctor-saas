import { Router } from 'express';
import { getSlots, create, list, updateStatus, liveQueue, publicBook } from './appointments.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { tenantContext } from '../../middleware/tenantContext.js';

const router = Router();

// Public routes — no auth required (patient portal)
router.post('/public', publicBook);
router.get('/queue/public', async (req, res, next) => {
  const { prisma } = await import('../../config/db.js');
  const { sendSuccess } = await import('../../utils/response.js');
  try {
    const slug = req.query.orgSlug;
    const org = await prisma.organization.findFirst({
      where: slug ? { slug } : undefined,
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!org) return sendSuccess(res, []);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const queue = await prisma.appointment.findMany({
      where: { orgId: org.id, scheduledAt: { gte: today, lte: todayEnd }, status: { in: ['SCHEDULED','CONFIRMED','CHECKED_IN','IN_PROGRESS'] } },
      orderBy: [{ tokenNumber: 'asc' }],
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
        provider: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return sendSuccess(res, queue);
  } catch (err) { next(err); }
});

router.use(authenticate, tenantContext);

router.get('/slots', getSlots);
router.get('/queue', liveQueue);
router.get('/', list);
router.post('/', create);
router.patch('/:id/status', updateStatus);

export default router;
