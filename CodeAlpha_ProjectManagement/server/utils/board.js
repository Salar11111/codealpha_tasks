import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Comment from '../models/Comment.js';
import { httpError } from './asyncHandler.js';

export async function requireProject(req) {
  const project = await Project.findById(req.params.id);
  if (!project) throw httpError(404, 'Project not found');
  const isMember = project.members.some((id) => id.toString() === req.user._id.toString());
  if (!isMember) throw httpError(403, 'You are not a member of this project');
  return project;
}

export async function loadTasks(projectId) {
  const tasks = await Task.find({ project: projectId })
    .populate('assignees', 'name email')
    .sort({ position: 1, createdAt: 1 })
    .lean();
  if (!tasks.length) return [];
  const counts = await Comment.aggregate([
    { $match: { task: { $in: tasks.map((task) => task._id) } } },
    { $group: { _id: '$task', count: { $sum: 1 } } },
  ]);
  const byTask = new Map(counts.map((row) => [String(row._id), row.count]));
  return tasks.map((task) => ({ ...task, commentCount: byTask.get(String(task._id)) || 0 }));
}

export function broadcastTasks(io, projectId, tasks) {
  io?.to(`project:${projectId.toString()}`).emit('tasks:sync', tasks);
}
