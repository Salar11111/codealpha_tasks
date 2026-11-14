import { Router } from 'express';
import mongoose from 'mongoose';
import { body, validationResult } from 'express-validator';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(protect);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const [orders, total] = await Promise.all([
      Order.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Order.countDocuments({ user: req.user._id }),
    ]);
    res.json({ orders, total, page, pages: Math.ceil(total / limit), perPage: limit });
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

    let createdOrder;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        for (const item of cart.items) {
          const updated = await Product.updateOne(
            { _id: item.product._id, stock: { $gte: item.qty } },
            { $inc: { stock: -item.qty } },
            { session }
          );
          if (updated.modifiedCount !== 1) {
            const failingProduct = cart.items.find((i) => i.product.toString() === item.product.toString())?.product;
            throw new Error(failingProduct ? `${failingProduct.name} only has ${failingProduct.stock} left` : 'Product not found');
          }
          // Log stock change history - get the product doc to find previous stock
          const productAfterUpdate = await Product.findById(item.product._id).session(session);
          const oldStock = productAfterUpdate.stock + item.qty; // stock was just reduced by item.qty
          await Product.updateOne(
            { _id: item.product._id },
            {
              $push: {
                stockHistory: {
                  oldStock,
                  newStock: productAfterUpdate.stock,
                  changeType: 'sold',
                  changedBy: req.user._id,
                  notes: 'Order checkout',
                },
              },
            },
            { session }
          );
        }

        const [created] = await Order.create(
          [
            {
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
            },
          ],
          { session }
        );
        createdOrder = created;
      });
    } catch (err) {
      await session.endSession();
      return res.status(400).json({ message: err.message || 'Checkout failed' });
    }
    await session.endSession();

    cart.items = [];
    await cart.save();

    const updatedUser = await User.findById(req.user._id);
    updatedUser.savedAddress = {
      fullName: req.body.fullName,
      line1: req.body.line1,
      city: req.body.city,
      postalCode: req.body.postalCode,
    };
    await updatedUser.save();

    res.status(201).json({ order: createdOrder, user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role, savedAddress: updatedUser.savedAddress } });
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
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const [orders, total] = await Promise.all([
      Order.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user', 'name email'),
      Order.countDocuments(),
    ]);
    res.json({ orders, total, page, pages: Math.ceil(total / limit), perPage: limit });
  })
);

export default router;
