import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/db.js';
import {
  connectDb,
  disconnectDb,
  cleanupTestOrg,
  authHeader,
  testEmail,
  testPassword,
  uniqueSlug,
  isDbAvailable,
} from './helpers.js';

const dbTest = await isDbAvailable();
if (!dbTest) {
  console.warn('\n⚠️  Database unreachable — skipping integration tests. Run with a live DATABASE_URL to execute the full suite.\n');
}

describe('ClinicOS API integration', { skip: !dbTest }, () => {
  let accessToken;
  let refreshToken;
  let orgId;
  let orgSlug;
  let branchId;
  let userId;
  let patientId;
  let appointmentId;
  let visitId;
  let invoiceId;
  let inventoryItemId;
  let prescriptionId;
  let crmLeadId;

  before(async () => {
    await connectDb();
    await cleanupTestOrg();
  });

  after(async () => {
    await cleanupTestOrg();
    await disconnectDb();
  });

  // ── Health ──────────────────────────────────────────────────────────────

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

  // ── Auth ────────────────────────────────────────────────────────────────

  it('POST /api/v1/auth/register creates org and tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        firstName: 'API',
        lastName: 'Tester',
        email: testEmail,
        password: testPassword,
        orgName: `Test Clinic ${uniqueSlug('org')}`,
        clinicType: 'HUMAN_GENERAL',
        phone: '+919999999999',
      });

    assert.equal(res.status, 201, res.body.message);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.accessToken);
    assert.ok(res.body.data.refreshToken);
    assert.ok(res.body.data.org?.id);

    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
    orgId = res.body.data.org.id;
    orgSlug = res.body.data.org.slug;
  });

  it('POST /api/v1/auth/login returns tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: testPassword });

    assert.equal(res.status, 200);
    assert.ok(res.body.data.accessToken);
    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('GET /api/v1/auth/me returns user and org', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.email, testEmail);
    assert.ok(res.body.data.org);
    userId = res.body.data.user.id;

    const branch = await prisma.branch.findFirst({ where: { orgId } });
    branchId = branch.id;
  });

  it('POST /api/v1/auth/refresh rotates tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    assert.equal(res.status, 200);
    assert.ok(res.body.data.accessToken);
    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/v1/patients');
    assert.equal(res.status, 401);
  });

  // ── Patients ────────────────────────────────────────────────────────────

  it('POST /api/v1/patients creates a patient', async () => {
    const res = await request(app)
      .post('/api/v1/patients')
      .set(authHeader(accessToken))
      .send({ firstName: 'John', lastName: 'Doe', phone: '+911234567890', gender: 'MALE' });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.ok(res.body.data.id);
    assert.ok(res.body.data.mrn);
    patientId = res.body.data.id;
  });

  it('GET /api/v1/patients lists patients', async () => {
    const res = await request(app)
      .get('/api/v1/patients')
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
    assert.ok(res.body.data.patients.length >= 1);
  });

  it('GET /api/v1/patients/:id returns patient', async () => {
    const res = await request(app)
      .get(`/api/v1/patients/${patientId}`)
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, patientId);
  });

  it('PUT /api/v1/patients/:id updates patient', async () => {
    const res = await request(app)
      .put(`/api/v1/patients/${patientId}`)
      .set(authHeader(accessToken))
      .send({ city: 'Mumbai' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.city, 'Mumbai');
  });

  it('GET /api/v1/patients/:id/timeline returns timeline', async () => {
    const res = await request(app)
      .get(`/api/v1/patients/${patientId}/timeline`)
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
  });

  it('GET /api/v1/patients/lookup finds patient by phone', async () => {
    const res = await request(app)
      .get('/api/v1/patients/lookup')
      .query({ phone: '1234567890' })
      .set(authHeader(accessToken));

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok(res.body.data.patients.length >= 1);
    assert.equal(res.body.data.patients[0].id, patientId);
  });

  // ── Appointments ────────────────────────────────────────────────────────

  it('GET /api/v1/appointments/slots returns availability', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().split('T')[0];

    const res = await request(app)
      .get('/api/v1/appointments/slots')
      .query({ providerId: userId, branchId, date })
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
  });

  it('POST /api/v1/appointments books appointment by phone', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const res = await request(app)
      .post('/api/v1/appointments')
      .set(authHeader(accessToken))
      .send({
        branchId,
        patientPhone: '+911234567890',
        providerId: userId,
        scheduledAt: tomorrow.toISOString(),
        chiefComplaint: 'Routine checkup',
      });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    appointmentId = res.body.data.id;
  });

  it('GET /api/v1/appointments lists appointments', async () => {
    const res = await request(app)
      .get('/api/v1/appointments')
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
    assert.ok(res.body.data.appointments.length >= 1);
  });

  it('GET /api/v1/appointments/queue returns live queue', async () => {
    const res = await request(app)
      .get('/api/v1/appointments/queue')
      .query({ branchId })
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
  });

  it('PATCH /api/v1/appointments/:id/status updates status', async () => {
    const res = await request(app)
      .patch(`/api/v1/appointments/${appointmentId}/status`)
      .set(authHeader(accessToken))
      .send({ status: 'CHECKED_IN' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'CHECKED_IN');
  });

  // ── EMR ─────────────────────────────────────────────────────────────────

  it('POST /api/v1/emr/appointments/:id/visit creates visit', async () => {
    const res = await request(app)
      .post(`/api/v1/emr/appointments/${appointmentId}/visit`)
      .set(authHeader(accessToken))
      .send({ chiefComplaint: 'Fever' });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    visitId = res.body.data.id;
  });

  it('GET /api/v1/emr/visits/:id returns visit', async () => {
    const res = await request(app)
      .get(`/api/v1/emr/visits/${visitId}`)
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, visitId);
  });

  it('PUT /api/v1/emr/visits/:id/soap saves SOAP note', async () => {
    const res = await request(app)
      .put(`/api/v1/emr/visits/${visitId}/soap`)
      .set(authHeader(accessToken))
      .send({ subjective: 'Patient reports fever', assessment: 'Viral infection' });

    assert.equal(res.status, 200);
  });

  it('POST /api/v1/emr/visits/:id/vitals records vitals', async () => {
    const res = await request(app)
      .post(`/api/v1/emr/visits/${visitId}/vitals`)
      .set(authHeader(accessToken))
      .send({ tempCelsius: 38.5, pulse: 88 });

    assert.equal(res.status, 201);
  });

  it('POST /api/v1/emr/visits/:id/diagnoses adds diagnosis', async () => {
    const res = await request(app)
      .post(`/api/v1/emr/visits/${visitId}/diagnoses`)
      .set(authHeader(accessToken))
      .send({ description: 'Acute viral fever', type: 'PRIMARY' });

    assert.equal(res.status, 201);
  });

  // ── Prescriptions ───────────────────────────────────────────────────────

  it('POST /api/v1/prescriptions creates prescription', async () => {
    const res = await request(app)
      .post('/api/v1/prescriptions')
      .set(authHeader(accessToken))
      .send({
        visitId,
        items: [{ drugName: 'Paracetamol 500mg', dosage: '500mg', frequency: 'TID', durationDays: 3 }],
      });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    prescriptionId = res.body.data.id;
  });

  it('GET /api/v1/prescriptions lists prescriptions', async () => {
    const res = await request(app)
      .get('/api/v1/prescriptions')
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
    assert.ok(res.body.data.prescriptions.length >= 1);
  });

  it('GET /api/v1/prescriptions/:id returns prescription', async () => {
    const res = await request(app)
      .get(`/api/v1/prescriptions/${prescriptionId}`)
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
  });

  it('PATCH /api/v1/prescriptions/:id/status updates status', async () => {
    const res = await request(app)
      .patch(`/api/v1/prescriptions/${prescriptionId}/status`)
      .set(authHeader(accessToken))
      .send({ status: 'DISPENSED' });

    assert.equal(res.status, 200);
  });

  // ── Billing ─────────────────────────────────────────────────────────────

  it('POST /api/v1/billing creates invoice', async () => {
    const res = await request(app)
      .post('/api/v1/billing')
      .set(authHeader(accessToken))
      .send({
        branchId,
        patientId,
        visitId,
        items: [{ description: 'Consultation', quantity: 1, unitPrice: 500 }],
      });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    invoiceId = res.body.data.id;
  });

  it('GET /api/v1/billing lists invoices', async () => {
    const res = await request(app)
      .get('/api/v1/billing')
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
    assert.ok(res.body.data.invoices.length >= 1);
  });

  it('GET /api/v1/billing/stats returns dashboard stats', async () => {
    const res = await request(app)
      .get('/api/v1/billing/stats')
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
    assert.ok('todayRevenue' in res.body.data);
  });

  it('GET /api/v1/billing/:id returns invoice', async () => {
    const res = await request(app)
      .get(`/api/v1/billing/${invoiceId}`)
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
  });

  it('POST /api/v1/billing/:id/payments records payment', async () => {
    const res = await request(app)
      .post(`/api/v1/billing/${invoiceId}/payments`)
      .set(authHeader(accessToken))
      .send({ amount: 500, method: 'CASH' });

    assert.equal(res.status, 201);
  });

  // ── Inventory ─────────────────────────────────────────────────────────────

  it('POST /api/v1/inventory creates item', async () => {
    const res = await request(app)
      .post('/api/v1/inventory')
      .set(authHeader(accessToken))
      .send({
        branchId,
        itemName: 'Test Medicine',
        quantity: 100,
        reorderLevel: 10,
        unitCost: 50,
        sellingPrice: 75,
      });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    inventoryItemId = res.body.data.id;
  });

  it('GET /api/v1/inventory lists items', async () => {
    const res = await request(app)
      .get('/api/v1/inventory')
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
    assert.ok(res.body.data.items.length >= 1);
  });

  it('GET /api/v1/inventory/low-stock returns alerts', async () => {
    const res = await request(app)
      .get('/api/v1/inventory/low-stock')
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
  });

  it('POST /api/v1/inventory/:id/adjust adjusts stock', async () => {
    const res = await request(app)
      .post(`/api/v1/inventory/${inventoryItemId}/adjust`)
      .set(authHeader(accessToken))
      .send({ type: 'OUT', quantity: 5, notes: 'Test dispense' });

    assert.equal(res.status, 201);
  });

  it('GET /api/v1/inventory/:id/transactions lists transactions', async () => {
    const res = await request(app)
      .get(`/api/v1/inventory/${inventoryItemId}/transactions`)
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
    assert.ok(res.body.data.transactions.length >= 1);
  });

  // ── Staff ───────────────────────────────────────────────────────────────

  it('GET /api/v1/staff lists staff', async () => {
    const res = await request(app)
      .get('/api/v1/staff')
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
    assert.ok(res.body.data.staff.length >= 1);
  });

  it('GET /api/v1/staff/:id returns staff member', async () => {
    const res = await request(app)
      .get(`/api/v1/staff/${userId}`)
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
  });

  it('GET /api/v1/staff/attendance returns attendance (not conflated with :id)', async () => {
    const res = await request(app)
      .get('/api/v1/staff/attendance')
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
    assert.ok('records' in res.body.data);
  });

  it('POST /api/v1/staff/attendance records attendance', async () => {
    const res = await request(app)
      .post('/api/v1/staff/attendance')
      .set(authHeader(accessToken))
      .send({
        branchId,
        date: new Date().toISOString().split('T')[0],
        checkIn: new Date().toISOString(),
      });

    assert.equal(res.status, 201);
  });

  it('GET /api/v1/staff/leave/requests lists leave requests', async () => {
    const res = await request(app)
      .get('/api/v1/staff/leave/requests')
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
    assert.ok('leaves' in res.body.data);
  });

  // ── Website ─────────────────────────────────────────────────────────────

  it('PUT /api/v1/website upserts website config', async () => {
    const res = await request(app)
      .put('/api/v1/website')
      .set(authHeader(accessToken))
      .send({ heroTitle: 'Welcome to Test Clinic', about: 'We care.' });

    assert.equal(res.status, 200);
  });

  it('GET /api/v1/website returns website config', async () => {
    const res = await request(app)
      .get('/api/v1/website')
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
  });

  it('PUT /api/v1/website/pages/:slug upserts page', async () => {
    const res = await request(app)
      .put('/api/v1/website/pages/about')
      .set(authHeader(accessToken))
      .send({ title: 'About Us', contentJson: { blocks: [] }, isPublished: true });

    assert.equal(res.status, 200);
  });

  it('POST /api/v1/website/publish publishes website', async () => {
    const res = await request(app)
      .post('/api/v1/website/publish')
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
  });

  it('GET /api/v1/website/public/:orgSlug returns public site', async () => {
    const res = await request(app).get(`/api/v1/website/public/${orgSlug}`);
    assert.equal(res.status, 200);
  });

  // ── AI Receptionist ─────────────────────────────────────────────────────

  it('POST /api/v1/ai/:orgSlug/session creates chat session', async () => {
    await prisma.aIReceptionist.upsert({
      where: { orgId },
      create: { orgId, personaName: 'Test Bot', isActive: true },
      update: { isActive: true },
    });

    const res = await request(app)
      .post(`/api/v1/ai/${orgSlug}/session`)
      .send({ patientName: 'Guest', patientPhone: '+911111111111' });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.ok(res.body.data.id);
  });

  // ── CRM (system role required) ──────────────────────────────────────────

  it('CRM endpoints require system role', async () => {
    const res = await request(app)
      .get('/api/v1/crm')
      .set(authHeader(accessToken));

    assert.equal(res.status, 403);
  });

  it('CRM endpoints work for system admin', async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { systemRole: 'SYSTEM_ADMIN' },
    });

    const createRes = await request(app)
      .post('/api/v1/crm')
      .set(authHeader(accessToken))
      .send({ clinicName: 'Prospect Clinic', city: 'Delhi', source: 'WEB' });

    assert.equal(createRes.status, 201, JSON.stringify(createRes.body));
    crmLeadId = createRes.body.data.id;

    const listRes = await request(app)
      .get('/api/v1/crm')
      .set(authHeader(accessToken));

    assert.equal(listRes.status, 200);
    assert.ok(listRes.body.data.leads.length >= 1);

    const statsRes = await request(app)
      .get('/api/v1/crm/stats')
      .set(authHeader(accessToken));

    assert.equal(statsRes.status, 200);

    const getRes = await request(app)
      .get(`/api/v1/crm/${crmLeadId}`)
      .set(authHeader(accessToken));

    assert.equal(getRes.status, 200);

    const activityRes = await request(app)
      .post(`/api/v1/crm/${crmLeadId}/activities`)
      .set(authHeader(accessToken))
      .send({ type: 'CALL', notes: 'Initial outreach' });

    assert.equal(activityRes.status, 201);
  });

  // ── EMR complete + Auth logout ──────────────────────────────────────────

  it('PATCH /api/v1/emr/visits/:id/complete closes visit', async () => {
    const res = await request(app)
      .patch(`/api/v1/emr/visits/${visitId}/complete`)
      .set(authHeader(accessToken));

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'CLOSED');
  });

  it('POST /api/v1/auth/logout invalidates refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken });

    assert.equal(res.status, 200);
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    assert.equal(res.status, 404);
  });
});
