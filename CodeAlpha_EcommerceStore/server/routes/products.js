import { Router } from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const SORTS = {
  featured: { featured: -1, createdAt: -1, name: 1 },
  newest: { createdAt: -1 },
  'price-asc': { price: 1, name: 1 },
  'price-desc': { price: -1, name: 1 },
  rating: { ratingAverage: -1, ratingCount: -1, name: 1 },
  name: { name: 1 },
};

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];

function compareSizes(a, b) {
  const numericA = Number(a);
  const numericB = Number(b);
  if (Number.isFinite(numericA) && Number.isFinite(numericB)) return numericA - numericB;
  const indexA = SIZE_ORDER.indexOf(a);
  const indexB = SIZE_ORDER.indexOf(b);
  if (indexA !== -1 && indexB !== -1) return indexA - indexB;
  return String(a).localeCompare(String(b));
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toCents(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const visible = { active: { $ne: false } };
    const filter = { ...visible };
    const { department, category, size, color, q, sort, featured, minPrice, maxPrice } = req.query;

    if (department) filter.department = String(department);
    if (category) filter.category = String(category);
    if (featured === 'true' || featured === '1') filter.featured = true;

    if (q && String(q).trim()) {
      const pattern = new RegExp(escapeRegex(String(q).trim()), 'i');
      filter.$or = [{ name: pattern }, { brand: pattern }, { category: pattern }, { description: pattern }];
    }

    if (size || color) {
      filter.variants = { $elemMatch: {} };
      if (size) filter.variants.$elemMatch.size = String(size);
      if (color) filter.variants.$elemMatch.color = String(color);
    }

    const low = toCents(minPrice);
    const high = toCents(maxPrice);
    if (low !== null || high !== null) {
      filter.price = {};
      if (low !== null) filter.price.$gte = low;
      if (high !== null && high > 0) filter.price.$lte = high;
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 24));
    const skip = (page - 1) * limit;
    const sortSpec = SORTS[sort] || SORTS.featured;

    const [products, total, departments, categories, sizes, colors, priceRange, categoryCounts] =
      await Promise.all([
        Product.find(filter).sort(sortSpec).skip(skip).limit(limit),
        Product.countDocuments(filter),
        Product.distinct('department', visible),
        Product.distinct('category', visible),
        Product.distinct('variants.size', visible),
        Product.distinct('variants.color', visible),
        Product.aggregate([
          { $match: visible },
          { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } },
        ]),
        Product.aggregate([
          { $match: visible },
          { $group: { _id: '$category', count: { $sum: 1 } } },
        ]),
      ]);

    res.json({
      products,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      perPage: limit,
      categories: categories.sort(),
      facets: {
        departments: departments.sort(),
        categories: categories.sort(),
        sizes: sizes.filter(Boolean).sort(compareSizes),
        colors: colors.filter(Boolean).sort(),
        priceRange: {
          min: priceRange[0]?.min ?? 0,
          max: priceRange[0]?.max ?? 0,
        },
        categoryCounts: categoryCounts
          .map((entry) => ({ name: entry._id, count: entry.count }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      },
    });
  })
);

router.get(
  '/:idOrSlug',
  asyncHandler(async (req, res) => {
    const { idOrSlug } = req.params;
    const product =
      (mongoose.isValidObjectId(idOrSlug) ? await Product.findById(idOrSlug) : null) ||
      (await Product.findOne({ slug: String(idOrSlug).toLowerCase() }));

    if (!product || product.active === false) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const related = await Product.find({
      _id: { $ne: product._id },
      active: { $ne: false },
      category: product.category,
    })
      .sort({ featured: -1, ratingAverage: -1 })
      .limit(4);

    if (related.length < 4) {
      const fill = await Product.find({
        _id: { $nin: [product._id, ...related.map((item) => item._id)] },
        active: { $ne: false },
        department: product.department,
      })
        .sort({ featured: -1, ratingAverage: -1 })
        .limit(4 - related.length);
      related.push(...fill);
    }

    res.json({ product, related });
  })
);

export default router;
