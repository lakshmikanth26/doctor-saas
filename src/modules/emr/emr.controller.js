import { z } from 'zod';
import * as service from './emr.service.js';
import { sendSuccess } from '../../utils/response.js';

const vitalsSchema = z.object({
  weightKg: z.number().optional(),
  heightCm: z.number().optional(),
  tempCelsius: z.number().optional(),
  bpSystolic: z.number().int().optional(),
  bpDiastolic: z.number().int().optional(),
  pulse: z.number().int().optional(),
  spo2: z.number().int().optional(),
  respiratoryRate: z.number().int().optional(),
  bloodSugar: z.number().optional(),
}).optional();

const soapSchema = z.object({
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
});

const diagnosisSchema = z.object({
  icdCode: z.string().optional(),
  description: z.string().min(1),
  type: z.enum(['PRIMARY', 'SECONDARY']).optional(),
  notes: z.string().optional(),
});

export const createVisit = async (req, res, next) => {
  try {
    const visit = await service.createVisit(req.org.id, req.params.appointmentId, req.body);
    return sendSuccess(res, visit, 'Visit started', 201);
  } catch (err) { next(err); }
};

export const getVisit = async (req, res, next) => {
  try {
    const visit = await service.getVisit(req.org.id, req.params.visitId);
    return sendSuccess(res, visit);
  } catch (err) { next(err); }
};

export const saveSoap = async (req, res, next) => {
  try {
    const data = soapSchema.parse(req.body);
    const note = await service.saveSoapNote(req.org.id, req.params.visitId, data);
    return sendSuccess(res, note);
  } catch (err) { next(err); }
};

export const addVitals = async (req, res, next) => {
  try {
    const data = vitalsSchema.parse(req.body);
    const vitals = await service.addVitals(req.org.id, req.params.visitId, data);
    return sendSuccess(res, vitals, 'Vitals recorded', 201);
  } catch (err) { next(err); }
};

export const addDiagnosis = async (req, res, next) => {
  try {
    const data = diagnosisSchema.parse(req.body);
    const dx = await service.addDiagnosis(req.org.id, req.params.visitId, data);
    return sendSuccess(res, dx, 'Diagnosis added', 201);
  } catch (err) { next(err); }
};

export const completeVisit = async (req, res, next) => {
  try {
    const visit = await service.completeVisit(req.org.id, req.params.visitId);
    return sendSuccess(res, visit, 'Visit completed');
  } catch (err) { next(err); }
};
