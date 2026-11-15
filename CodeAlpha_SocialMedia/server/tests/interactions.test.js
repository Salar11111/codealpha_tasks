import mongoose from 'mongoose';
import request from 'supertest';
import app from '../index.js';
import Bookmark from '../models/Bookmark.js';
import Comment from '../models/Comment.js';
import Follow from '../models/Follow.js';
import Notification from '../models/Notification.js';
import Post from '../models/Post.js';
import User from '../models/User.js';

let authorId;
let viewerId;
let postId;
let authorEmail;
let viewerEmail;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  if (authorId && viewerId) {
    await Promise.all([
      Bookmark.deleteMany({ $or: [{ user: viewerId }, { user: authorId }] }),
      Comment.deleteMany({ $or: [{ author: viewerId }, { author: authorId }] }),
      Follow.deleteMany({ $or: [{ follower: viewerId }, { following: viewerId }] }),
      Notification.deleteMany({ $or: [{ recipient: authorId }, { actor: viewerId }] }),
    ]);
  }
  if (postId) await Post.deleteOne({ _id: postId });
  if (authorEmail) await User.deleteOne({ email: authorEmail });
  if (viewerEmail) await User.deleteOne({ email: viewerEmail });
  await mongoose.connection.close();
});

test('like, comment, and follow interactions stay consistent', async () => {
  const stamp = Date.now();
  const suffix = stamp.toString().slice(-10);
  authorEmail = `author-${stamp}@example.com`;
  viewerEmail = `viewer-${stamp}@example.com`;
  const authorAgent = request.agent(app);
  const viewerAgent = request.agent(app);

  const author = await authorAgent.post('/api/auth/register').send({
    name: 'Post Author',
    username: `author${suffix}`,
    email: authorEmail,
    password: 'password123',
  });
  expect(author.status).toBe(201);
  authorId = author.body.user.id;

  const viewer = await viewerAgent.post('/api/auth/register').send({
    name: 'Post Viewer',
    username: `viewer${suffix}`,
    email: viewerEmail,
    password: 'password123',
  });
  expect(viewer.status).toBe(201);
  viewerId = viewer.body.user.id;

  const createdPost = await authorAgent.post('/api/posts').send({ text: 'Testing interactions' });
  expect(createdPost.status).toBe(201);
  postId = createdPost.body.post._id;

  const firstLike = await viewerAgent.post(`/api/posts/${postId}/like`);
  expect(firstLike.status).toBe(200);
  expect(firstLike.body.post.liked).toBe(true);
  expect(firstLike.body.post.likeCount).toBe(1);

  const unliked = await viewerAgent.post(`/api/posts/${postId}/like`);
  expect(unliked.body.post.liked).toBe(false);
  expect(unliked.body.post.likeCount).toBe(0);

  await viewerAgent.post(`/api/posts/${postId}/like`);

  const comment = await viewerAgent.post(`/api/posts/${postId}/comments`).send({ text: 'Nice post' });
  expect(comment.status).toBe(201);
  expect(comment.body.comment.text).toBe('Nice post');

  const emptyComment = await viewerAgent.post(`/api/posts/${postId}/comments`).send({ text: '   ' });
  expect(emptyComment.status).toBe(400);

  const comments = await viewerAgent.get(`/api/posts/${postId}/comments`);
  expect(comments.status).toBe(200);
  expect(comments.body.comments).toHaveLength(1);

  const feed = await authorAgent.get('/api/posts/feed');
  const feedPost = feed.body.posts.find((post) => post._id === postId);
  expect(feedPost.likeCount).toBe(1);
  expect(feedPost.commentCount).toBe(1);

  const forbiddenEdit = await viewerAgent.put(`/api/posts/${postId}`).send({ text: 'Hijacked' });
  expect(forbiddenEdit.status).toBe(403);

  const emptyPost = await authorAgent.post('/api/posts').send({ text: '   ' });
  expect(emptyPost.status).toBe(400);

  const follow = await viewerAgent.post(`/api/users/${authorId}/follow`);
  expect(follow.status).toBe(200);
  expect(follow.body.isFollowing).toBe(true);

  const profile = await viewerAgent.get(`/api/users/${author.body.user.username}`);
  expect(profile.status).toBe(200);
  expect(profile.body.profile.isFollowing).toBe(true);
  expect(profile.body.profile.followers).toBe(1);

  const selfFollow = await authorAgent.post(`/api/users/${authorId}/follow`);
  expect(selfFollow.status).toBe(400);

  const unfollow = await viewerAgent.delete(`/api/users/${authorId}/follow`);
  expect(unfollow.status).toBe(200);
  expect(unfollow.body.isFollowing).toBe(false);

  const afterUnfollow = await viewerAgent.get(`/api/users/${author.body.user.username}`);
  expect(afterUnfollow.body.profile.followers).toBe(0);
}, 20000);

test('registration rejects invalid usernames and duplicate emails', async () => {
  const invalidUsername = await request(app).post('/api/auth/register').send({
    name: 'Bad Username',
    username: 'a!',
    email: `bad-${Date.now()}@example.com`,
    password: 'password123',
  });
  expect(invalidUsername.status).toBe(400);

  const duplicate = await request(app).post('/api/auth/register').send({
    name: 'Duplicate Author',
    username: `author${Date.now().toString().slice(-10)}`,
    email: authorEmail,
    password: 'password123',
  });
  expect(duplicate.status).toBe(409);
});
