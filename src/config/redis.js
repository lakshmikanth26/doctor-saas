import { Redis } from 'ioredis';
import { env } from './env.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

redis.on('error', (err) => {
  if (env.NODE_ENV !== 'test') console.error('[Redis] connection error:', err.message);
});
