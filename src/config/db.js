import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { env } from './env.js';

const globalForPrisma = globalThis;

function createPrismaClient() {
  const isSupabase = env.DATABASE_URL?.includes('supabase.com');
  const pool = new pg.Pool({
    connectionString: env.DATABASE_URL,
    ...(isSupabase && { ssl: { rejectUnauthorized: false } }),
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
