import { prisma } from '../../config/db.js';

export const createLead = async (data) => {
  return prisma.cRMLead.create({ data });
};

export const listLeads = async ({ status, assignedTo, page = 1, limit = 25 }) => {
  const where = {};
  if (status) where.status = status;
  if (assignedTo) where.assignedTo = assignedTo;

  const skip = (page - 1) * limit;
  const [leads, total] = await Promise.all([
    prisma.cRMLead.findMany({
      where, skip, take: limit, orderBy: { createdAt: 'desc' },
      include: {
        contacts: true,
        activities: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { opportunities: true } },
      },
    }),
    prisma.cRMLead.count({ where }),
  ]);

  return { leads, total, page, limit };
};

export const getLead = async (leadId) => {
  const lead = await prisma.cRMLead.findUnique({
    where: { id: leadId },
    include: {
      contacts: true,
      opportunities: { include: { proposals: true } },
      activities: { orderBy: { createdAt: 'desc' } },
      assignee: { select: { firstName: true, lastName: true } },
    },
  });
  if (!lead) throw Object.assign(new Error('Lead not found'), { status: 404 });
  return lead;
};

export const updateLead = async (leadId, data) => {
  if (data.status === 'WON' && !data.convertedAt) data.convertedAt = new Date();
  return prisma.cRMLead.update({ where: { id: leadId }, data });
};

export const addActivity = async (leadId, data) => {
  return prisma.cRMActivity.create({ data: { leadId, ...data } });
};

export const getPipelineStats = async () => {
  const stages = await prisma.cRMLead.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  const arr = await prisma.cRMOpportunity.aggregate({
    _sum: { expectedArr: true },
    where: { lead: { status: { notIn: ['LOST'] } } },
  });

  return {
    pipeline: stages.map((s) => ({ stage: s.status, count: s._count.id })),
    totalPipelineArr: arr._sum.expectedArr || 0,
  };
};
