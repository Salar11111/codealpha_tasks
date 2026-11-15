import { Router } from 'express';
import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import Order, { ORDER_STATUSES } from '../models/Order.js';
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hexForColor } from '../utils/colors.js';

const router = Router();
router.use(protect);

router.use((req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  next();
});

function normalizeImages(payload) {
  const raw = payload.images ?? (payload.image ? [payload.image] : undefined);
  if (raw === undefined) return undefined;
  const images = (Array.isArray(raw) ? raw : [raw])
    .map((image) => String(image || '').trim())
    .filter(Boolean);
  return [...new Set(images)];
}

function normalizeVariants(raw) {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) throw new Error('Variants must be an array');
  return raw.map((variant) => {
    const size = String(variant.size || '').trim();
    const color = String(variant.color || '').trim();
    const stock = Number(variant.stock);
    if (!size || !color) throw new Error('Every variant needs a size and a colour');
    if (!Number.isInteger(stock) || stock < 0) {
      throw new Error('Variant stock must be a whole number of zero or more');
    }
    return {
      _id: mongoose.isValidObjectId(variant._id) ? variant._id : new mongoose.Types.ObjectId(),
      size,
      color,
      colorHex: String(variant.colorHex || hexForColor(color)),
      sku: String(variant.sku || '').trim(),
      stock,
    };
  });
}

function normalizePrice(value, field) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`${field} must be a whole number of cents (zero or more)`);
  }
  return number;
}

function applyPayload(product, payload) {
  if (payload.name !== undefined) product.name = String(payload.name).trim();
  if (payload.description !== undefined) product.description = String(payload.description).trim();
  if (payload.brand !== undefined) product.brand = String(payload.brand).trim() || 'Atelier & Oak';
  if (payload.department !== undefined) product.department = String(payload.department).trim();
  if (payload.category !== undefined) product.category = String(payload.category).trim();
  if (payload.details !== undefined) {
    product.details = (Array.isArray(payload.details) ? payload.details : [payload.details])
      .map((detail) => String(detail || '').trim())
      .filter(Boolean);
  }
  if (payload.price !== undefined) product.price = normalizePrice(payload.price, 'Price');
  if (payload.compareAtPrice !== undefined) {
    product.compareAtPrice =
      payload.compareAtPrice === null || payload.compareAtPrice === ''
        ? null
        : normalizePrice(payload.compareAtPrice, 'Compare-at price');
  }
  const images = normalizeImages(payload);
  if (images !== undefined) product.images = images;
  const variants = normalizeVariants(payload.variants);
  if (variants !== undefined) product.variants = variants;
  if (payload.featured !== undefined) product.featured = Boolean(payload.featured);
  if (payload.active !== undefined) product.active = Boolean(payload.active);
}

function validateProduct(product) {
  if (!product.name) return 'Name is required';
  if (!product.description) return 'Description is required';
  if (!['Shoes', 'Clothing'].includes(product.department)) return 'Department must be Shoes or Clothing';
  if (!product.category) return 'Category is required';
  if (!Array.isArray(product.images) || product.images.length === 0) return 'At least one image is required';
  return null;
}

router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [revenue, orders, products, recentOrders, statusCounts] = await Promise.all([
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      Order.countDocuments(),
      Product.countDocuments(),
      Order.find().sort({ createdAt: -1 }).limit(5).populate('user', 'name email'),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const allProducts = await Product.find().select('variants.stock active');
    const lowStock = allProducts.filter(
      (product) =>
        product.active !== false &&
        (product.variants || []).reduce((sum, variant) => sum + (variant.stock || 0), 0) <= 5
    ).length;

    const byStatus = ORDER_STATUSES.reduce((acc, status) => {
      acc[status] = statusCounts.find((entry) => entry._id === status)?.count || 0;
      return acc;
    }, {});

    res.json({
      stats: {
        revenue: revenue[0]?.revenue || 0,
        paidOrders: revenue[0]?.count || 0,
        orders,
        products,
        lowStock,
        ordersByStatus: byStatus,
      },
      recentOrders,
    });
  })
);

router.get(
  '/products',
  asyncHandler(async (_req, res) => {
    const products = await Product.find().sort({ name: 1 });
    res.json({ products });
  })
);

router.post(
  '/products',
  asyncHandler(async (req, res) => {
    try {
      const product = new Product({
        name: '',
        department: '',
        category: '',
        description: '',
        price: 0,
        images: [],
        variants: [],
      });
      applyPayload(product, req.body);
      const problem = validateProduct(product);
      if (problem) return res.status(400).json({ message: problem });
      await product.save();
      res.status(201).json({ product });
    } catch (error) {
      return res.status(400).json({ message: error.message || 'Could not create product' });
    }
  })
);

router.patch(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    try {
      applyPayload(product, req.body);
      const problem = validateProduct(product);
      if (problem) return res.status(400).json({ message: problem });
      await product.save();
      res.json({ product });
    } catch (error) {
      return res.status(400).json({ message: error.message || 'Could not update product' });
    }
  })
);

router.delete(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    await Promise.all([
      Cart.updateMany({}, { $pull: { items: { product: product._id } } }),
      User.updateMany({}, { $pull: { wishlist: product._id } }),
      Review.deleteMany({ product: product._id }),
    ]);
    await product.deleteOne();
    res.json({ ok: true });
  })
);

router.post(
  '/products/:id/restock',
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const qty = Number(req.body.qty);
    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({ message: 'Valid quantity (1 or more) is required' });
    }
    const variant =
      (req.body.variantId && product.variants.id(req.body.variantId)) ||
      (product.variants.length === 1 ? product.variants[0] : null);
    if (!variant) {
      return res.status(400).json({ message: 'Choose a variant to restock' });
    }
    const oldStock = variant.stock;
    variant.stock += qty;
    product.stockHistory.push({
      oldStock,
      newStock: variant.stock,
      changeType: 'restocked',
      changedBy: req.user._id,
      notes: req.body.notes || `Restock · ${variant.size} / ${variant.color}`,
    });
    await product.save();
    res.json({
      product,
      variantId: variant._id,
      oldStock,
      newStock: variant.stock,
      qtyAdded: qty,
    });
  })
);

export default router;
