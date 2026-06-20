import { prisma } from '../config/db.js';
import { sendError } from '../utils/response.js';

export const tenantContext = async (req, res, next) => {
  const orgId = req.user?.orgId;
  if (!orgId) return next();

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, slug: true, name: true, plan: true, isActive: true, clinicType: true },
  });

  if (!org || !org.isActive) {
    return sendError(res, 'Organization not found or inactive', 403);
  }

  req.org = org;
  next();
};
