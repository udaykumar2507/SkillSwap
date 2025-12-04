// ================================
// Imports
// ================================
import express from 'express';
import http from 'http';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { Server as IOServer } from 'socket.io';

import connectDB from './config/db.js';
import Meeting from './models/Meeting.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import meetingsRoutes from './routes/meetings.js';
import requestsRoutes from './routes/requests.js';
import notificationsRoutes from './routes/notifications.js';
import paymentRoutes from './routes/payment.js';


// ================================
// Environment Setup & DB Connect
// ================================
dotenv.config();
connectDB();


// ================================
// Express App Setup
// ================================
const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));


// ================================
// HTTP + Socket.IO Setup
// ================================
const server = http.createServer(app);

const io = new IOServer(server, {
  cors: {
    origin: process.env.FRONTEND_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});


// ================================
// Socket Auth
// ================================
io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token;

    if (!token) return next(new Error('Auth token required'));

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.id;

    next();
  } catch (err) {
    console.error('socket auth failed', err);
    next(new Error('Authentication error'));
  }
});


// ================================
// WebRTC Room State Store
// ================================
const roomState = new Map();


// ================================
// Socket.IO Events
// ================================
io.on('connection', (socket) => {
  console.log('socket connected:', socket.id, 'user:', socket.userId);

  // -------------------
  // Join Room
  // -------------------
  socket.on('join-room', (payload, ack) => {
    try {
      const { roomName } = payload;
      if (!roomName) return ack({ error: 'roomName required' });

      socket.join(roomName);

      let rs = roomState.get(roomName);
      if (!rs) {
        rs = { sockets: new Set(), startAt: null, meetingId: null, classIndex: null };
        roomState.set(roomName, rs);
      }

      rs.sockets.add(socket.id);

      const existingPeers = Array.from(rs.sockets).filter(id => id !== socket.id);

      socket.emit('peers', { peers: existingPeers });
      socket.to(roomName).emit('peer-joined', { socketId: socket.id, userId: socket.userId });

      ack({ ok: true, peers: existingPeers });
    } catch (error) {
      console.error('join-room error', error);
      ack({ error: 'join failed' });
    }
  });


  // -------------------
  // Signal Relay
  // -------------------
  socket.on('signal', ({ to, signal }) => {
    if (to && signal) {
      io.to(to).emit('signal', { from: socket.id, signal });
    }
  });


  // -------------------
  // Call Started
  // -------------------
  socket.on('call-started', ({ roomName, meetingId, classIndex }) => {
    try {
      if (!roomName) return;

      const rs = roomState.get(roomName) || { sockets: new Set(), startAt: null };
      if (!rs.startAt) {
        rs.startAt = new Date().toISOString();
        rs.meetingId = meetingId || rs.meetingId;
        rs.classIndex = typeof classIndex === 'number' ? classIndex : rs.classIndex;
        roomState.set(roomName, rs);

        io.to(roomName).emit('call-started', { startAt: rs.startAt });
        console.log('call-started:', roomName, rs.startAt);
      }
    } catch (err) {
      console.error('call-started error', err);
    }
  });


  // -------------------
  // Call Ended
  // -------------------
  socket.on('call-ended', (payload) => {
    try {
      const { roomName } = payload;
      if (!roomName) return;

      const rs = roomState.get(roomName);
      if (rs) {
        setTimeout(() => roomState.delete(roomName), 5 * 60 * 1000);
      }

      io.to(roomName).emit('call-ended', payload);
      console.log('call-ended', roomName, payload);
    } catch (err) {
      console.error('call-ended error', err);
    }
  });


  // -------------------
  // Disconnect
  // -------------------
  socket.on('disconnect', () => {
    for (const [roomName, rs] of roomState.entries()) {
      if (rs.sockets.has(socket.id)) {
        rs.sockets.delete(socket.id);

        socket.to(roomName).emit('peer-left', { socketId: socket.id });

        if (rs.sockets.size === 0) {
          setTimeout(() => {
            const curr = roomState.get(roomName);
            if (curr && curr.sockets.size === 0) roomState.delete(roomName);
          }, 5 * 60 * 1000);
        }
      }
    }
  });
});


// Expose io instance
app.set('io', io);


// ================================
// REST Routes
// ================================
app.get('/', (req, res) => res.send('SkillSwap API running'));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/payment', paymentRoutes);


// ================================
// Start Server (single port)
// ================================
const PORT = process.env.PORT || 5000;

server.listen(PORT,'0.0.0.0' ,() =>
  console.log(`Server + Socket.IO running on port ${PORT}`)
);
