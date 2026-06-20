import { prisma } from '../../config/db.js';

const MRN_PREFIX = 'PT';

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
