import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { tenantContext } from '../../middleware/tenantContext.js'
import { listFees, listPublicFees, createFee, updateFee, deleteFee } from './fees.controller.js'

const router = Router()

// Public — used by patient portal (no auth)
router.get('/public', listPublicFees)

router.use(authenticate, tenantContext)
router.get('/', listFees)
router.post('/', createFee)
router.put('/:id', updateFee)
router.delete('/:id', deleteFee)

export default router
