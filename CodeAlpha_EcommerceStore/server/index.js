import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { connectDB } from './config/db.js';
import { asyncHandler } from './utils/asyncHandler.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import reviewRoutes from './routes/reviews.js';
import wishlistRoutes from './routes/wishlist.js';
import adminRoutes from './routes/admin.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
app.use(mongoSanitize());
app.use(hpp());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/admin', adminRoutes);
// Restock notifications - public endpoint
app.post('/api/restock-notifications', asyncHandler(async (req, res) => {
  const { productId, email } = req.body;
  if (!productId || !email) {
    return res.status(400).json({ message: 'Product ID and email are required' });
  }
  console.log(`Restock notification requested: product ${productId}, email ${email}`);
  res.json({ ok: true, message: 'You will be notified when this product is back in stock.' });
}));

app.use('/api/auth', authRoutes);

const port = process.env.PORT || 5001;
if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}

if (process.env.NODE_ENV !== 'test') {
  await connectDB();
  app.listen(port, () => console.log(`Ecommerce API listening on ${port}`));
}

export default app;
