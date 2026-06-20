import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('API smoke tests (no database required)', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.ok(res.body.ts);
  });

  it('protected routes return 401 without token', async () => {
    const endpoints = [
      '/api/v1/patients',
      '/api/v1/appointments',
      '/api/v1/billing',
      '/api/v1/emr/visits/00000000-0000-0000-0000-000000000000',
      '/api/v1/inventory',
      '/api/v1/prescriptions',
      '/api/v1/staff',
      '/api/v1/website',
      '/api/v1/crm',
    ];

    for (const path of endpoints) {
      const res = await request(app).get(path);
      assert.equal(res.status, 401, `${path} should require auth`);
      assert.equal(res.body.success, false);
    }
  });

  it('POST /api/v1/auth/register validates input', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'short' });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('POST /api/v1/auth/login validates input', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'bad', password: '' });

    assert.equal(res.status, 400);
  });

  it('POST /api/v1/auth/refresh requires refresh token', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({});
    assert.equal(res.status, 400);
    assert.match(res.body.message, /refresh token/i);
  });

  it('unknown routes return 404', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  it('all architecture route prefixes are mounted', async () => {
    const routes = [
      { method: 'post', path: '/api/v1/auth/login' },
      { method: 'get', path: '/api/v1/patients' },
      { method: 'get', path: '/api/v1/appointments' },
      { method: 'get', path: '/api/v1/emr/visits/00000000-0000-0000-0000-000000000000' },
      { method: 'get', path: '/api/v1/billing' },
      { method: 'get', path: '/api/v1/inventory' },
      { method: 'get', path: '/api/v1/prescriptions' },
      { method: 'get', path: '/api/v1/staff' },
      { method: 'get', path: '/api/v1/website' },
      { method: 'get', path: '/api/v1/crm' },
      { method: 'post', path: '/api/v1/ai/test-clinic/session', body: {} },
    ];

    for (const { method, path, body } of routes) {
      const req = request(app)[method](path).set('Accept', 'application/json');
      const res = body !== undefined ? await req.send(body) : await req;
      const unmounted = res.status === 404 && String(res.body?.message || '').startsWith('Route ');
      assert.ok(!unmounted, `${method.toUpperCase()} ${path} should be mounted (got ${res.status})`);
    }
  });
});
