import { prisma } from '../../config/db.js';
import { AppError } from '../../utils/errors.js';

export async function createPrescription(orgId, visitId, doctorId, items) {
  const visit = await prisma.visit.findFirst({
    where: { id: visitId, patient: { orgId } },
  });
  if (!visit) throw new AppError('Visit not found', 404);

  return prisma.prescription.create({
    data: {
      visitId,
      patientId: visit.patientId,
      providerId: doctorId,
      items: {
        create: items.map((i) => ({
          drugId: i.drugId,
          drugName: i.drugName,
          dosage: i.dosage,
          frequency: i.frequency,
          durationDays: i.durationDays ?? i.duration,
          quantity: i.quantity,
          instructions: i.instructions,
        })),
      },
    },
    include: { items: true },
  });
}

export async function getPrescription(orgId, id) {
  const rx = await prisma.prescription.findFirst({
    where: { id, patient: { orgId } },
    include: { items: { include: { drug: true } }, patient: true },
  });
  if (!rx) throw new AppError('Prescription not found', 404);
  return rx;
}

export async function listPrescriptions(orgId, { patientId, doctorId, page = 1, limit = 25 }) {
  const where = {
    patient: { orgId },
    ...(patientId && { patientId }),
    ...(doctorId && { providerId: doctorId }),
  };
  const [prescriptions, total] = await Promise.all([
    prisma.prescription.findMany({
      where,
      include: { items: true, patient: { select: { firstName: true, lastName: true, mrn: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.prescription.count({ where }),
  ]);
  return { prescriptions, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function updateStatus(orgId, id, status) {
  const rx = await prisma.prescription.findFirst({
    where: { id, patient: { orgId } },
  });
  if (!rx) throw new AppError('Prescription not found', 404);
  return prisma.prescription.update({ where: { id }, data: { status } });
}
