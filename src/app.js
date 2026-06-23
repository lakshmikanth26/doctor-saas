import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL_ENV;

if (isVercel) {
  app.set('trust proxy', 1);
}

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true)
    const allowed = [
      env.FRONTEND_URL,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      /^https:\/\/.*\.vercel\.app$/,
      /^https:\/\/.*\.mednest\.app$/,
    ]
    if (allowed.some((o) => (o instanceof RegExp ? o.test(origin) : o === origin))) {
      return callback(null, true)
    }
    return callback(null, false)
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (!isVercel) {
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later' },
  }));
}

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    app: env.APP_NAME,
    message: 'Mednest API — use /health or /api/v1/*',
    health: '/health',
    api: '/api/v1',
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: env.APP_NAME, env: env.NODE_ENV, ts: new Date().toISOString() });
});

app.use('/api/v1', routes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

app.use(errorHandler);

export default app;
