import 'dotenv/config';
import path from 'path';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import userRoutes from './routes/users.js';
import notificationRoutes from './routes/notifications.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5174' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === 11000) return res.status(409).json({ message: 'That record already exists' });
  const status = err.name === 'CastError' ? 400 : 500;
  res.status(status).json({ message: status === 400 ? 'Invalid id' : 'Server error' });
});

const port = process.env.PORT || 5002;
await connectDB();
app.listen(port, () => console.log(`Social API listening on ${port}`));
