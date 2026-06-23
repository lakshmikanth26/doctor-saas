import { z } from 'zod';
import * as service from './appointments.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { prisma } from '../../config/db.js';
import { lookupByContact } from '../patients/patients.service.js';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

function emptyToUndefined(val) {
  if (val === null || val === undefined) return undefined;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return undefined;
    return trimmed;
  }
  return val;
}

/** Ignore invalid doctor/provider ids instead of failing validation. */
function coerceOptionalUuid(val) {
  const normalized = emptyToUndefined(val);
  if (normalized === undefined) return undefined;
  const str = String(normalized);
  return UUID_RE.test(str) ? str : undefined;
}

const optionalUuid = () => z.preprocess(coerceOptionalUuid, z.string().uuid().optional());

const createSchema = z.object({
  branchId: z.string().uuid(),
  providerId: z.string().uuid(),
  serviceTypeId: z.string().uuid().optional(),
  scheduledAt: z.string(),
  type: z.enum(['IN_PERSON', 'TELEHEALTH']).optional(),
  chiefComplaint: z.string().optional(),
  notes: z.string().optional(),
  patientId: z.string().uuid().optional(),
  patientPhone: z.string().min(6).optional(),
  patientEmail: z.string().email().optional(),
}).refine(
  (data) => data.patientId || data.patientPhone || data.patientEmail,
  { message: 'Provide patientId, patientPhone, or patientEmail' },
);

export const getSlots = async (req, res, next) => {
  try {
    const { providerId, branchId, date, serviceTypeId } = req.query;
    const slots = await service.getAvailableSlots(req.org.id, { providerId, branchId, date, serviceTypeId });
    return sendSuccess(res, slots);
  } catch (err) { next(err); }
};

export const create = async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const appt = await service.createAppointment(req.org.id, data);
    return sendSuccess(res, appt, 'Appointment booked', 201);
  } catch (err) { next(err); }
};

export const list = async (req, res, next) => {
  try {
    const { branchId, providerId, date, status, page, limit } = req.query;
    const result = await service.listAppointments(req.org.id, {
      branchId, providerId, date, status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
    return sendSuccess(res, result);
  } catch (err) { next(err); }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { status } = z.object({ status: z.enum(['CONFIRMED','CHECKED_IN','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW']) }).parse(req.body);
    const appt = await service.updateStatus(req.org.id, req.params.id, status);
    return sendSuccess(res, appt);
  } catch (err) { next(err); }
};

const publicBookSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(6),
  email: z.preprocess(emptyToUndefined, z.string().email().optional()),
  scheduledDate: z.string(),
  scheduledTime: z.string().optional(),
  doctorId: z.unknown().optional(),
  providerId: z.unknown().optional(),
  reason: z.string().optional(),
  orgSlug: z.string().optional(),
}).transform((data) => ({
  ...data,
  doctorId: coerceOptionalUuid(data.doctorId) ?? coerceOptionalUuid(data.providerId),
}));

async function resolvePublicProviderId(orgId, doctorId) {
  if (doctorId) {
    const provider = await prisma.user.findFirst({ where: { id: doctorId, orgId } });
    if (!provider) throw Object.assign(new Error('Doctor not found'), { status: 404 });
    return provider.id;
  }

  const doctor = await prisma.user.findFirst({
    where: { orgId, userBranches: { some: { role: 'DOCTOR' } } },
    orderBy: { createdAt: 'asc' },
  });
  if (doctor) return doctor.id;

  const fallback = await prisma.user.findFirst({ where: { orgId }, orderBy: { createdAt: 'asc' } });
  if (!fallback) throw Object.assign(new Error('No doctors available'), { status: 400 });
  return fallback.id;
}

export const publicBook = async (req, res, next) => {
  try {
    const body = publicBookSchema.parse(req.body);
    const slug = body.orgSlug || req.query.orgSlug;

    if (!slug) return sendError(res, 'Clinic slug is required. Use /portal/your-clinic-slug to book.', 400);
    const org = await prisma.organization.findFirst({
      where: { slug },
      select: { id: true, isActive: true },
    });
    if (!org || !org.isActive) return sendError(res, 'Clinic not found', 404);

    // Find or create patient by phone (normalized) or email
    const { patients } = await lookupByContact(org.id, { phone: body.phone, email: body.email }).catch(() => ({ patients: [] }));
    let patient = patients[0];
    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          orgId: org.id,
          firstName: body.firstName,
          lastName: body.lastName,
          phone: body.phone,
          email: body.email,
          mrn: `P-${Date.now()}`,
        },
      });
    }

    // Resolve scheduledAt from date + optional time
    const dateStr = body.scheduledDate;
    const timeStr = body.scheduledTime || '09:00';
    const scheduledAt = new Date(`${dateStr}T${timeStr}:00`);

    const providerId = await resolvePublicProviderId(org.id, body.doctorId);

    // Get first branch
    const branch = await prisma.branch.findFirst({ where: { orgId: org.id } });
    if (!branch) return sendError(res, 'Clinic has no branch configured', 400);

    const tokenCount = await prisma.appointment.count({
      where: {
        branchId: branch.id,
        scheduledAt: {
          gte: new Date(new Date(scheduledAt).setHours(0, 0, 0, 0)),
          lte: new Date(new Date(scheduledAt).setHours(23, 59, 59, 999)),
        },
      },
    });

    const endsAt = new Date(scheduledAt.getTime() + 60 * 60 * 1000); // 1 hour

    const appointment = await prisma.appointment.create({
      data: {
        orgId: org.id,
        branchId: branch.id,
        patientId: patient.id,
        providerId,
        scheduledAt,
        endsAt,
        type: 'IN_PERSON',
        chiefComplaint: body.reason,
        tokenNumber: tokenCount + 1,
        status: 'SCHEDULED',
      },
      include: {
        patient: { select: { firstName: true, lastName: true, phone: true } },
        provider: { select: { firstName: true, lastName: true } },
      },
    });

    return sendSuccess(res, appointment, 'Appointment booked', 201);
  } catch (err) { next(err); }
};

export const publicQueue = async (req, res, next) => {
  try {
    const { orgSlug } = req.query;
    const org = await prisma.organization.findFirst({
      where: orgSlug ? { slug: orgSlug } : undefined,
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!org) return sendSuccess(res, []);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const queue = await prisma.appointment.findMany({
      where: {
        orgId: org.id,
        scheduledAt: { gte: today, lte: todayEnd },
        status: { in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] },
      },
      orderBy: [{ tokenNumber: 'asc' }],
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
        provider: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return sendSuccess(res, queue);
  } catch (err) { next(err); }
};

export const liveQueue = async (req, res, next) => {
  try {
    const { branchId } = req.query;
    const queue = await service.getLiveQueue(req.org.id, branchId);
    return sendSuccess(res, queue);
  } catch (err) { next(err); }
};
