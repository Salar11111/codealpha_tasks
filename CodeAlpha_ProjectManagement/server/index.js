import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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
const origin = process.env.CLIENT_URL || 'http://localhost:5175';
app.use(cors({ origin }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
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
const io = new Server(httpServer, { cors: { origin } });
app.set('io', io);

io.use((socket, next) => {
  try {
    const decoded = jwt.verify(socket.handshake.auth?.token || '', process.env.JWT_SECRET);
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
await connectDB();
httpServer.listen(port, () => console.log(`Projects API listening on ${port}`));
