import request from 'supertest';
import app from '../index.js';

test('GET /api/health returns ok', async () => {
  const response = await request(app).get('/api/health');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ ok: true });
});