import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { tenantContext } from '../../middleware/tenantContext.js'
import { createCashfreeOrder, createPublicCashfreeOrder, verifyCashfreeOrder } from './payments.controller.js'

const router = Router()

// Public portal — no auth; validates orgSlug + appointment ownership
router.post('/cashfree/public/create-order', createPublicCashfreeOrder)

// Create order — called just before launching Cashfree checkout (staff dashboard)
router.post('/cashfree/create-order', authenticate, tenantContext, createCashfreeOrder)

// Webhook / return-url verification (no auth — called by Cashfree redirect)
router.get('/cashfree/verify', verifyCashfreeOrder)

export default router
