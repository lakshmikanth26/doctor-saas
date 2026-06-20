import { prisma } from '../src/config/db.js';

const testRunId = Date.now();

export const testEmail = `api-test-${testRunId}@clinicos.test`;
export const testPassword = 'TestPass123!';

export async function connectDb() {
  await prisma.$connect();
}

export async function isDbAvailable() {
  try {
    await connectDb();
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function disconnectDb() {
  await prisma.$disconnect();
}

export async function cleanupTestOrg(email = testEmail) {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.orgId) return;
    await prisma.organization.delete({ where: { id: user.orgId } }).catch(() => {});
  } catch {
    // ignore cleanup errors when DB is unavailable
  }
}

export function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

export function uniqueSlug(prefix) {
  return `${prefix}-${testRunId}`;
}
