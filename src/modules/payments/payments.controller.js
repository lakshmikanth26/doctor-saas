import axios from 'axios'
import { prisma } from '../../config/db.js'

const CASHFREE_BASE = process.env.CASHFREE_ENV === 'production'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg'

const CF_HEADERS = {
  'x-client-id': process.env.CASHFREE_APP_ID,
  'x-client-secret': process.env.CASHFREE_SECRET_KEY,
  'x-api-version': '2025-01-01',
  'Content-Type': 'application/json',
}

async function createCashfreeOrderPayload({ amount, appointmentId, customerName, customerPhone, customerEmail }) {
  const orderId = `APPT-${appointmentId || Date.now()}`
  const returnUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/status?order_id={order_id}&appointment_id=${appointmentId || ''}`

  const { data } = await axios.post(`${CASHFREE_BASE}/orders`, {
    order_id: orderId,
    order_amount: Number(amount),
    order_currency: 'INR',
    order_meta: { return_url: returnUrl },
    customer_details: {
      customer_id: `cust_${customerPhone}`,
      customer_phone: customerPhone,
      customer_name: customerName || undefined,
      customer_email: customerEmail || undefined,
    },
  }, { headers: CF_HEADERS })

  return {
    orderId: data.order_id,
    paymentSessionId: data.payment_session_id,
    cfOrderId: data.cf_order_id,
  }
}

export async function createCashfreeOrder(req, res) {
  try {
    const { amount, appointmentId, customerName, customerPhone, customerEmail } = req.body

    if (!amount || !customerPhone) {
      return res.status(400).json({ success: false, message: 'amount and customerPhone are required' })
    }

    const data = await createCashfreeOrderPayload({ amount, appointmentId, customerName, customerPhone, customerEmail })
    res.json({ success: true, data })
  } catch (e) {
    const msg = e.response?.data?.message || e.message
    res.status(500).json({ success: false, message: msg })
  }
}

export async function createPublicCashfreeOrder(req, res) {
  try {
    const { amount, appointmentId, customerName, customerPhone, customerEmail, orgSlug } = req.body

    if (!orgSlug) {
      return res.status(400).json({ success: false, message: 'orgSlug is required' })
    }
    if (!amount || !customerPhone || !appointmentId) {
      return res.status(400).json({ success: false, message: 'amount, appointmentId, and customerPhone are required' })
    }

    const org = await prisma.organization.findFirst({
      where: { slug: orgSlug, isActive: true },
      select: { id: true },
    })
    if (!org) {
      return res.status(404).json({ success: false, message: 'Clinic not found' })
    }

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, orgId: org.id },
      include: { patient: { select: { phone: true } } },
    })
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' })
    }

    const normalizedPhone = String(customerPhone).replace(/\D/g, '').slice(-10)
    const patientPhone = String(appointment.patient?.phone || '').replace(/\D/g, '').slice(-10)
    if (patientPhone && normalizedPhone !== patientPhone) {
      return res.status(403).json({ success: false, message: 'Phone number does not match this appointment' })
    }

    const data = await createCashfreeOrderPayload({
      amount,
      appointmentId,
      customerName,
      customerPhone,
      customerEmail,
    })
    res.json({ success: true, data })
  } catch (e) {
    const msg = e.response?.data?.message || e.message
    res.status(500).json({ success: false, message: msg })
  }
}

export async function verifyCashfreeOrder(req, res) {
  try {
    const { order_id } = req.query
    if (!order_id) return res.status(400).json({ success: false, message: 'order_id required' })

    const { data } = await axios.get(`${CASHFREE_BASE}/orders/${order_id}`, { headers: CF_HEADERS })

    res.json({
      success: true,
      data: {
        orderId: data.order_id,
        status: data.order_status,       // ACTIVE | PAID | EXPIRED
        amount: data.order_amount,
        currency: data.order_currency,
      },
    })
  } catch (e) {
    const msg = e.response?.data?.message || e.message
    res.status(500).json({ success: false, message: msg })
  }
}
