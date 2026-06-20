import { z } from 'zod';
import * as service from './billing.service.js';
import { sendSuccess } from '../../utils/response.js';

const invoiceSchema = z.object({
  branchId: z.string().uuid(),
  patientId: z.string().uuid(),
  visitId: z.string().uuid().optional(),
  discount: z.number().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    description: z.string(),
    category: z.enum(['SERVICE', 'MEDICINE', 'LAB', 'OTHER']).optional(),
    quantity: z.number().int().min(1),
    unitPrice: z.number().min(0),
    taxRate: z.number().min(0).optional(),
  })).min(1),
});

const paymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'ONLINE']).optional(),
  notes: z.string().optional(),
  gatewayRef: z.string().optional(),
});

export const create = async (req, res, next) => {
  try {
    const data = invoiceSchema.parse(req.body);
    const invoice = await service.createInvoice(req.org.id, data);
    return sendSuccess(res, invoice, 'Invoice created', 201);
  } catch (err) { next(err); }
};

export const list = async (req, res, next) => {
  try {
    const { branchId, status, patientId, page, limit } = req.query;
    const result = await service.listInvoices(req.org.id, {
      branchId, status, patientId,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
    return sendSuccess(res, result);
  } catch (err) { next(err); }
};

export const getOne = async (req, res, next) => {
  try {
    const invoice = await service.getInvoice(req.org.id, req.params.id);
    return sendSuccess(res, invoice);
  } catch (err) { next(err); }
};

export const recordPayment = async (req, res, next) => {
  try {
    const data = paymentSchema.parse(req.body);
    const payment = await service.recordPayment(req.org.id, req.params.id, data);
    return sendSuccess(res, payment, 'Payment recorded', 201);
  } catch (err) { next(err); }
};

export const dashboardStats = async (req, res, next) => {
  try {
    const stats = await service.getDashboardStats(req.org.id, req.query.branchId);
    return sendSuccess(res, stats);
  } catch (err) { next(err); }
};
