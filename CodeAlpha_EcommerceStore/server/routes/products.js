import { Router } from 'express';
import Product from '../models/Product.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = { active: { $ne: false } };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.q) filter.name = { $regex: String(req.query.q), $options: 'i' };
    const [products, categories] = await Promise.all([
      Product.find(filter).sort({ name: 1 }),
      Product.distinct('category'),
    ]);
    res.json({ products, categories: categories.sort() });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product || product.active === false) return res.status(404).json({ message: 'Product not found' });
    res.json({ product });
  })
);

export default router;
