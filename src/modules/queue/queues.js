import { Queue } from 'bullmq';
import { redis } from '../../config/redis.js';

const connection = redis;

export const notificationQueue = new Queue('notifications', { connection });
export const aiQueue = new Queue('ai-tasks', { connection });
export const reportQueue = new Queue('reports', { connection });
