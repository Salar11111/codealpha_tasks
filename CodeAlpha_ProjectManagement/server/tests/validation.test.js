import mongoose from 'mongoose';
import request from 'supertest';
import app from '../index.js';
import Activity from '../models/Activity.js';
import Comment from '../models/Comment.js';
import Notification from '../models/Notification.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import User from '../models/User.js';

let ownerEmail;
let outsiderEmail;
let projectId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  if (projectId) {
    const taskIds = await Task.find({ project: projectId }).distinct('_id');
    await Promise.all([
      Activity.deleteMany({ project: projectId }),
      Comment.deleteMany({ task: { $in: taskIds } }),
      Notification.deleteMany({ project: projectId }),
      Task.deleteMany({ project: projectId }),
      Project.deleteOne({ _id: projectId }),
    ]);
  }
  if (ownerEmail) await User.deleteOne({ email: ownerEmail });
  if (outsiderEmail) await User.deleteOne({ email: outsiderEmail });
  await mongoose.connection.close();
});

test('project and task endpoints validate input and hide private boards', async () => {
  const stamp = Date.now();
  ownerEmail = `owner-${stamp}@example.com`;
  outsiderEmail = `outsider-${stamp}@example.com`;
  const ownerAgent = request.agent(app);
  const outsiderAgent = request.agent(app);

  await ownerAgent.post('/api/auth/register').send({ name: 'Board Owner', email: ownerEmail, password: 'password123' });
  await outsiderAgent
    .post('/api/auth/register')
    .send({ name: 'Outsider', email: outsiderEmail, password: 'password123' });

  const missingName = await ownerAgent.post('/api/projects').send({ description: 'No name' });
  expect(missingName.status).toBe(400);

  const created = await ownerAgent
    .post('/api/projects')
    .send({ name: 'Validation Board', description: 'Checks edge cases' });
  expect(created.status).toBe(201);
  projectId = created.body.project._id;

  const hidden = await outsiderAgent.get(`/api/projects/${projectId}`);
  expect(hidden.status).toBe(403);

  const missingTitle = await ownerAgent.post(`/api/projects/${projectId}/tasks`).send({ title: '   ' });
  expect(missingTitle.status).toBe(400);

  const task = await ownerAgent
    .post(`/api/projects/${projectId}/tasks`)
    .send({ title: 'Validated task' });
  expect(task.status).toBe(201);
  const taskId = task.body.tasks[0]._id;

  const badDueDate = await ownerAgent
    .patch(`/api/projects/${projectId}/tasks/${taskId}`)
    .send({ dueDate: '2026-02-31' });
  expect(badDueDate.status).toBe(400);

  const tooManyLabels = await ownerAgent
    .patch(`/api/projects/${projectId}/tasks/${taskId}`)
    .send({ labels: ['one', 'two', 'three', 'four', 'five'] });
  expect(tooManyLabels.status).toBe(400);

  const badPriority = await ownerAgent
    .patch(`/api/projects/${projectId}/tasks/${taskId}`)
    .send({ priority: 'whenever' });
  expect(badPriority.status).toBe(400);

  const badColumn = await ownerAgent
    .patch(`/api/projects/${projectId}/tasks/${taskId}`)
    .send({ column: 'shipped' });
  expect(badColumn.status).toBe(400);

  const goodUpdate = await ownerAgent.patch(`/api/projects/${projectId}/tasks/${taskId}`).send({
    priority: 'high',
    dueDate: '2026-12-01',
    labels: ['design', 'copy'],
  });
  expect(goodUpdate.status).toBe(200);

  const emptyComment = await ownerAgent
    .post(`/api/projects/${projectId}/tasks/${taskId}/comments`)
    .send({ text: '  ' });
  expect(emptyComment.status).toBe(400);

  const comment = await ownerAgent
    .post(`/api/projects/${projectId}/tasks/${taskId}/comments`)
    .send({ text: 'Looks good' });
  expect(comment.status).toBe(201);
}, 20000);
