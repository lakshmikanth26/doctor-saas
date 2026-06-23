import { validateEnv } from '../src/config/env.js';
import app from '../src/app.js';

try {
  validateEnv();
} catch (err) {
  console.error('[Vercel] Missing env vars:', err.message);
}

export default app;
