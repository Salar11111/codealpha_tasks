import mongoose from 'mongoose';
import request from 'supertest';
import app from '../index.js';
import Post from '../models/Post.js';
import User from '../models/User.js';

let email;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  if (email) {
    const user = await User.findOne({ email }).select('_id');
    if (user) {
      await Promise.all([Post.deleteMany({ author: user._id }), User.deleteOne({ _id: user._id })]);
    }
  }
  await mongoose.connection.close();
});

test('create a post and read it in the feed', async () => {
  email = `test-${Date.now()}@example.com`;
  const username = `user${Date.now()}`;
  const agent = request.agent(app);

  await agent.post('/api/auth/register').send({ name: 'Test User', username, email, password: 'password123' });
  const created = await agent.post('/api/posts').send({ text: 'Hello Lumen' });
  expect(created.status).toBe(201);
  expect(created.body.post.text).toBe('Hello Lumen');

  const feed = await agent.get('/api/posts/feed');
  expect(feed.status).toBe(200);
  expect(feed.body.posts.some((post) => post.text === 'Hello Lumen')).toBe(true);
}, 15000);