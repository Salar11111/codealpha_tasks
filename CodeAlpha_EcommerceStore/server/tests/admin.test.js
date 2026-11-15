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
let variantId;
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
    name: 'Admin Test Jacket',
    description: 'A jacket created by the admin test',
    department: 'Clothing',
    category: 'Jackets',
    brand: 'Atelier Workshop',
    price: 24000,
    compareAtPrice: 30000,
    images: ['/products/jackets-1.jpg', '/products/jackets-2.jpg'],
    variants: [
      { size: 'M', color: 'Olive', stock: 10 },
      { size: 'L', color: 'Olive', stock: 5 },
    ],
  });
  expect(created.status).toBe(201);
  productId = created.body.product._id;
  variantId = created.body.product.variants[0]._id;
  expect(created.body.product.slug).toBe('admin-test-jacket');
  expect(created.body.product.totalStock).toBe(15);
  expect(created.body.product.colors).toEqual([{ name: 'Olive', hex: '#5a6240' }]);

  const invalidProduct = await adminAgent.post('/api/admin/products').send({
    name: 'Broken Jacket',
    description: 'Missing a category',
    department: 'Clothing',
    images: ['/products/jackets-3.jpg'],
    price: 1000,
  });
  expect(invalidProduct.status).toBe(400);

  const invalidPrice = await adminAgent.patch(`/api/admin/products/${productId}`).send({ price: 12.5 });
  expect(invalidPrice.status).toBe(400);

  const updated = await adminAgent
    .patch(`/api/admin/products/${productId}`)
    .send({ featured: true, price: 26000 });
  expect(updated.status).toBe(200);
  expect(updated.body.product.featured).toBe(true);
  expect(updated.body.product.price).toBe(26000);

  for (let index = 0; index < 3; index += 1) {
    const order = await Order.create({
      orderNumber: `AO-TEST${stamp}${index}`,
      user: shopper._id,
      items: [
        {
          product: productId,
          variantId,
          name: 'Admin Test Jacket',
          price: 26000,
          qty: 1,
          size: 'M',
          color: 'Olive',
        },
      ],
      subtotal: 26000,
      shipping: 0,
      tax: 2080,
      total: 28080,
      shippingAddress: { fullName: 'Shopper User', line1: '1 Test St', city: 'Testville', postalCode: '12345' },
      status: 'paid',
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

  const filtered = await adminAgent.get('/api/orders/all?status=paid&limit=100');
  expect(filtered.status).toBe(200);
  expect(filtered.body.orders.every((order) => order.status === 'paid')).toBe(true);

  const stats = await adminAgent.get('/api/admin/stats');
  expect(stats.status).toBe(200);
  expect(stats.body.stats.orders).toBeGreaterThanOrEqual(3);
  expect(stats.body.stats.revenue).toBeGreaterThanOrEqual(3 * 28080);
  expect(stats.body.stats.ordersByStatus.paid).toBeGreaterThanOrEqual(3);
  expect(stats.body.stats.lowStock).toBeGreaterThanOrEqual(0);
  expect(Array.isArray(stats.body.recentOrders)).toBe(true);

  const forbiddenShip = await shopperAgent
    .patch(`/api/orders/${orderIds[0]}/status`)
    .send({ status: 'shipped' });
  expect(forbiddenShip.status).toBe(403);

  const invalidStatus = await adminAgent
    .patch(`/api/orders/${orderIds[0]}/status`)
    .send({ status: 'refunded' });
  expect(invalidStatus.status).toBe(400);

  const shipped = await adminAgent.patch(`/api/orders/${orderIds[0]}/status`).send({ status: 'shipped' });
  expect(shipped.status).toBe(200);
  expect(shipped.body.order.status).toBe('shipped');

  const invalidRestock = await adminAgent.post(`/api/admin/products/${productId}/restock`).send({ qty: 0 });
  expect(invalidRestock.status).toBe(400);

  const restocked = await adminAgent
    .post(`/api/admin/products/${productId}/restock`)
    .send({ qty: 5, variantId });
  expect(restocked.status).toBe(200);
  expect(restocked.body.newStock).toBe(15);
  expect(restocked.body.qtyAdded).toBe(5);

  const removed = await adminAgent.delete(`/api/admin/products/${productId}`);
  expect(removed.status).toBe(200);
  expect(await Product.findById(productId)).toBeNull();
  productId = null;
}, 30000);

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
