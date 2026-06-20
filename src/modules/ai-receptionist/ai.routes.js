import { Router } from 'express';
import { z } from 'zod';
import * as aiService from './ai.service.js';
import { sendSuccess } from '../../utils/response.js';

const router = Router();

// Public endpoint — no auth needed (used by website widget)
router.post('/:orgSlug/session', async (req, res, next) => {
  try {
    const { prisma } = await import('../../config/db.js');
    const org = await prisma.organization.findUnique({ where: { slug: req.params.orgSlug } });
    if (!org) return res.status(404).json({ success: false, message: 'Clinic not found' });

    const session = await aiService.createSession(org.id, req.body);
    return sendSuccess(res, session, 'Session started', 201);
  } catch (err) { next(err); }
});

router.post('/:orgSlug/chat', async (req, res, next) => {
  try {
    const { message, sessionId } = z.object({
      message: z.string().min(1),
      sessionId: z.string().uuid(),
    }).parse(req.body);

    const { prisma } = await import('../../config/db.js');
    const org = await prisma.organization.findUnique({ where: { slug: req.params.orgSlug } });
    if (!org) return res.status(404).json({ success: false, message: 'Clinic not found' });

    const result = await aiService.chat(org.id, sessionId, message);
    return sendSuccess(res, result);
  } catch (err) { next(err); }
});

export default router;
