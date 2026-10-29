import { Router } from 'express';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(protect);

async function loadCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  await cart.populate('items.product');
  return cart;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ cart: await loadCart(req.user._id) });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { productId, qty = 1, mode = 'add' } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const cart = await Cart.findOne({ user: req.user._id }) || (await Cart.create({ user: req.user._id, items: [] }));
    const existing = cart.items.find((item) => item.product.toString() === productId);
    const current = existing ? existing.qty : 0;
    const nextQty = mode === 'set' ? Number(qty) : current + Number(qty);

    if (!Number.isFinite(nextQty) || nextQty < 0) {
      return res.status(400).json({ message: 'Quantity is invalid' });
    }
    if (nextQty > product.stock) {
      return res.status(400).json({ message: `Only ${product.stock} in stock` });
    }

    if (nextQty === 0) {
      cart.items = cart.items.filter((item) => item.product.toString() !== productId);
    } else if (existing) {
      existing.qty = nextQty;
    } else {
      cart.items.push({ product: productId, qty: nextQty });
    }

    await cart.save();
    res.json({ cart: await loadCart(req.user._id) });
  })
);

router.delete(
  '/:productId',
  asyncHandler(async (req, res) => {
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = cart.items.filter((item) => item.product.toString() !== req.params.productId);
      await cart.save();
    }
    res.json({ cart: await loadCart(req.user._id) });
  })
);

export default router;
