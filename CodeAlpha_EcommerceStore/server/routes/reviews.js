import { Router } from 'express';
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get(
  '/product/:productId',
  asyncHandler(async (req, res) => {
    const reviews = await Review.find({ product: req.params.productId })
      .sort({ createdAt: -1 })
      .populate('user', 'name');
    const average = reviews.length
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;
    res.json({ reviews, average, count: reviews.length });
  })
);

router.post(
  '/product/:productId',
  protect,
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.productId);
    if (!product || product.active === false) return res.status(404).json({ message: 'Product not found' });
    const bought = await Order.exists({
      user: req.user._id,
      'items.product': product._id,
    });
    if (!bought) return res.status(403).json({ message: 'You can review a product after you order it' });
    const rating = Number(req.body.rating);
    const text = String(req.body.text || '').trim();
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Choose a rating from 1 to 5' });
    }
    if (!text) return res.status(400).json({ message: 'Write a short review' });
    const existing = await Review.findOne({ product: product._id, user: req.user._id });
    if (existing) return res.status(409).json({ message: 'You already reviewed this product' });
    const review = await Review.create({ product: product._id, user: req.user._id, rating, text });
    await review.populate('user', 'name');
    res.status(201).json({ review });
  })
);

export default router;
