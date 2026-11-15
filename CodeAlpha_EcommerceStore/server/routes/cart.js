import { Router } from 'express';
import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { summarize } from '../utils/pricing.js';

const router = Router();
router.use(protect);

function productIdOf(item) {
  return String(item.product?._id || item.product);
}

function buildSummary(cart) {
  const lines = (cart.items || [])
    .filter((item) => item.product)
    .map((item) => ({ price: item.product.price, qty: item.qty }));
  return summarize(lines);
}

async function loadCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  await cart.populate('items.product');
  return cart;
}

function respond(res, cart) {
  res.json({ cart, summary: buildSummary(cart) });
}

function findVariant(product, variantId) {
  if (!variantId || !mongoose.isValidObjectId(variantId)) return null;
  return product.variants?.id(variantId) || null;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    respond(res, await loadCart(req.user._id));
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { productId, variantId, qty = 1, mode = 'add' } = req.body;
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Choose a product first' });
    }
    const product = await Product.findById(productId);
    if (!product || product.active === false) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const variant = findVariant(product, variantId);
    if (!variant) {
      return res.status(400).json({ message: 'Select a size and colour first' });
    }
    const requested = Number(qty);
    if (!Number.isFinite(requested) || requested < 0) {
      return res.status(400).json({ message: 'Quantity is invalid' });
    }

    const cart = (await Cart.findOne({ user: req.user._id })) || (await Cart.create({ user: req.user._id, items: [] }));
    const existing = cart.items.find(
      (item) => productIdOf(item) === String(product._id) && String(item.variantId) === String(variant._id)
    );
    const current = existing ? existing.qty : 0;
    const nextQty = Math.max(0, Math.round(mode === 'set' ? requested : current + requested));

    if (nextQty > variant.stock) {
      return res
        .status(400)
        .json({ message: `Only ${variant.stock} left in ${variant.color} / ${variant.size}` });
    }

    if (nextQty === 0) {
      cart.items = cart.items.filter(
        (item) => !(productIdOf(item) === String(product._id) && String(item.variantId) === String(variant._id))
      );
    } else if (existing) {
      existing.qty = nextQty;
    } else {
      cart.items.push({ product: product._id, variantId: variant._id, qty: nextQty });
    }

    await cart.save();
    respond(res, await loadCart(req.user._id));
  })
);

// Merge a guest cart saved in localStorage after sign-in.
router.post(
  '/merge',
  asyncHandler(async (req, res) => {
    const incoming = Array.isArray(req.body.items) ? req.body.items.slice(0, 50) : [];
    const cart = (await Cart.findOne({ user: req.user._id })) || (await Cart.create({ user: req.user._id, items: [] }));

    for (const entry of incoming) {
      if (!mongoose.isValidObjectId(entry.productId)) continue;
      const product = await Product.findById(entry.productId);
      if (!product || product.active === false) continue;
      const variant = findVariant(product, entry.variantId);
      if (!variant || variant.stock < 1) continue;
      const qty = Math.max(1, Math.min(Number(entry.qty) || 1, variant.stock));
      const existing = cart.items.find(
        (item) => productIdOf(item) === String(product._id) && String(item.variantId) === String(variant._id)
      );
      if (existing) existing.qty = Math.min(variant.stock, existing.qty + qty);
      else cart.items.push({ product: product._id, variantId: variant._id, qty });
    }

    await cart.save();
    respond(res, await loadCart(req.user._id));
  })
);

router.delete(
  '/',
  asyncHandler(async (req, res) => {
    const cart = (await Cart.findOne({ user: req.user._id })) || (await Cart.create({ user: req.user._id, items: [] }));
    cart.items = [];
    await cart.save();
    respond(res, await loadCart(req.user._id));
  })
);

router.delete(
  '/:productId/:variantId',
  asyncHandler(async (req, res) => {
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = cart.items.filter(
        (item) =>
          !(
            productIdOf(item) === String(req.params.productId) &&
            String(item.variantId) === String(req.params.variantId)
          )
      );
      await cart.save();
    }
    respond(res, await loadCart(req.user._id));
  })
);

router.delete(
  '/:productId',
  asyncHandler(async (req, res) => {
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = cart.items.filter((item) => productIdOf(item) !== String(req.params.productId));
      await cart.save();
    }
    respond(res, await loadCart(req.user._id));
  })
);

export default router;
