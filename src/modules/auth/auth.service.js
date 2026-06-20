import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/db.js';
import { signAccessToken } from '../../utils/jwt.js';

export const register = async ({ firstName, lastName, email, password, orgName, clinicType, phone }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw Object.assign(new Error('Email already registered'), { status: 409 });

  const slug = orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + uuidv4().slice(0, 6);

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        slug,
        name: orgName,
        clinicType: clinicType || 'HUMAN_GENERAL',
        phone,
        subscription: {
          create: {
            plan: 'STARTER',
            status: 'TRIALING',
            trialEnds: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        },
      },
    });

    const user = await tx.user.create({
      data: {
        orgId: org.id,
        email,
        phone,
        firstName,
        lastName,
        passwordHash,
        status: 'ACTIVE',
      },
    });

    const branch = await tx.branch.create({
      data: { orgId: org.id, name: orgName + ' - Main Branch', isActive: true },
    });

    await tx.userBranch.create({
      data: { userId: user.id, branchId: branch.id, role: 'ORG_OWNER' },
    });

    return { user, org, branch };
  });

  const tokenPayload = { userId: result.user.id, orgId: result.org.id };
  return {
    accessToken: signAccessToken(tokenPayload),
    refreshToken: await _storeRefreshToken(result.user.id),
    user: _safeUser(result.user),
    org: { id: result.org.id, slug: result.org.slug, name: result.org.name },
  };
};

export const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { org: { select: { id: true, slug: true, name: true, isActive: true, plan: true } } },
  });

  if (!user) throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  if (user.status !== 'ACTIVE') throw Object.assign(new Error('Account is inactive'), { status: 401 });
  if (user.org && !user.org.isActive) throw Object.assign(new Error('Organization is inactive'), { status: 401 });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw Object.assign(new Error('Invalid email or password'), { status: 401 });

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const tokenPayload = { userId: user.id, orgId: user.orgId };
  return {
    accessToken: signAccessToken(tokenPayload),
    refreshToken: await _storeRefreshToken(user.id),
    user: _safeUser(user),
    org: user.org,
  };
};

export const refreshTokens = async (token) => {
  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.expiresAt < new Date()) {
    throw Object.assign(new Error('Refresh token expired or revoked'), { status: 401 });
  }

  await prisma.refreshToken.delete({ where: { token } });

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user || user.status !== 'ACTIVE') {
    throw Object.assign(new Error('User not found'), { status: 401 });
  }

  const tokenPayload = { userId: user.id, orgId: user.orgId };
  return {
    accessToken: signAccessToken(tokenPayload),
    refreshToken: await _storeRefreshToken(user.id),
  };
};

export const logout = async (token) => {
  await prisma.refreshToken.deleteMany({ where: { token } });
};

async function _storeRefreshToken(userId) {
  const token = uuidv4() + '-' + uuidv4();
  await prisma.refreshToken.create({
    data: { userId, token, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });
  return token;
}

function _safeUser(user) {
  const { passwordHash, mfaSecret, ...safe } = user;
  return safe;
}
