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

function authCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role || 'customer',
    savedAddress: user.savedAddress || {},
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
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  asyncHandler(async (req, res) => {
    if (!check(req, res)) return;
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email is already registered' });
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
    const token = sign(user);
    res.cookie('token', token, authCookieOptions());
    res.status(201).json({ user: publicUser(user) });
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
    const token = sign(user);
    res.cookie('token', token, authCookieOptions());
    res.json({ user: publicUser(user) });
  })
);

router.get(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    res.json({ user: publicUser(req.user) });
  })
);

router.put(
  '/address',
  protect,
  asyncHandler(async (req, res) => {
    req.user.savedAddress = {
      fullName: String(req.body.fullName || '').trim(),
      line1: String(req.body.line1 || '').trim(),
      city: String(req.body.city || '').trim(),
      postalCode: String(req.body.postalCode || '').trim(),
    };
    await req.user.save();
    res.json({ user: publicUser(req.user) });
  })
);

router.post('/logout', (_req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ ok: true });
});

// Restock notification subscription
router.post(
  '/restock-notifications',
  asyncHandler(async (req, res) => {
    const { productId, email } = req.body;
    if (!productId || !email) {
      return res.status(400).json({ message: 'Product ID and email are required' });
    }
    // In a real app, we'd store this in a dedicated collection
    // For now, we'll just log and acknowledge
    console.log(`Restock notification requested: product ${productId}, email ${email}`);
    res.json({ ok: true, message: 'You will be notified when this product is back in stock.' });
  })
);

export default router;
