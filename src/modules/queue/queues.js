import { Queue } from 'bullmq';
import { redis } from '../../config/redis.js';

const noopQueue = {
  add: async () => {},
  close: async () => {},
};

function hasRedis() {
  const url = process.env.REDIS_URL || '';
  return url && !url.includes('localhost') && !url.includes('127.0.0.1');
}

function createQueue(name) {
  if (process.env.VERCEL && !hasRedis()) {
    return noopQueue;
  }
  return new Queue(name, { connection: redis });
}

export const notificationQueue = createQueue('notifications');
export const aiQueue = createQueue('ai-tasks');
export const reportQueue = createQueue('reports');
