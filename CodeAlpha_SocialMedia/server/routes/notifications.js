import { Router } from 'express';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(protect);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const notes = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('actor', 'name username');
    const unread = notes.filter((note) => !note.read).length;
    res.json({ notifications: notes, unread });
  })
);

router.post(
  '/read',
  asyncHandler(async (req, res) => {
    await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
    res.json({ ok: true });
  })
);

export default router;
