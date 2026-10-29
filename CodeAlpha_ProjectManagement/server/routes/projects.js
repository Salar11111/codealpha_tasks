import { Router } from 'express';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Comment from '../models/Comment.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler, httpError } from '../utils/asyncHandler.js';
import { notify } from '../utils/notify.js';
import { broadcastTasks, loadTasks, requireProject } from '../utils/board.js';
import Activity from '../models/Activity.js';

const router = Router();
router.use(protect);

const columns = ['todo', 'inprogress', 'done'];
const priorities = ['none', 'low', 'medium', 'high', 'urgent'];

function parseDue(value) {
  if (value === null || value === '') return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) throw httpError(400, 'Due date is invalid');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw httpError(400, 'Due date is invalid');
  }
  return date;
}

function cleanLabels(value) {
  if (!Array.isArray(value)) throw httpError(400, 'Labels must be a list');
  const labels = [];
  for (const raw of value) {
    const label = String(raw ?? '').trim().replace(/\s+/g, ' ');
    if (!label) continue;
    if (label.length > 24) throw httpError(400, 'Labels are limited to 24 characters');
    if (labels.some((item) => item.toLowerCase() === label.toLowerCase())) {
      throw httpError(400, 'That label is already on the card');
    }
    labels.push(label);
  }
  if (labels.length > 4) throw httpError(400, 'A card can have up to 4 labels');
  return labels;
}

async function logActivity(req, project, message) {
  const activity = await Activity.create({ project: project._id, actor: req.user._id, message });
  await activity.populate('actor', 'name');
  req.app.get('io')?.to(`project:${project._id.toString()}`).emit('activity:created', activity);
  return activity;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const projects = await Project.find({
      members: req.user._id,
      archived: req.query.archived === '1' ? true : { $ne: true },
    })
      .sort({ updatedAt: -1 })
      .populate('owner', 'name email')
      .populate('members', 'name email');
    const grouped = projects.length
      ? await Task.aggregate([
          { $match: { project: { $in: projects.map((project) => project._id) } } },
          { $group: { _id: { project: '$project', column: '$column' }, count: { $sum: 1 } } },
        ])
      : [];
    const counts = new Map();
    for (const row of grouped) {
      const key = String(row._id.project);
      const entry = counts.get(key) || { todo: 0, inprogress: 0, done: 0 };
      if (entry[row._id.column] !== undefined) entry[row._id.column] = row.count;
      counts.set(key, entry);
    }
    res.json({
      projects: projects.map((project) => ({
        ...project.toObject(),
        counts: counts.get(String(project._id)) || { todo: 0, inprogress: 0, done: 0 },
      })),
    });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const name = String(req.body.name || '').trim();
    const description = String(req.body.description || '').trim();
    if (!name) throw httpError(400, 'Project name is required');
    const project = await Project.create({
      name,
      description,
      owner: req.user._id,
      members: [req.user._id],
    });
    await project.populate('owner', 'name email');
    await project.populate('members', 'name email');
    res.status(201).json({ project });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const project = await requireProject(req);
    await project.populate('owner', 'name email');
    await project.populate('members', 'name email');
    const tasks = await loadTasks(project._id);
    const activities = await Activity.find({ project: project._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('actor', 'name');
    res.json({ project, tasks, activities });
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const project = await requireProject(req);
    if (req.body.name !== undefined) {
      const name = String(req.body.name || '').trim();
      if (!name) throw httpError(400, 'Project name is required');
      project.name = name;
    }
    if (req.body.description !== undefined) project.description = String(req.body.description || '').trim();
    if (req.body.archived !== undefined) {
      if (project.owner.toString() !== req.user._id.toString()) throw httpError(403, 'Only the owner can archive a project');
      project.archived = Boolean(req.body.archived);
      await logActivity(req, project, `${req.user.name} ${project.archived ? 'archived' : 'restored'} ${project.name}`);
    }
    await project.save();
    await project.populate('owner', 'name email');
    await project.populate('members', 'name email');
    res.json({ project });
  })
);

router.post(
  '/:id/members',
  asyncHandler(async (req, res) => {
    const project = await requireProject(req);
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) throw httpError(400, 'Email is required');
    const user = await User.findOne({ email });
    if (!user) throw httpError(404, 'No account uses that email');
    if (project.members.some((id) => id.toString() === user._id.toString())) {
      throw httpError(409, 'That person is already a member');
    }
    project.members.push(user._id);
    await project.save();
    await notify(req.app.get('io'), {
      recipient: user._id,
      actorId: req.user._id,
      project: project._id,
      message: `${req.user.name} added you to ${project.name}`,
    });
    await project.populate('owner', 'name email');
    await project.populate('members', 'name email');
    res.json({ project });
  })
);

router.post(
  '/:id/tasks',
  asyncHandler(async (req, res) => {
    const project = await requireProject(req);
    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || '').trim();
    if (!title) throw httpError(400, 'Task title is required');
    const count = await Task.countDocuments({ project: project._id, column: 'todo' });
    await Task.create({
      project: project._id,
      title,
      description,
      column: 'todo',
      position: count,
      createdBy: req.user._id,
      assignees: [],
    });
    project.updatedAt = new Date();
    await project.save();
    await logActivity(req, project, `${req.user.name} added “${title}”`);
    const tasks = await loadTasks(project._id);
    broadcastTasks(req.app.get('io'), project._id, tasks);
    res.status(201).json({ tasks });
  })
);

router.patch(
  '/:id/tasks/:taskId',
  asyncHandler(async (req, res) => {
    const project = await requireProject(req);
    const task = await Task.findOne({ _id: req.params.taskId, project: project._id });
    if (!task) throw httpError(404, 'Task not found');

    if (req.body.title !== undefined) {
      const title = String(req.body.title).trim();
      if (!title) throw httpError(400, 'Task title is required');
      task.title = title;
    }
    if (req.body.description !== undefined) task.description = String(req.body.description);
    if (req.body.priority !== undefined) {
      const priority = String(req.body.priority);
      if (!priorities.includes(priority)) throw httpError(400, 'Unknown priority');
      task.priority = priority;
    }
    if (req.body.dueDate !== undefined) task.dueDate = parseDue(req.body.dueDate);
    if (req.body.labels !== undefined) task.labels = cleanLabels(req.body.labels);
    if (req.body.checklist !== undefined) {
      if (!Array.isArray(req.body.checklist)) throw httpError(400, 'Checklist must be a list');
      if (req.body.checklist.length > 20) throw httpError(400, 'A card can have up to 20 checklist items');
      task.checklist = req.body.checklist.map((item) => ({
        text: String(item.text || '').trim(),
        done: Boolean(item.done),
      })).filter((item) => item.text);
    }

    if (req.body.assigneeIds) {
      const ids = [...new Set(req.body.assigneeIds.map(String))];
      const memberIds = new Set(project.members.map((id) => id.toString()));
      if (ids.some((id) => !memberIds.has(id))) throw httpError(400, 'Assignees must be project members');
      const previous = new Set(task.assignees.map((id) => id.toString()));
      task.assignees = ids;
      for (const id of ids) {
        if (!previous.has(id)) {
          await notify(req.app.get('io'), {
            recipient: id,
            actorId: req.user._id,
            project: project._id,
            task: task._id,
            message: `${req.user.name} assigned you “${task.title}” in ${project.name}`,
          });
        }
      }
    }

    if (req.body.column !== undefined || req.body.position !== undefined) {
      const column = req.body.column || task.column;
      if (!columns.includes(column)) throw httpError(400, 'Unknown column');
      const fromColumn = task.column;
      const siblings = await Task.find({
        project: project._id,
        column,
        _id: { $ne: task._id },
      }).sort({ position: 1 });
      let position = Number.isFinite(Number(req.body.position)) ? Number(req.body.position) : siblings.length;
      position = Math.max(0, Math.min(position, siblings.length));
      task.column = column;
      siblings.splice(position, 0, task);
      for (let index = 0; index < siblings.length; index += 1) {
        siblings[index].column = column;
        siblings[index].position = index;
        await siblings[index].save();
      }
      if (fromColumn !== column) {
        const left = await Task.find({ project: project._id, column: fromColumn }).sort({ position: 1 });
        for (let index = 0; index < left.length; index += 1) {
          left[index].position = index;
          await left[index].save();
        }
        await logActivity(req, project, `${req.user.name} moved “${task.title}” to ${column}`);
      }
    } else {
      await task.save();
    }

    project.updatedAt = new Date();
    await project.save();
    const tasks = await loadTasks(project._id);
    broadcastTasks(req.app.get('io'), project._id, tasks);
    res.json({ tasks });
  })
);

router.delete(
  '/:id/tasks/:taskId',
  asyncHandler(async (req, res) => {
    const project = await requireProject(req);
    const task = await Task.findOne({ _id: req.params.taskId, project: project._id });
    if (!task) throw httpError(404, 'Task not found');
    await Comment.deleteMany({ task: task._id });
    await task.deleteOne();
    const left = await Task.find({ project: project._id, column: task.column }).sort({ position: 1 });
    for (let index = 0; index < left.length; index += 1) {
      left[index].position = index;
      await left[index].save();
    }
    const tasks = await loadTasks(project._id);
    broadcastTasks(req.app.get('io'), project._id, tasks);
    res.json({ tasks });
  })
);

router.get(
  '/:id/tasks/:taskId/comments',
  asyncHandler(async (req, res) => {
    await requireProject(req);
    const task = await Task.findOne({ _id: req.params.taskId, project: req.params.id });
    if (!task) throw httpError(404, 'Task not found');
    const comments = await Comment.find({ task: task._id }).sort({ createdAt: 1 }).populate('author', 'name email');
    res.json({ comments });
  })
);

router.post(
  '/:id/tasks/:taskId/comments',
  asyncHandler(async (req, res) => {
    const project = await requireProject(req);
    const task = await Task.findOne({ _id: req.params.taskId, project: project._id }).populate('assignees', '_id');
    if (!task) throw httpError(404, 'Task not found');
    const text = String(req.body.text || '').trim();
    if (!text) throw httpError(400, 'Comment cannot be empty');
    if (text.length > 500) throw httpError(400, 'Comments are limited to 500 characters');
    const comment = await Comment.create({ task: task._id, author: req.user._id, text });
    await comment.populate('author', 'name email');
    const io = req.app.get('io');
    io?.to(`project:${project._id.toString()}`).emit('comment:created', { taskId: task._id, comment });
    await logActivity(req, project, `${req.user.name} commented on “${task.title}”`);
    const recipients = new Set([
      task.createdBy.toString(),
      ...task.assignees.map((person) => person._id.toString()),
    ]);
    for (const recipient of recipients) {
      await notify(io, {
        recipient,
        actorId: req.user._id,
        project: project._id,
        task: task._id,
        message: `${req.user.name} commented on “${task.title}”`,
      });
    }
    res.status(201).json({ comment });
  })
);

export default router;
