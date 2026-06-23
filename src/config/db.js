import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { env } from './env.js';

const globalForPrisma = globalThis;

/** Session pooler in dev; transaction pooler in production. */
function resolveDatabaseUrl() {
  if (env.NODE_ENV !== 'production' && env.DIRECT_URL) {
    return env.DIRECT_URL;
  }
  return env.DATABASE_URL;
}

/** sslmode=require forces strict cert verify in pg v8+; use explicit ssl object instead. */
function createPgPool(connectionString) {
  const isSupabase = connectionString?.includes('supabase.com');
  const cleanUrl = connectionString
    ?.replace(/([?&])sslmode=[^&]*&?/g, '$1')
    .replace(/[?&]$/, '');

  return new pg.Pool({
    connectionString: cleanUrl,
    max: process.env.VERCEL ? 1 : 10,
    idleTimeoutMillis: process.env.VERCEL ? 5000 : 30000,
    ...(isSupabase && { ssl: { rejectUnauthorized: false } }),
  });
}

function createPrismaClient() {
  const pool = createPgPool(resolveDatabaseUrl());
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;
