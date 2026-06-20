import { Router } from 'express';
import { createVisit, getVisit, saveSoap, addVitals, addDiagnosis, completeVisit } from './emr.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { tenantContext } from '../../middleware/tenantContext.js';

const router = Router();
router.use(authenticate, tenantContext);

router.post('/appointments/:appointmentId/visit', createVisit);
router.get('/visits/:visitId', getVisit);
router.put('/visits/:visitId/soap', saveSoap);
router.post('/visits/:visitId/vitals', addVitals);
router.post('/visits/:visitId/diagnoses', addDiagnosis);
router.patch('/visits/:visitId/complete', completeVisit);

export default router;
