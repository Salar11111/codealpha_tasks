import { Router } from 'express';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(protect);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const notifications = await Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(30);
    res.json({ notifications });
  })
);

router.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const notification = await Notification.findOne({ _id: req.params.id, recipient: req.user._id });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    notification.read = true;
    await notification.save();
    res.json({ notification });
  })
);

router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
    res.json({ ok: true });
  })
);

export default router;
