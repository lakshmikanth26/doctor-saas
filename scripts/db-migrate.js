import 'dotenv/config';
import { execSync } from 'node:child_process';

const directUrl = process.env.DIRECT_URL;
if (!directUrl) {
  console.error('[db:migrate] DIRECT_URL is not set in .env');
  process.exit(1);
}

console.log('[db:migrate] Using session pooler (DIRECT_URL) for migrations…');
execSync('npx prisma migrate dev', {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: directUrl },
});
