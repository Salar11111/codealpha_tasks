import { Router } from 'express';
import Product from '../models/Product.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(protect);

router.use((req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  next();
});

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
    const name = String(req.body.name || '').trim();
    const description = String(req.body.description || '').trim();
    const category = String(req.body.category || '').trim();
    const image = String(req.body.image || '').trim();
    const price = Number(req.body.price);
    const stock = Number(req.body.stock);
    if (!name || !description || !category || !image) {
      return res.status(400).json({ message: 'Name, description, category, and image are required' });
    }
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(stock) || stock < 0) {
      return res.status(400).json({ message: 'Price and stock must be zero or more' });
    }
    const product = await Product.create({ name, description, category, image, price, stock, active: true });
    res.status(201).json({ product });
  })
);

router.patch(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    ['name', 'description', 'category', 'image'].forEach((key) => {
      if (req.body[key] !== undefined) product[key] = String(req.body[key]).trim();
    });
    if (req.body.price !== undefined) product.price = Number(req.body.price);
    if (req.body.stock !== undefined) {
      // Log stock change history
      const oldStock = product.stock;
      product.stock = Number(req.body.stock);
      await product.save();
      // Add stock history entry
      product.stockHistory.push({
        oldStock,
        newStock: product.stock,
        changeType: 'admin_adjust',
        changedBy: req.user._id,
        notes: req.body.stockNotes || 'Admin stock adjustment',
      });
      await product.save();
    }
    if (req.body.active !== undefined) product.active = Boolean(req.body.active);
    await product.save();
    res.json({ product });
  })
);

router.post(
  '/products/:id/restock',
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const qty = Number(req.body.qty);
    if (!Number.isFinite(qty) || qty < 1) {
      return res.status(400).json({ message: 'Valid quantity (1 or more) is required' });
    }
    const oldStock = product.stock;
    product.stock += qty;
    await product.save();
    // Add stock history entry
    product.stockHistory.push({
      oldStock,
      newStock: product.stock,
      changeType: 'restocked',
      changedBy: req.user._id,
      notes: req.body.notes || 'Restock received',
    });
    await product.save();
    // TODO: Send restock notifications to subscribed users
    res.json({ product, oldStock, newStock: product.stock, qtyAdded: qty });
  })
);

export default router;
