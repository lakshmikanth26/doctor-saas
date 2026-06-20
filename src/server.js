import { validateEnv, env } from './config/env.js';
import { prisma } from './config/db.js';
import { redis } from './config/redis.js';
import { startNotificationWorker } from './modules/notifications/notification.worker.js';
import app from './app.js';

validateEnv();

async function start() {
  await prisma.$connect();
  console.log('[DB] Connected to PostgreSQL');

  if (redis.status === 'wait') {
    await redis.connect();
  }
  console.log('[Redis] Connected');

  startNotificationWorker();
  console.log('[Queue] Notification worker started');

  const server = app.listen(env.PORT, () => {
    console.log(`[${env.APP_NAME}] Running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = async (signal) => {
    console.log(`\n[${signal}] Shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      redis.disconnect();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('[Startup Error]', err);
  process.exit(1);
});
