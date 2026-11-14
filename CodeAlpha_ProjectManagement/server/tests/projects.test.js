import mongoose from 'mongoose';
import request from 'supertest';
import app from '../index.js';
import Activity from '../models/Activity.js';
import Comment from '../models/Comment.js';
import Notification from '../models/Notification.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import User from '../models/User.js';

let email;
let memberEmail;
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
  if (email) await User.deleteOne({ email });
  if (memberEmail) await User.deleteOne({ email: memberEmail });
  await mongoose.connection.close();
});

test('create tasks, enforce edit and archive permissions, and reindex positions', async () => {
  email = `test-${Date.now()}@example.com`;
  memberEmail = `member-${Date.now()}@example.com`;
  const ownerAgent = request.agent(app);

  await ownerAgent.post('/api/auth/register').send({ name: 'Test User', email, password: 'password123' });
  const projectRes = await ownerAgent.post('/api/projects').send({ name: 'Test Project', description: 'Demo' });
  expect(projectRes.status).toBe(201);
  projectId = projectRes.body.project._id;

  const taskRes = await ownerAgent.post(`/api/projects/${projectId}/tasks`).send({ title: 'First task' });
  expect(taskRes.status).toBe(201);
  const firstTask = await Task.findOne({ project: projectId, title: 'First task' });

  const secondTaskRes = await ownerAgent.post(`/api/projects/${projectId}/tasks`).send({ title: 'Second task' });
  expect(secondTaskRes.status).toBe(201);
  const secondTask = await Task.findOne({ project: projectId, title: 'Second task' });

  const memberAgent = request.agent(app);
  const memberRes = await memberAgent
    .post('/api/auth/register')
    .send({ name: 'Project Member', email: memberEmail, password: 'password123' });
  expect(memberRes.status).toBe(201);

  const addedMember = await ownerAgent.post(`/api/projects/${projectId}/members`).send({ email: memberEmail });
  expect(addedMember.status).toBe(200);
  const deniedEdit = await memberAgent
    .patch(`/api/projects/${projectId}/tasks/${firstTask._id}`)
    .send({ title: 'Unauthorized edit' });
  expect(deniedEdit.status).toBe(403);

  const assignment = await ownerAgent
    .patch(`/api/projects/${projectId}/tasks/${firstTask._id}`)
    .send({ assigneeIds: [memberRes.body.user.id] });
  expect(assignment.status).toBe(200);

  const assignedEdit = await memberAgent
    .patch(`/api/projects/${projectId}/tasks/${firstTask._id}`)
    .send({ title: 'Assigned edit' });
  expect(assignedEdit.status).toBe(200);

  const deniedArchive = await memberAgent.patch(`/api/projects/${projectId}`).send({ archived: true });
  expect(deniedArchive.status).toBe(403);
  const move = await ownerAgent
    .patch(`/api/projects/${projectId}/tasks/${firstTask._id}`)
    .send({ column: 'todo', position: 1 });
  expect(move.status).toBe(200);
  const reindexed = await Task.find({ _id: { $in: [firstTask._id, secondTask._id] } });
  expect(reindexed.find((task) => task._id.equals(firstTask._id)).position).toBe(1);
  expect(reindexed.find((task) => task._id.equals(secondTask._id)).position).toBe(0);

  const detail = await ownerAgent.get(`/api/projects/${projectId}`);
  expect(detail.status).toBe(200);
  expect(detail.body.tasks.some((task) => task.title === 'Assigned edit')).toBe(true);
}, 15000);