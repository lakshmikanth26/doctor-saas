import 'dotenv/config';
import { execSync } from 'node:child_process';

const directUrl = process.env.DIRECT_URL;
if (!directUrl) {
  console.error('[db:push] DIRECT_URL is not set in .env');
  process.exit(1);
}

console.log('[db:push] Using session pooler (DIRECT_URL) for schema push…');
execSync('npx prisma db push', {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: directUrl },
});
