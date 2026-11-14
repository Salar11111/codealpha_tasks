import mongoose from 'mongoose';
import request from 'supertest';
import app from '../index.js';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

let productId;
let email;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const product = await Product.create({
    name: 'Test Mug',
    description: 'A mug for testing',
    price: 12,
    image: 'https://example.com/mug.png',
    category: 'Home',
    stock: 5,
    active: true,
  });
  productId = product._id.toString();
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

test('add to cart and place an order', async () => {
  email = `test-${Date.now()}@example.com`;
  const agent = request.agent(app);

  await agent.post('/api/auth/register').send({ name: 'Test User', email, password: 'password123' });

  const add = await agent.post('/api/cart').send({ productId, qty: 1, mode: 'add' });
  expect(add.status).toBe(200);

  const order = await agent.post('/api/orders').send({
    fullName: 'Test User',
    line1: '1 Test St',
    city: 'Testville',
    postalCode: '12345',
  });
  expect(order.status).toBe(201);
  expect(order.body.order.items).toHaveLength(1);

  const orders = await agent.get('/api/orders');
  expect(orders.status).toBe(200);
  expect(orders.body.orders).toHaveLength(1);
}, 15000);