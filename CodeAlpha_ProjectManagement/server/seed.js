import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Project from './models/Project.js';
import Task from './models/Task.js';
import Comment from './models/Comment.js';
import Notification from './models/Notification.js';

await connectDB();
const password = await bcrypt.hash('password123', 10);

const demo = await User.findOneAndUpdate(
  { email: 'demo@codealpha.dev' },
  { name: 'Demo Lead', email: 'demo@codealpha.dev', password },
  { upsert: true, new: true }
);
const avery = await User.findOneAndUpdate(
  { email: 'avery@codealpha.dev' },
  { name: 'Avery Cole', email: 'avery@codealpha.dev', password },
  { upsert: true, new: true }
);

const owned = await Project.find({ owner: demo._id }).select('_id');
const ownedIds = owned.map((project) => project._id);
const staleTasks = await Task.find({ project: { $in: ownedIds } }).select('_id');
await Comment.deleteMany({ task: { $in: staleTasks.map((task) => task._id) } });
await Task.deleteMany({ project: { $in: ownedIds } });
await Project.deleteMany({ owner: demo._id });
await Notification.deleteMany({ recipient: { $in: [demo._id, avery._id] } });

function utcDay(offset) {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + offset));
}

const project = await Project.create({
  name: 'Website launch',
  description: 'Get the new marketing site live with copy, design, and a final check.',
  owner: demo._id,
  members: [demo._id, avery._id],
});

const cards = await Task.insertMany([
  {
    project: project._id,
    title: 'Write the homepage',
    description: 'One headline, a short paragraph, and three reasons to care.',
    column: 'todo',
    position: 0,
    priority: 'high',
    dueDate: utcDay(-2),
    labels: ['Copy'],
    assignees: [demo._id],
    createdBy: demo._id,
  },
  {
    project: project._id,
    title: 'Collect two testimonials',
    description: 'Ask last semester’s clients for a sentence we can publish.',
    column: 'todo',
    position: 1,
    priority: 'medium',
    dueDate: utcDay(3),
    labels: ['Research'],
    assignees: [demo._id],
    createdBy: demo._id,
  },
  {
    project: project._id,
    title: 'Design the board layout',
    description: 'Three columns, readable cards, room for a comment thread.',
    column: 'inprogress',
    position: 0,
    priority: 'urgent',
    dueDate: utcDay(1),
    labels: ['Design'],
    assignees: [avery._id],
    createdBy: demo._id,
  },
  {
    project: project._id,
    title: 'Publish the launch note',
    description: 'Short post once the homepage is approved.',
    column: 'done',
    position: 0,
    priority: 'low',
    dueDate: utcDay(-1),
    labels: ['Launch'],
    assignees: [demo._id],
    createdBy: avery._id,
  },
]);

await Comment.create({
  task: cards[2]._id,
  author: avery._id,
  text: 'Columns are in. I’ll tighten the card spacing next.',
});

console.log('Seeded Keel. password123 — demo@codealpha.dev and avery@codealpha.dev');
process.exit(0);
