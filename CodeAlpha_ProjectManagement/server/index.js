import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { connectDB } from './config/db.js';
import Project from './models/Project.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import notificationRoutes from './routes/notifications.js';

const app = express();
app.set('trust proxy', 1);
const origin = process.env.CLIENT_URL || 'http://localhost:5175';
app.use(helmet());
app.use(cors({ origin, credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
app.use(mongoSanitize());
app.use(hpp());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/notifications', notificationRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || (err.name === 'CastError' ? 400 : 500);
  const message = status === 500 ? 'Server error' : err.message || 'Invalid id';
  res.status(status).json({ message });
});

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
    if (!decoded.id) return next(new Error('Unauthorized'));
    socket.userId = decoded.id;
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.userId}`);
  socket.on('join-project', async (projectId) => {
    try {
      const project = await Project.findById(projectId);
      if (!project) return;
      const isMember = project.members.some((id) => id.toString() === socket.userId);
      if (!isMember) return;
      socket.join(`project:${projectId}`);
    } catch {
      /* ignore bad ids */
    }
  });
});

const port = process.env.PORT || 5003;
if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}

if (process.env.NODE_ENV !== 'test') {
  await connectDB();
  httpServer.listen(port, () => console.log(`Projects API listening on ${port}`));
}

export default app;
