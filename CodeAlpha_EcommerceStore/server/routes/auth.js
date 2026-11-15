import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { publicUser } from '../utils/serializers.js';

const router = Router();

function sign(user) {
  return jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function authCookieOptions() {
  const requested = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();
  const sameSite = ['lax', 'strict', 'none'].includes(requested) ? requested : 'lax';
  return {
    httpOnly: true,
    sameSite,
    secure: process.env.NODE_ENV === 'production' || sameSite === 'none',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
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

function readAddress(payload = {}) {
  return {
    fullName: String(payload.fullName || '').trim(),
    phone: String(payload.phone || '').trim(),
    line1: String(payload.line1 || '').trim(),
    line2: String(payload.line2 || '').trim(),
    city: String(payload.city || '').trim(),
    state: String(payload.state || '').trim(),
    postalCode: String(payload.postalCode || '').trim(),
    country: String(payload.country || '').trim(),
  };
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
  '/profile',
  protect,
  asyncHandler(async (req, res) => {
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ message: 'Name cannot be empty' });
      req.user.name = name;
    }
    if (req.body.phone !== undefined) {
      req.user.phone = String(req.body.phone).trim();
      req.user.savedAddress.phone = req.user.phone;
    }
    await req.user.save();
    res.json({ user: publicUser(req.user) });
  })
);

router.put(
  '/address',
  protect,
  asyncHandler(async (req, res) => {
    req.user.savedAddress = readAddress(req.body);
    if (req.user.savedAddress.phone) req.user.phone = req.user.savedAddress.phone;
    await req.user.save();
    res.json({ user: publicUser(req.user) });
  })
);

router.post('/logout', (_req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ ok: true });
});

// Restock notification subscription (kept for the product detail page).
router.post(
  '/restock-notifications',
  asyncHandler(async (req, res) => {
    const { productId, email, variantId } = req.body;
    if (!productId || !email) {
      return res.status(400).json({ message: 'Product ID and email are required' });
    }
    const product = await Product.findById(productId);
    if (product) {
      const already = product.restockNotifications.find((entry) => entry.email === email);
      if (!already) {
        product.restockNotifications.push({ email, variantId: variantId || undefined });
        await product.save();
      }
    }
    res.json({ ok: true, message: 'You will be notified when this product is back in stock.' });
  })
);

export default router;
