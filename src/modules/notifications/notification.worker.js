import { Worker } from 'bullmq';
import { Resend } from 'resend';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';

const resend = new Resend(env.RESEND_API_KEY);

export function startNotificationWorker() {
  const worker = new Worker(
    'notifications',
    async (job) => {
      const { name, data } = job;

      switch (name) {
        case 'appointment-confirmation':
          await sendAppointmentConfirmation(data);
          break;
        case 'appointment-reminder':
          await sendAppointmentReminder(data);
          break;
        case 'invoice-due':
          await sendInvoiceDue(data);
          break;
        default:
          console.warn(`[NotificationWorker] Unknown job: ${name}`);
      }
    },
    { connection: redis, concurrency: 5 }
  );

  worker.on('completed', (job) => console.log(`[NotificationWorker] ${job.name} completed`));
  worker.on('failed', (job, err) => console.error(`[NotificationWorker] ${job.name} failed:`, err.message));

  return worker;
}

async function sendAppointmentConfirmation({ appointmentId, patientPhone, patientName, doctorName, scheduledAt }) {
  const formattedDate = new Date(scheduledAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  let status = 'SENT';
  let errorMsg = null;

  try {
    if (env.RESEND_API_KEY) {
      await resend.emails.send({
        from: env.EMAIL_FROM,
        to: patientPhone,
        subject: 'Appointment Confirmed',
        html: `<p>Dear ${patientName},</p><p>Your appointment with <strong>${doctorName}</strong> is confirmed for <strong>${formattedDate}</strong>.</p>`,
      });
    }
  } catch (err) {
    status = 'FAILED';
    errorMsg = err.message;
  }

  await prisma.notificationLog.create({
    data: {
      channel: 'EMAIL',
      to: patientPhone || 'unknown',
      subject: 'Appointment Confirmed',
      body: `Appointment with ${doctorName} on ${formattedDate}`,
      status,
      errorMsg,
      sentAt: status === 'SENT' ? new Date() : null,
    },
  });
}

async function sendAppointmentReminder({ appointmentId, patientPhone, patientName, doctorName, scheduledAt }) {
  const formattedDate = new Date(scheduledAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  console.log(`[Reminder] Sending to ${patientName} for appt with ${doctorName} at ${formattedDate}`);
}

async function sendInvoiceDue({ invoiceId, patientName, total, invoiceNumber }) {
  console.log(`[Invoice] Sending due reminder for ${invoiceNumber} (${total}) to ${patientName}`);
}
