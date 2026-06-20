import 'dotenv/config';

/** Env overrides for local integration tests against Supabase session pooler. */
export function getTestEnv() {
  const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL or DIRECT_URL must be set in .env');
  }

  return {
    ...process.env,
    DATABASE_URL: dbUrl,
    // Dev only: some networks MITM TLS (antivirus/corporate proxy).
    ...(process.env.NODE_ENV !== 'production' && { NODE_TLS_REJECT_UNAUTHORIZED: '0' }),
  };
}
