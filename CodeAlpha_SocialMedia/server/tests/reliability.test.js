import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../index.js';
import Follow from '../models/Follow.js';
import Notification from '../models/Notification.js';
import Post from '../models/Post.js';
import User from '../models/User.js';

let authorEmail;
let followerEmail;
let targetEmail;
let authorId;
let followerId;
let targetId;
let postId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  if (authorId && followerId) {
    await Promise.all([
      Follow.deleteMany({ $or: [{ follower: followerId }, { following: authorId }] }),
      Notification.deleteMany({ $or: [{ recipient: authorId }, { recipient: targetId }, { actor: followerId }] }),
    ]);
  }
  if (postId) await Post.deleteOne({ _id: postId });
  if (authorEmail) await User.deleteOne({ email: authorEmail });
  if (followerEmail) await User.deleteOne({ email: followerEmail });
  if (targetEmail) await User.deleteOne({ email: targetEmail });
  await mongoose.connection.close();
});

test('concurrent like toggles stay consistent and duplicate follows do not duplicate notifications', async () => {
  const stamp = Date.now();
  const usernameSuffix = stamp.toString().slice(-12);
  authorEmail = `author-${stamp}@example.com`;
  followerEmail = `follower-${stamp}@example.com`;
  const authorAgent = request.agent(app);
  const followerAgent = request.agent(app);

  const author = await authorAgent.post('/api/auth/register').send({
    name: 'Post Author',
    username: `author${usernameSuffix}`,
    email: authorEmail,
    password: 'password123',
  });
  expect(author.status).toBe(201);
  authorId = author.body.user.id;

  const follower = await followerAgent.post('/api/auth/register').send({
    name: 'Post Follower',
    username: `follower${usernameSuffix}`,
    email: followerEmail,
    password: 'password123',
  });
  expect(follower.status).toBe(201);
  followerId = follower.body.user.id;

  const createdPost = await authorAgent.post('/api/posts').send({ text: 'Atomic likes' });
  expect(createdPost.status).toBe(201);
  postId = createdPost.body.post._id;

  const toggles = await Promise.all([
    followerAgent.post(`/api/posts/${postId}/like`),
    followerAgent.post(`/api/posts/${postId}/like`),
  ]);
  expect(toggles.map((response) => response.status)).toEqual([200, 200]);
  const post = await Post.findById(postId);
  expect(post.likes.some((id) => id.toString() === followerId)).toBe(false);

  targetEmail = `target-${stamp}@example.com`;
  const targetAgent = request.agent(app);
  const target = await targetAgent.post('/api/auth/register').send({
    name: 'Follow Target',
    username: `target${usernameSuffix}`,
    email: targetEmail,
    password: 'password123',
  });
  expect(target.status).toBe(201);
  targetId = target.body.user.id;

  const createFollow = jest.spyOn(Follow, 'create').mockRejectedValueOnce(new Error('Follow write failed'));
  try {
    const failedFollow = await followerAgent.post(`/api/users/${targetId}/follow`);
    expect(failedFollow.status).toBe(500);
  } finally {
    createFollow.mockRestore();
  }
  expect(await Follow.countDocuments({ follower: followerId, following: targetId })).toBe(0);
  expect(await Notification.countDocuments({ recipient: targetId, actor: followerId, type: 'follow' })).toBe(0);

  const firstFollow = await followerAgent.post(`/api/users/${authorId}/follow`);
  const repeatedFollow = await followerAgent.post(`/api/users/${authorId}/follow`);
  expect(firstFollow.status).toBe(200);
  expect(repeatedFollow.status).toBe(200);
  expect(await Follow.countDocuments({ follower: followerId, following: authorId })).toBe(1);
  expect(await Notification.countDocuments({ recipient: authorId, actor: followerId, type: 'follow' })).toBe(1);
}, 15000);
