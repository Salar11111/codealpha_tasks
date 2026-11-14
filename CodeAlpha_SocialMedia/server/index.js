import 'dotenv/config';
import { createServer } from 'http';
import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import userRoutes from './routes/users.js';
import notificationRoutes from './routes/notifications.js';

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5174', credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
app.use(mongoSanitize());
app.use(hpp());
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false }));
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

const origin = process.env.CLIENT_URL || 'http://localhost:5174';
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin, credentials: true } });
app.set('io', io);

function readCookieFromHeader(header, name) {
  const cookie = header || '';
  const match = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      readCookieFromHeader(socket.handshake.headers?.cookie, 'token');
    if (!token) return next(new Error('Unauthorized'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id || null;
    if (!socket.userId) return next(new Error('Unauthorized'));
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.userId}`);
  socket.on('join-room', (_roomId) => {
    if (socket.userId) socket.join(`user:${socket.userId}`);
  });
});

const port = process.env.PORT || 5002;
if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}

if (process.env.NODE_ENV !== 'test') {
  await connectDB();
  httpServer.listen(port, () => console.log(`Social API listening on ${port}`));
}

export default app;
