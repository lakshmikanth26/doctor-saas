import { prisma } from '../../config/db.js';

const MRN_PREFIX = 'PT';

function normalizePhone(phone) {
  return phone.replace(/\D/g, '');
}

async function generateMRN(orgId) {
  const count = await prisma.patient.count({ where: { orgId } });
  return `${MRN_PREFIX}${String(count + 1).padStart(6, '0')}`;
}

export const createPatient = async (orgId, data) => {
  const mrn = await generateMRN(orgId);
  return prisma.patient.create({
    data: { orgId, mrn, ...data },
  });
};

export const listPatients = async (orgId, { search, page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;
  const where = {
    orgId,
    isActive: true,
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { mrn: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.patient.count({ where }),
  ]);

  return { patients, total, page, limit, totalPages: Math.ceil(total / limit) };
};

/** Find patients by mobile or email (for appointment booking). */
export const lookupByContact = async (orgId, { phone, email }) => {
  if (!phone && !email) {
    throw Object.assign(new Error('Phone or email is required'), { status: 400 });
  }

  const conditions = [];
  if (phone) {
    const digits = normalizePhone(phone);
    if (digits.length >= 6) {
      conditions.push({ phone: { contains: digits } });
    }
  }
  if (email) {
    conditions.push({ email: { equals: email.trim(), mode: 'insensitive' } });
  }

  if (conditions.length === 0) {
    throw Object.assign(new Error('Invalid phone or email'), { status: 400 });
  }

  const patients = await prisma.patient.findMany({
    where: { orgId, isActive: true, OR: conditions },
    select: {
      id: true, mrn: true, firstName: true, lastName: true,
      phone: true, email: true, gender: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return { patients, count: patients.length };
};

/** Resolve patient id from uuid, phone, or email (used when booking). */
export const resolvePatientId = async (orgId, { patientId, patientPhone, patientEmail }) => {
  if (patientId) {
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, orgId, isActive: true },
    });
    if (!patient) throw Object.assign(new Error('Patient not found'), { status: 404 });
    return patient.id;
  }

  const { patients } = await lookupByContact(orgId, { phone: patientPhone, email: patientEmail });
  if (patients.length === 0) {
    throw Object.assign(new Error('No patient found with this phone or email'), { status: 404 });
  }
  if (patients.length > 1) {
    throw Object.assign(
      new Error('Multiple patients match this phone/email — use patientId or refine the search'),
      { status: 409 },
    );
  }
  return patients[0].id;
};

export const getPatient = async (orgId, patientId) => {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, orgId },
    include: {
      allergies: true,
      medicalHistory: true,
      appointments: {
        orderBy: { scheduledAt: 'desc' },
        take: 10,
        include: { provider: { select: { firstName: true, lastName: true } }, serviceType: true },
      },
    },
  });
  if (!patient) throw Object.assign(new Error('Patient not found'), { status: 404 });
  return patient;
};

export const updatePatient = async (orgId, patientId, data) => {
  const patient = await prisma.patient.findFirst({ where: { id: patientId, orgId } });
  if (!patient) throw Object.assign(new Error('Patient not found'), { status: 404 });
  return prisma.patient.update({ where: { id: patientId }, data });
};

export const getTimeline = async (orgId, patientId) => {
  const patient = await prisma.patient.findFirst({ where: { id: patientId, orgId } });
  if (!patient) throw Object.assign(new Error('Patient not found'), { status: 404 });

  return prisma.visit.findMany({
    where: { patientId },
    orderBy: { visitDate: 'desc' },
    include: {
      soapNote: true,
      vitals: { orderBy: { recordedAt: 'desc' }, take: 1 },
      diagnoses: true,
      prescription: { include: { items: true } },
      invoice: { select: { total: true, status: true, invoiceNumber: true } },
    },
  });
};
