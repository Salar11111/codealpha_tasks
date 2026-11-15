import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import mongoose from 'mongoose';
import { body, validationResult } from 'express-validator';
import Cart from '../models/Cart.js';
import Order, { ORDER_STATUSES } from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { summarize } from '../utils/pricing.js';
import { publicUser } from '../utils/serializers.js';

const router = Router();
router.use(protect);

function readAddress(payload = {}) {
  return {
    fullName: String(payload.fullName || '').trim(),
    phone: String(payload.phone || '').trim(),
    line1: String(payload.line1 || '').trim(),
    line2: String(payload.line2 || '').trim(),
    city: String(payload.city || '').trim(),
    state: String(payload.state || '').trim(),
    postalCode: String(payload.postalCode || '').trim(),
    country: String(payload.country || 'United States').trim() || 'United States',
  };
}

function orderNumber() {
  return `AO-${Date.now().toString(36).toUpperCase().slice(-5)}${Math.floor(Math.random() * 36)
    .toString(36)
    .toUpperCase()}`;
}

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

router.get(
  '/all',
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const filter = {};
    if (req.query.status && ORDER_STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user', 'name email'),
      Order.countDocuments(filter),
    ]);
    res.json({ orders, total, page, pages: Math.ceil(total / limit), perPage: limit });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const ownerId = String(order.user?._id || order.user);
    if (ownerId !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not your order' });
    }
    res.json({ order });
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

    const address = readAddress(req.body);
    const items = [];
    for (const line of cart.items) {
      const product = line.product;
      if (!product || product.active === false) {
        return res.status(400).json({ message: 'A product in your cart is no longer available' });
      }
      const variant = product.variants?.id(line.variantId);
      if (!variant) {
        return res.status(400).json({
          message: `${product.name} is no longer available in that size and colour`,
        });
      }
      if (variant.stock < line.qty) {
        return res
          .status(400)
          .json({ message: `${product.name} (${variant.size} / ${variant.color}) only has ${variant.stock} left` });
      }
      items.push({
        product: product._id,
        variantId: variant._id,
        name: product.name,
        brand: product.brand,
        slug: product.slug,
        image: product.images?.[0] || '',
        size: variant.size,
        color: variant.color,
        price: product.price,
        qty: line.qty,
      });
    }

    const totals = summarize(items);
    const session = await mongoose.startSession();
    const reserved = [];
    let createdOrder = null;
    let sessionEnded = false;

    async function reserveAndCreate(activeSession) {
      const options = activeSession ? { session: activeSession } : {};
      for (const item of items) {
        const updated = await Product.updateOne(
          {
            _id: item.product,
            variants: { $elemMatch: { _id: item.variantId, stock: { $gte: item.qty } } },
          },
          { $inc: { 'variants.$.stock': -item.qty } },
          options
        );
        if (updated.modifiedCount !== 1) {
          const current = await Product.findById(item.product).session(activeSession || null);
          const variant = current?.variants?.id(item.variantId);
          throw new Error(
            `${item.name} (${item.size} / ${item.color}) only has ${variant?.stock ?? 0} left`
          );
        }
        reserved.push(item);

        const current = await Product.findById(item.product).session(activeSession || null);
        const variant = current?.variants?.id(item.variantId);
        await Product.updateOne(
          { _id: item.product },
          {
            $push: {
              stockHistory: {
                oldStock: (variant?.stock ?? 0) + item.qty,
                newStock: variant?.stock ?? 0,
                changeType: 'sold',
                changedBy: req.user._id,
                notes: `Order checkout · ${item.size} / ${item.color}`,
              },
            },
          },
          options
        );
      }

      const [created] = await Order.create(
        [
          {
            orderNumber: orderNumber(),
            user: req.user._id,
            items,
            subtotal: totals.subtotal,
            shipping: totals.shipping,
            tax: totals.tax,
            total: totals.total,
            shippingAddress: address,
            status: 'paid',
            paymentRef: `mock_pi_${randomUUID().replace(/-/g, '').slice(0, 20)}`,
            paidAt: new Date(),
          },
        ],
        options
      );
      createdOrder = created;

      cart.items = [];
      await cart.save(activeSession ? { session: activeSession } : {});

      await User.updateOne(
        { _id: req.user._id },
        {
          $set: {
            savedAddress: address,
            phone: address.phone || req.user.phone || '',
          },
        },
        options
      );
    }

    async function releaseReservation() {
      if (!reserved.length) return;
      await Product.bulkWrite(
        reserved.map((item) => ({
          updateOne: {
            filter: { _id: item.product, 'variants._id': item.variantId },
            update: { $inc: { 'variants.$.stock': item.qty } },
          },
        }))
      );
      if (createdOrder) await Order.deleteOne({ _id: createdOrder._id });
    }

    try {
      try {
        await session.withTransaction(() => reserveAndCreate(session));
      } catch (error) {
        // A standalone MongoDB cannot run transactions. Fall back to sequential
        // atomic decrements with compensating writes so local demos still work.
        const transactionUnsupported = /Transaction numbers are only allowed/i.test(
          error.message || ''
        );
        if (!transactionUnsupported) throw error;

        await session.endSession();
        sessionEnded = true;
        reserved.length = 0;
        createdOrder = null;
        try {
          await reserveAndCreate(null);
        } catch (fallbackError) {
          await releaseReservation();
          throw fallbackError;
        }
      }
    } catch (error) {
      return res.status(error.status || 400).json({ message: error.message || 'Checkout failed' });
    } finally {
      if (!sessionEnded) await session.endSession();
    }

    const freshUser = await User.findById(req.user._id);
    res.status(201).json({ order: createdOrder, user: publicUser(freshUser) });
  })
);

router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const status = String(req.body.status || '');
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${ORDER_STATUSES.join(', ')}` });
    }
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (status === 'cancelled' && order.status !== 'cancelled') {
      await Product.bulkWrite(
        order.items
          .filter((item) => item.product && item.variantId)
          .map((item) => ({
            updateOne: {
              filter: { _id: item.product, 'variants._id': item.variantId },
              update: { $inc: { 'variants.$.stock': item.qty } },
            },
          }))
      );
    }

    order.status = status;
    await order.save();
    await order.populate('user', 'name email');
    res.json({ order });
  })
);

export default router;
