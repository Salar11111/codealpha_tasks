import mongoose from 'mongoose';
import request from 'supertest';
import app from '../index.js';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

let productId;
let variantId;
let email;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const stamp = Date.now();
  const product = await Product.create({
    name: 'Test Overshirt',
    slug: `test-overshirt-${stamp}`,
    brand: 'Atelier & Oak',
    department: 'Clothing',
    category: 'Jackets',
    description: 'A jacket for testing checkout.',
    price: 12000,
    images: ['/products/jackets-1.jpg'],
    variants: [
      { size: 'M', color: 'Black', colorHex: '#1c1c1c', stock: 5 },
      { size: 'L', color: 'Black', colorHex: '#1c1c1c', stock: 2 },
    ],
    active: true,
  });
  productId = product._id.toString();
  variantId = product.variants[0]._id.toString();
});

afterAll(async () => {
  if (email) {
    const user = await User.findOne({ email }).select('_id');
    if (user) {
      await Promise.all([
        Cart.deleteOne({ user: user._id }),
        Order.deleteMany({ user: user._id }),
        User.deleteOne({ _id: user._id }),
      ]);
    }
  }
  if (productId) await Product.deleteOne({ _id: productId });
  await mongoose.connection.close();
});

test('add a variant to the cart and place a paid order', async () => {
  email = `order-${Date.now()}@example.com`;
  const agent = request.agent(app);

  await agent.post('/api/auth/register').send({ name: 'Test User', email, password: 'password123' });

  const add = await agent.post('/api/cart').send({ productId, variantId, qty: 1, mode: 'add' });
  expect(add.status).toBe(200);
  expect(add.body.cart.items).toHaveLength(1);
  expect(add.body.summary).toMatchObject({ subtotal: 12000, shipping: 0, tax: 960, total: 12960 });

  const tooMany = await agent.post('/api/cart').send({ productId, variantId, qty: 9, mode: 'set' });
  expect(tooMany.status).toBe(400);
  expect(tooMany.body.message).toMatch(/Only 5 left/);

  const order = await agent.post('/api/orders').send({
    fullName: 'Test User',
    line1: '1 Test St',
    city: 'Testville',
    postalCode: '12345',
    country: 'United States',
  });
  expect(order.status).toBe(201);
  expect(order.body.order.status).toBe('paid');
  expect(order.body.order.subtotal).toBe(12000);
  expect(order.body.order.total).toBe(12960);
  expect(order.body.order.items).toHaveLength(1);
  expect(order.body.order.items[0]).toMatchObject({ size: 'M', color: 'Black', price: 12000, qty: 1 });
  expect(order.body.order.shippingAddress.city).toBe('Testville');

  const single = await agent.get(`/api/orders/${order.body.order._id}`);
  expect(single.status).toBe(200);
  expect(single.body.order.orderNumber).toMatch(/^AO-/);

  const orders = await agent.get('/api/orders');
  expect(orders.status).toBe(200);
  expect(orders.body.orders).toHaveLength(1);

  const freshProduct = await Product.findById(productId);
  expect(freshProduct.variants.id(variantId).stock).toBe(4);

  const cart = await agent.get('/api/cart');
  expect(cart.body.cart.items).toHaveLength(0);
}, 20000);

test('merge a guest cart and reject checkout with an empty cart', async () => {
  email = `merge-${Date.now()}@example.com`;
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ name: 'Merge User', email, password: 'password123' });

  const merged = await agent
    .post('/api/cart/merge')
    .send({ items: [{ productId, variantId, qty: 2 }, { productId: 'not-an-id', qty: 1 }] });
  expect(merged.status).toBe(200);
  expect(merged.body.cart.items).toHaveLength(1);
  expect(merged.body.summary.subtotal).toBe(24000);

  const cleared = await agent.delete('/api/cart');
  expect(cleared.status).toBe(200);
  expect(cleared.body.cart.items).toHaveLength(0);

  const emptyOrder = await agent.post('/api/orders').send({
    fullName: 'Merge User',
    line1: '2 Test St',
    city: 'Testville',
    postalCode: '12345',
  });
  expect(emptyOrder.status).toBe(400);
  expect(emptyOrder.body.message).toMatch(/empty/i);
}, 20000);
