import mongoose from 'mongoose';
import request from 'supertest';
import app from '../index.js';
import User from '../models/User.js';

let email;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  if (email) await User.deleteOne({ email });
  await mongoose.connection.close();
});

test('register, login, and read current user via cookie', async () => {
  email = `test-${Date.now()}@example.com`;
  const username = `user${Date.now()}`;
  const agent = request.agent(app);

  const registered = await agent
    .post('/api/auth/register')
    .send({ name: 'Test User', username, email, password: 'password123' });
  expect(registered.status).toBe(201);
  expect(registered.body.user.email).toBe(email);

  const me = await agent.get('/api/auth/me');
  expect(me.status).toBe(200);
  expect(me.body.user.email).toBe(email);
}, 15000);