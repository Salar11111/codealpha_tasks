import { Router } from 'express';
import Task from '../models/Task.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(protect);

function startOfTodayUtc() {
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

router.get(
  '/mine',
  asyncHandler(async (req, res) => {
    const tasks = await Task.find({
      assignees: req.user._id,
      column: { $ne: 'done' },
    }).populate('project', 'name members');

    const open = tasks.filter((task) =>
      (task.project?.members || []).some((id) => id.toString() === req.user._id.toString())
    );
    const today = startOfTodayUtc();
    open.sort((a, b) => {
      const rank = (task) => {
        if (!task.dueDate) return [2, Number.MAX_SAFE_INTEGER];
        const time = new Date(task.dueDate).getTime();
        return [time < today ? 0 : 1, time];
      };
      const [rankA, timeA] = rank(a);
      const [rankB, timeB] = rank(b);
      if (rankA !== rankB) return rankA - rankB;
      if (timeA !== timeB) return timeA - timeB;
      return a.title.localeCompare(b.title);
    });

    res.json({
      tasks: open.map((task) => ({
        _id: task._id,
        title: task.title,
        priority: task.priority || 'none',
        dueDate: task.dueDate,
        column: task.column,
        labels: task.labels || [],
        project: { _id: task.project._id, name: task.project.name },
      })),
    });
  })
);

export default router;
