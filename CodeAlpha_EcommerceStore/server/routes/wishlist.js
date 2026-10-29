import { Router } from 'express';
import Product from '../models/Product.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(protect);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    await req.user.populate('wishlist');
    const products = (req.user.wishlist || []).filter((product) => product && product.active !== false);
    res.json({ products });
  })
);

router.post(
  '/:productId',
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.productId);
    if (!product || product.active === false) return res.status(404).json({ message: 'Product not found' });
    const ids = (req.user.wishlist || []).map((id) => id.toString());
    const has = ids.includes(product._id.toString());
    req.user.wishlist = has ? ids.filter((id) => id !== product._id.toString()) : [...ids, product._id];
    await req.user.save();
    res.json({ saved: !has });
  })
);

export default router;
