import express from 'express';
import { getEnvStatus } from '../src/config/env.js';

const { ok, missing } = getEnvStatus();

let app;

if (ok) {
  app = (await import('../src/app.js')).default;
} else {
  console.error('[Vercel] Missing env vars:', missing.join(', '));
  app = express();
  app.use(express.json());
  app.use((req, res) => {
    res.status(503).json({
      success: false,
      message: 'API misconfigured on server',
      missing,
      hint: 'Add DATABASE_URL, JWT_SECRET, and JWT_REFRESH_SECRET in Vercel → Settings → Environment Variables (enable Production + Preview), then redeploy.',
    });
  });
}

export default app;
