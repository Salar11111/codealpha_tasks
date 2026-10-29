import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

function sign(user) {
  return jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

export function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    username: user.username,
    bio: user.bio || '',
  };
}

function check(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ message: errors.array()[0].msg });
    return false;
  }
  return true;
}

router.post(
  '/register',
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('username')
    .trim()
    .toLowerCase()
    .matches(/^[a-z0-9_]{3,20}$/)
    .withMessage('Username must be 3–20 letters, numbers, or underscores'),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  asyncHandler(async (req, res) => {
    if (!check(req, res)) return;
    const { name, username, email, password } = req.body;
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      const message = existing.email === email ? 'Email is already registered' : 'Username is taken';
      return res.status(409).json({ message });
    }
    const user = await User.create({
      name,
      username,
      email,
      password: await bcrypt.hash(password, 10),
    });
    res.status(201).json({ token: sign(user), user: publicUser(user) });
  })
);

router.post(
  '/login',
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  asyncHandler(async (req, res) => {
    if (!check(req, res)) return;
    const user = await User.findOne({ email: req.body.email });
    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    res.json({ token: sign(user), user: publicUser(user) });
  })
);

router.get(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    res.json({ user: publicUser(req.user) });
  })
);

export default router;
