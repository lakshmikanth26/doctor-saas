import { z } from 'zod';
import * as service from './patients.service.js';
import { sendSuccess } from '../../utils/response.js';

const patientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  dateOfBirth: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
});

export const create = async (req, res, next) => {
  try {
    const data = patientSchema.parse(req.body);
    const patient = await service.createPatient(req.org.id, data);
    return sendSuccess(res, patient, 'Patient registered', 201);
  } catch (err) { next(err); }
};

export const list = async (req, res, next) => {
  try {
    const { search, page, limit } = req.query;
    const result = await service.listPatients(req.org.id, {
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
    return sendSuccess(res, result);
  } catch (err) { next(err); }
};

export const getOne = async (req, res, next) => {
  try {
    const patient = await service.getPatient(req.org.id, req.params.id);
    return sendSuccess(res, patient);
  } catch (err) { next(err); }
};

export const update = async (req, res, next) => {
  try {
    const data = patientSchema.partial().parse(req.body);
    const patient = await service.updatePatient(req.org.id, req.params.id, data);
    return sendSuccess(res, patient);
  } catch (err) { next(err); }
};

export const timeline = async (req, res, next) => {
  try {
    const data = await service.getTimeline(req.org.id, req.params.id);
    return sendSuccess(res, data);
  } catch (err) { next(err); }
};
