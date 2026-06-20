import { prisma } from '../../config/db.js';

export const createVisit = async (orgId, appointmentId, data) => {
  const appt = await prisma.appointment.findFirst({ where: { id: appointmentId, orgId } });
  if (!appt) throw Object.assign(new Error('Appointment not found'), { status: 404 });

  const visit = await prisma.visit.create({
    data: {
      appointmentId,
      patientId: appt.patientId,
      providerId: appt.providerId,
      branchId: appt.branchId,
      chiefComplaint: data.chiefComplaint || appt.chiefComplaint,
      visitType: data.visitType || 'CONSULTATION',
      status: 'OPEN',
    },
  });

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: 'IN_PROGRESS' },
  });

  return visit;
};

export const getVisit = async (orgId, visitId) => {
  const visit = await prisma.visit.findFirst({
    where: { id: visitId, patient: { orgId } },
    include: {
      patient: true,
      provider: { select: { firstName: true, lastName: true } },
      soapNote: true,
      vitals: { orderBy: { recordedAt: 'desc' } },
      diagnoses: true,
      prescription: { include: { items: true } },
      labOrders: { include: { items: { include: { result: true } } } },
      documents: true,
    },
  });
  if (!visit) throw Object.assign(new Error('Visit not found'), { status: 404 });
  return visit;
};

export const saveSoapNote = async (orgId, visitId, data, aiGenerated = false) => {
  const visit = await prisma.visit.findFirst({ where: { id: visitId, patient: { orgId } } });
  if (!visit) throw Object.assign(new Error('Visit not found'), { status: 404 });

  return prisma.soapNote.upsert({
    where: { visitId },
    create: { visitId, ...data, aiGenerated },
    update: { ...data, aiGenerated },
  });
};

export const addVitals = async (orgId, visitId, data) => {
  const visit = await prisma.visit.findFirst({ where: { id: visitId, patient: { orgId } } });
  if (!visit) throw Object.assign(new Error('Visit not found'), { status: 404 });

  // Auto-calculate BMI if height and weight provided
  if (data.weightKg && data.heightCm) {
    const heightM = data.heightCm / 100;
    data.bmi = parseFloat((data.weightKg / (heightM * heightM)).toFixed(1));
  }

  return prisma.vital.create({ data: { visitId, ...data } });
};

export const addDiagnosis = async (orgId, visitId, data) => {
  const visit = await prisma.visit.findFirst({ where: { id: visitId, patient: { orgId } } });
  if (!visit) throw Object.assign(new Error('Visit not found'), { status: 404 });
  return prisma.diagnosis.create({ data: { visitId, ...data } });
};

export const completeVisit = async (orgId, visitId) => {
  const visit = await prisma.visit.findFirst({ where: { id: visitId, patient: { orgId } } });
  if (!visit) throw Object.assign(new Error('Visit not found'), { status: 404 });

  await prisma.appointment.update({
    where: { id: visit.appointmentId },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });

  return prisma.visit.update({ where: { id: visitId }, data: { status: 'CLOSED' } });
};
