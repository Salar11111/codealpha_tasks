import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import app from '../index.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

let adminEmail;
let shopperEmail;
let productId;
const orderIds = [];

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  if (orderIds.length) await Order.deleteMany({ _id: { $in: orderIds } });
  if (productId) await Product.deleteOne({ _id: productId });
  if (adminEmail) await User.deleteOne({ email: adminEmail });
  if (shopperEmail) await User.deleteOne({ email: shopperEmail });
  await mongoose.connection.close();
});

test('admin APIs enforce roles, validate input, and paginate orders', async () => {
  const stamp = Date.now();
  adminEmail = `admin-${stamp}@example.com`;
  shopperEmail = `shopper-${stamp}@example.com`;
  const password = 'password123';

  await User.create({
    name: 'Admin User',
    email: adminEmail,
    password: await bcrypt.hash(password, 4),
    role: 'admin',
  });
  const shopper = await User.create({
    name: 'Shopper User',
    email: shopperEmail,
    password: await bcrypt.hash(password, 4),
  });

  const adminAgent = request.agent(app);
  const adminLogin = await adminAgent.post('/api/auth/login').send({ email: adminEmail, password });
  expect(adminLogin.status).toBe(200);
  expect(adminLogin.body.token).toBeUndefined();
  expect(adminLogin.headers['set-cookie']?.[0]).toMatch(/HttpOnly/i);

  const shopperAgent = request.agent(app);
  const shopperLogin = await shopperAgent.post('/api/auth/login').send({ email: shopperEmail, password });
  expect(shopperLogin.status).toBe(200);

  const created = await adminAgent.post('/api/admin/products').send({
    name: 'Admin Test Lamp',
    description: 'A lamp created by the admin test',
    category: 'Home',
    image: 'https://example.com/lamp.png',
    price: 24,
    stock: 10,
  });
  expect(created.status).toBe(201);
  productId = created.body.product._id;

  const invalidProduct = await adminAgent.post('/api/admin/products').send({
    name: 'Broken Lamp',
    description: 'Missing a category',
    image: 'https://example.com/broken.png',
    price: 10,
    stock: 1,
  });
  expect(invalidProduct.status).toBe(400);

  for (let index = 0; index < 3; index += 1) {
    const order = await Order.create({
      user: shopper._id,
      items: [{ product: productId, name: 'Admin Test Lamp', price: 24, qty: 1 }],
      total: 24,
      shippingAddress: { fullName: 'Shopper User', line1: '1 Test St', city: 'Testville', postalCode: '12345' },
      status: 'pending',
    });
    orderIds.push(order._id);
  }

  const forbiddenList = await shopperAgent.get('/api/orders/all');
  expect(forbiddenList.status).toBe(403);

  const allOrders = await adminAgent.get('/api/orders/all?limit=100');
  expect(allOrders.status).toBe(200);
  expect(allOrders.body.orders.filter((order) => order.user?.email === shopperEmail)).toHaveLength(3);
  expect(allOrders.body.orders[0].user).toHaveProperty('name');

  const total = allOrders.body.total;
  const page = await adminAgent.get('/api/orders/all?page=2&limit=2');
  expect(page.status).toBe(200);
  expect(page.body.total).toBe(total);
  expect(page.body.perPage).toBe(2);
  expect(page.body.pages).toBe(Math.ceil(total / 2));
  expect(page.body.orders).toHaveLength(Math.min(2, Math.max(0, total - 2)));

  const forbiddenShip = await shopperAgent
    .patch(`/api/orders/${orderIds[0]}/status`)
    .send({ status: 'shipped' });
  expect(forbiddenShip.status).toBe(403);

  const shipped = await adminAgent.patch(`/api/orders/${orderIds[0]}/status`).send({ status: 'shipped' });
  expect(shipped.status).toBe(200);
  expect(shipped.body.order.status).toBe('shipped');

  const invalidRestock = await adminAgent.post(`/api/admin/products/${productId}/restock`).send({ qty: 0 });
  expect(invalidRestock.status).toBe(400);

  const restocked = await adminAgent.post(`/api/admin/products/${productId}/restock`).send({ qty: 5 });
  expect(restocked.status).toBe(200);
  expect(restocked.body.newStock).toBe(15);
}, 20000);

test('registration rejects invalid input and duplicate emails', async () => {
  const invalidEmail = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Bad Email', email: 'not-an-email', password: 'password123' });
  expect(invalidEmail.status).toBe(400);

  const shortPassword = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Short Password', email: `short-${Date.now()}@example.com`, password: '123' });
  expect(shortPassword.status).toBe(400);

  const duplicate = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Duplicate', email: adminEmail, password: 'password123' });
  expect(duplicate.status).toBe(409);
});
