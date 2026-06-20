import { verifyAccessToken } from '../utils/jwt.js';
import { sendError } from '../utils/response.js';
import { prisma } from '../config/db.js';

export const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return sendError(res, 'Authentication required', 401);
  }

  const token = header.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        orgId: true,
        email: true,
        firstName: true,
        lastName: true,
        systemRole: true,
        status: true,
        userBranches: {
          where: { validUntil: null },
          select: { branchId: true, role: true },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      return sendError(res, 'Account not found or inactive', 401);
    }

    req.user = user;
    next();
  } catch {
    return sendError(res, 'Invalid or expired token', 401);
  }
};

export const requireSystemRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.systemRole)) {
    return sendError(res, 'Insufficient privileges', 403);
  }
  next();
};

export const requireOrgRole = (...roles) => (req, res, next) => {
  const userRoles = req.user?.userBranches?.map((ub) => ub.role) || [];
  const hasRole = roles.some((r) => userRoles.includes(r));
  if (!hasRole && req.user?.systemRole !== 'SYSTEM_ADMIN') {
    return sendError(res, 'Insufficient privileges', 403);
  }
  next();
};
