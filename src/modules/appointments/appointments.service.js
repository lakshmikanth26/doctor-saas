import { prisma } from '../../config/db.js';
import { notificationQueue } from '../queue/queues.js';
import { resolvePatientId } from '../patients/patients.service.js';

export const getAvailableSlots = async (orgId, { providerId, branchId, date, serviceTypeId }) => {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const serviceType = serviceTypeId
    ? await prisma.serviceType.findFirst({ where: { id: serviceTypeId, orgId } })
    : null;
  const duration = serviceType?.durationMinutes || 15;

  const booked = await prisma.appointment.findMany({
    where: {
      providerId,
      branchId,
      scheduledAt: { gte: dayStart, lte: dayEnd },
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
    select: { scheduledAt: true, endsAt: true },
  });

  // Generate slots 9am–5pm with the service duration
  const slots = [];
  const start = new Date(date);
  start.setHours(9, 0, 0, 0);
  const end = new Date(date);
  end.setHours(17, 0, 0, 0);

  while (start < end) {
    const slotEnd = new Date(start.getTime() + duration * 60 * 1000);
    const conflict = booked.some(
      (b) => start < new Date(b.endsAt) && slotEnd > new Date(b.scheduledAt)
    );
    slots.push({ time: new Date(start), available: !conflict });
    start.setMinutes(start.getMinutes() + duration);
  }

  return slots;
};

export const createAppointment = async (orgId, data) => {
  const {
    branchId, providerId, serviceTypeId, scheduledAt, type, chiefComplaint, notes,
    patientId, patientPhone, patientEmail,
  } = data;

  const resolvedPatientId = await resolvePatientId(orgId, { patientId, patientPhone, patientEmail });

  const serviceType = serviceTypeId
    ? await prisma.serviceType.findFirst({ where: { id: serviceTypeId, orgId } })
    : null;
  const duration = serviceType?.durationMinutes || 15;
  const endsAt = new Date(new Date(scheduledAt).getTime() + duration * 60 * 1000);

  const tokenCount = await prisma.appointment.count({
    where: {
      branchId,
      scheduledAt: {
        gte: new Date(new Date(scheduledAt).setHours(0, 0, 0, 0)),
        lte: new Date(new Date(scheduledAt).setHours(23, 59, 59, 999)),
      },
    },
  });

  const appointment = await prisma.appointment.create({
    data: {
      orgId,
      branchId,
      patientId: resolvedPatientId,
      providerId,
      serviceTypeId,
      scheduledAt: new Date(scheduledAt),
      endsAt,
      type: type || 'IN_PERSON',
      chiefComplaint,
      notes,
      tokenNumber: tokenCount + 1,
      status: 'SCHEDULED',
    },
    include: {
      patient: { select: { firstName: true, lastName: true, phone: true } },
      provider: { select: { firstName: true, lastName: true } },
      serviceType: true,
    },
  });

  await notificationQueue.add('appointment-confirmation', {
    appointmentId: appointment.id,
    patientPhone: appointment.patient.phone,
    patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
    doctorName: `Dr. ${appointment.provider.firstName} ${appointment.provider.lastName}`,
    scheduledAt: appointment.scheduledAt,
  }, { delay: 0 });

  return appointment;
};

export const listAppointments = async (orgId, { branchId, providerId, date, status, page = 1, limit = 50 }) => {
  const where = { orgId };
  if (branchId) where.branchId = branchId;
  if (providerId) where.providerId = providerId;
  if (status) where.status = status;
  if (date) {
    const d = new Date(date);
    where.scheduledAt = {
      gte: new Date(d.setHours(0, 0, 0, 0)),
      lte: new Date(d.setHours(23, 59, 59, 999)),
    };
  }

  const skip = (page - 1) * limit;
  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { scheduledAt: 'asc' },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true, mrn: true } },
        provider: { select: { id: true, firstName: true, lastName: true } },
        serviceType: { select: { name: true, durationMinutes: true } },
        branch: { select: { name: true } },
      },
    }),
    prisma.appointment.count({ where }),
  ]);

  return { appointments, total, page, limit };
};

export const updateStatus = async (orgId, appointmentId, status) => {
  const appt = await prisma.appointment.findFirst({ where: { id: appointmentId, orgId } });
  if (!appt) throw Object.assign(new Error('Appointment not found'), { status: 404 });

  const updateData = { status };
  if (status === 'CHECKED_IN') updateData.checkedInAt = new Date();
  if (status === 'COMPLETED') updateData.completedAt = new Date();
  if (status === 'CANCELLED') updateData.cancelledAt = new Date();

  return prisma.appointment.update({ where: { id: appointmentId }, data: updateData });
};

export const getLiveQueue = async (orgId, branchId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  return prisma.appointment.findMany({
    where: {
      orgId,
      branchId,
      scheduledAt: { gte: today, lte: todayEnd },
      status: { in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] },
    },
    orderBy: [{ tokenNumber: 'asc' }],
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      provider: { select: { id: true, firstName: true, lastName: true } },
      serviceType: { select: { name: true } },
    },
  });
};
