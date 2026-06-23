import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import patientRoutes from '../modules/patients/patients.routes.js';
import appointmentRoutes from '../modules/appointments/appointments.routes.js';
import emrRoutes from '../modules/emr/emr.routes.js';
import billingRoutes from '../modules/billing/billing.routes.js';
import aiRoutes from '../modules/ai-receptionist/ai.routes.js';
import crmRoutes from '../modules/crm/crm.routes.js';
import inventoryRoutes from '../modules/inventory/inventory.routes.js';
import prescriptionRoutes from '../modules/prescriptions/prescriptions.routes.js';
import staffRoutes from '../modules/staff/staff.routes.js';
import websiteRoutes from '../modules/website/website.routes.js';
import paymentRoutes from '../modules/payments/payments.routes.js';
import feeRoutes from '../modules/fees/fees.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/payments', paymentRoutes);
router.use('/fees', feeRoutes);
router.use('/patients', patientRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/emr', emrRoutes);
router.use('/billing', billingRoutes);
router.use('/ai', aiRoutes);
router.use('/crm', crmRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/prescriptions', prescriptionRoutes);
router.use('/staff', staffRoutes);
router.use('/website', websiteRoutes);

export default router;
