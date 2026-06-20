import { z } from 'zod';
import * as service from './appointments.service.js';
import { sendSuccess } from '../../utils/response.js';

const createSchema = z.object({
  branchId: z.string().uuid(),
  patientId: z.string().uuid(),
  providerId: z.string().uuid(),
  serviceTypeId: z.string().uuid().optional(),
  scheduledAt: z.string(),
  type: z.enum(['IN_PERSON', 'TELEHEALTH']).optional(),
  chiefComplaint: z.string().optional(),
  notes: z.string().optional(),
});

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

export const liveQueue = async (req, res, next) => {
  try {
    const { branchId } = req.query;
    const queue = await service.getLiveQueue(req.org.id, branchId);
    return sendSuccess(res, queue);
  } catch (err) { next(err); }
};
