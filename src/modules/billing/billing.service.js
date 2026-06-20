import { prisma } from '../../config/db.js';

async function generateInvoiceNumber(orgId) {
  const count = await prisma.invoice.count({ where: { orgId } });
  const date = new Date();
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `INV-${yy}${mm}-${String(count + 1).padStart(5, '0')}`;
}

export const createInvoice = async (orgId, data) => {
  const { branchId, patientId, visitId, items, dueDate, notes, discount = 0 } = data;

  const invoiceNumber = await generateInvoiceNumber(orgId);

  let subtotal = 0;
  let taxAmount = 0;
  const lineItems = items.map((item) => {
    const amount = item.quantity * item.unitPrice;
    const tax = (amount * (item.taxRate || 0)) / 100;
    subtotal += amount;
    taxAmount += tax;
    return { ...item, amount };
  });

  const total = subtotal + taxAmount - discount;

  return prisma.invoice.create({
    data: {
      orgId,
      branchId,
      patientId,
      visitId,
      invoiceNumber,
      status: 'DRAFT',
      subtotal,
      taxAmount,
      discount,
      total,
      dueDate: dueDate ? new Date(dueDate) : null,
      notes,
      items: { create: lineItems },
    },
    include: { items: true, patient: { select: { firstName: true, lastName: true } } },
  });
};

export const getInvoice = async (orgId, invoiceId) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, orgId },
    include: {
      items: true,
      payments: true,
      patient: { select: { firstName: true, lastName: true, phone: true } },
      branch: { select: { name: true } },
    },
  });
  if (!invoice) throw Object.assign(new Error('Invoice not found'), { status: 404 });
  return invoice;
};

export const listInvoices = async (orgId, { branchId, status, patientId, page = 1, limit = 20 }) => {
  const where = { orgId };
  if (branchId) where.branchId = branchId;
  if (status) where.status = status;
  if (patientId) where.patientId = patientId;

  const skip = (page - 1) * limit;
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where, skip, take: limit, orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        payments: { select: { amount: true, method: true, paidAt: true } },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  return { invoices, total, page, limit };
};

export const recordPayment = async (orgId, invoiceId, { amount, method, notes, gatewayRef }) => {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, orgId } });
  if (!invoice) throw Object.assign(new Error('Invoice not found'), { status: 404 });

  const payment = await prisma.payment.create({
    data: { invoiceId, amount, method: method || 'CASH', notes, gatewayRef, status: 'SUCCESS' },
  });

  const totalPaid = Number(invoice.paidAmount) + Number(amount);
  const newStatus = totalPaid >= Number(invoice.total) ? 'PAID' : 'PARTIAL';

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { paidAmount: totalPaid, status: newStatus },
  });

  return payment;
};

export const getDashboardStats = async (orgId, branchId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const where = { orgId, ...(branchId && { branchId }) };

  const [todayRevenue, monthRevenue, outstanding, totalPatients, todayAppointments] = await Promise.all([
    prisma.payment.aggregate({
      where: { invoice: where, paidAt: { gte: today, lte: todayEnd } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { invoice: where, paidAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { ...where, status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] } },
      _sum: { total: true },
    }),
    prisma.patient.count({ where: { orgId, isActive: true } }),
    prisma.appointment.count({
      where: { orgId, scheduledAt: { gte: today, lte: todayEnd } },
    }),
  ]);

  return {
    todayRevenue: todayRevenue._sum.amount || 0,
    monthRevenue: monthRevenue._sum.amount || 0,
    outstanding: outstanding._sum.total || 0,
    totalPatients,
    todayAppointments,
  };
};
