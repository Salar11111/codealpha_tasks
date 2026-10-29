import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(protect);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ orders });
  })
);

router.post(
  '/',
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('line1').trim().notEmpty().withMessage('Street address is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('postalCode').trim().notEmpty().withMessage('Postal code is required'),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart || cart.items.length === 0) return res.status(400).json({ message: 'Your cart is empty' });

    for (const item of cart.items) {
      if (!item.product) return res.status(400).json({ message: 'A product in your cart is no longer available' });
      if (item.qty > item.product.stock) {
        return res.status(400).json({ message: `${item.product.name} only has ${item.product.stock} left` });
      }
    }

    const items = cart.items.map((item) => ({
      product: item.product._id,
      name: item.product.name,
      price: item.product.price,
      qty: item.qty,
    }));
    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

    for (const item of cart.items) {
      item.product.stock -= item.qty;
      await item.product.save();
    }

    const order = await Order.create({
      user: req.user._id,
      items,
      total,
      shippingAddress: {
        fullName: req.body.fullName,
        line1: req.body.line1,
        city: req.body.city,
        postalCode: req.body.postalCode,
      },
      status: 'pending',
    });

    cart.items = [];
    await cart.save();
    req.user.savedAddress = {
      fullName: req.body.fullName,
      line1: req.body.line1,
      city: req.body.city,
      postalCode: req.body.postalCode,
    };
    await req.user.save();
    res.status(201).json({ order, user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role, savedAddress: req.user.savedAddress } });
  })
);

router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const status = req.body.status === 'shipped' ? 'shipped' : 'pending';
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ order });
  })
);

router.get(
  '/all',
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const orders = await Order.find().sort({ createdAt: -1 }).limit(40).populate('user', 'name email');
    res.json({ orders });
  })
);

export default router;
