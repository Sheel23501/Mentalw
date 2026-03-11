// WebRTC Signaling Server with Socket.IO
// Manages video call rooms and peer connections
// Run with: node ai.js

import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const server = http.createServer(app);

// Enhanced CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Data structure to track rooms and participants
const rooms = new Map();
const users = new Map();

/**
 * Room structure:
 * {
 *   id: 'room-uuid',
 *   name: 'call-xxx',
 *   createdBy: 'user-id',
 *   createdAt: Date,
 *   participants: [
 *     { id: 'user-id', socketId: 'socket-id', name: 'User Name' }
 *   ]
 * }
 */

// REST Endpoints
/**
 * POST /api/rooms
 * Create a new video call room
 */
app.post('/api/rooms', (req, res) => {
  try {
    const { userId, userName, roomName } = req.body;

    if (!userId || !userName) {
      return res.status(400).json({ message: 'userId and userName are required' });
    }

    const roomId = uuidv4();
    const finalRoomName = roomName || `call-${Date.now()}`;

    const room = {
      id: roomId,
      name: finalRoomName,
      createdBy: userId,
      createdAt: new Date(),
      participants: [
        {
          id: userId,
          socketId: null,
          name: userName,
          role: 'initiator'
        }
      ]
    };

    rooms.set(roomId, room);

    console.log(`✅ Room created: ${finalRoomName} (ID: ${roomId}) by ${userName}`);

    res.json({
      success: true,
      roomId,
      roomName: finalRoomName,
      message: 'Room created successfully'
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ message: 'Failed to create room', error: error.message });
  }
});

/**
 * GET /api/rooms/:roomId
 * Get room details
 */
app.get('/api/rooms/:roomId', (req, res) => {
  try {
    const { roomId } = req.params;
    const room = rooms.get(roomId);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        participantCount: room.participants.length,
        participants: room.participants.map(p => ({ id: p.id, name: p.name })),
        createdAt: room.createdAt
      }
    });
  } catch (error) {
    console.error('Error getting room:', error);
    res.status(500).json({ message: 'Failed to get room', error: error.message });
  }
});

/**
 * GET /api/rooms
 * List all active rooms
 */
app.get('/api/rooms', (req, res) => {
  try {
    const activeRooms = Array.from(rooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      participantCount: room.participants.length,
      createdAt: room.createdAt
    }));

    res.json({
      success: true,
      rooms: activeRooms,
      total: activeRooms.length
    });
  } catch (error) {
    console.error('Error listing rooms:', error);
    res.status(500).json({ message: 'Failed to list rooms', error: error.message });
  }
});

/**
 * DELETE /api/rooms/:roomId
 * Close a room
 */
app.delete('/api/rooms/:roomId', (req, res) => {
  try {
    const { roomId } = req.params;

    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      // Notify all participants in the room
      io.to(roomId).emit('roomClosed', { roomId, message: 'Room has been closed' });
      rooms.delete(roomId);
      console.log(`✅ Room closed: ${roomId}`);
    }

    res.json({ success: true, message: 'Room closed' });
  } catch (error) {
    console.error('Error closing room:', error);
    res.status(500).json({ message: 'Failed to close room', error: error.message });
  }
});

// Socket.IO Events
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  /**
   * Event: user:register
   * Register a user and store their socket connection
   */
  socket.on('user:register', (data) => {
    const { userId, userName } = data;
    users.set(socket.id, { userId, userName, socketId: socket.id });
    console.log(`📝 User registered: ${userName} (Socket: ${socket.id})`);
    socket.emit('user:registered', { success: true, socketId: socket.id });
  });

  /**
   * Event: room:join
   * Join an existing room
   */
  socket.on('room:join', (data) => {
    const { roomId, userId, userName } = data;
    const room = rooms.get(roomId);

    if (!room) {
      return socket.emit('room:joinFailed', { message: 'Room not found' });
    }

    // Add user to room if not already present
    if (!room.participants.find(p => p.id === userId)) {
      room.participants.push({
        id: userId,
        socketId: socket.id,
        name: userName,
        role: 'participant'
      });
    }

    // Join socket to room
    socket.join(roomId);

    console.log(`✅ User ${userName} joined room ${roomId}`);

    // Notify all users in room about new participant
    io.to(roomId).emit('room:participantJoined', {
      roomId,
      participant: { id: userId, name: userName, socketId: socket.id },
      totalParticipants: room.participants.length,
      allParticipants: room.participants.map(p => ({ id: p.id, name: p.name }))
    });

    // Send room info to the joining user
    socket.emit('room:joined', {
      success: true,
      roomId,
      participants: room.participants.map(p => ({ id: p.id, name: p.name, socketId: p.socketId }))
    });
  });

  /**
   * Event: webrtc:offer
   * Forward SDP offer from initiator to receiver
   */
  socket.on('webrtc:offer', (data) => {
    const { roomId, to, offer } = data;
    io.to(to).emit('webrtc:offer', {
      from: socket.id,
      offer
    });
    console.log(`📤 Offer sent from ${socket.id} to ${to}`);
  });

  /**
   * Event: webrtc:answer
   * Forward SDP answer from receiver back to initiator
   */
  socket.on('webrtc:answer', (data) => {
    const { to, answer } = data;
    io.to(to).emit('webrtc:answer', {
      from: socket.id,
      answer
    });
    console.log(`📥 Answer sent from ${socket.id} to ${to}`);
  });

  /**
   * Event: webrtc:ice-candidate
   * Forward ICE candidates for NAT traversal
   */
  socket.on('webrtc:ice-candidate', (data) => {
    const { to, candidate } = data;
    io.to(to).emit('webrtc:ice-candidate', {
      from: socket.id,
      candidate
    });
  });

  /**
   * Event: room:leave
   * User leaves the room
   */
  socket.on('room:leave', (data) => {
    const { roomId, userId } = data;
    const room = rooms.get(roomId);

    if (room) {
      room.participants = room.participants.filter(p => p.id !== userId);
      socket.leave(roomId);

      // Notify others
      io.to(roomId).emit('room:participantLeft', {
        roomId,
        userId,
        remainingParticipants: room.participants.length
      });

      // Close room if no participants left
      if (room.participants.length === 0) {
        rooms.delete(roomId);
        console.log(`🗑️  Room deleted: ${roomId} (no participants)`);
      }
    }

    console.log(`❌ User ${userId} left room ${roomId}`);
  });

  /**
   * Event: disconnect
   * Handle user disconnection
   */
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      console.log(`❌ User disconnected: ${user.userName} (${socket.id})`);
      users.delete(socket.id);

      // Notify rooms about disconnection
      for (const [roomId, room] of rooms.entries()) {
        const participantIndex = room.participants.findIndex(p => p.socketId === socket.id);
        if (participantIndex !== -1) {
          const participant = room.participants[participantIndex];
          room.participants.splice(participantIndex, 1);

          io.to(roomId).emit('room:participantLeft', {
            roomId,
            userId: participant.id,
            userName: participant.name,
            remainingParticipants: room.participants.length
          });

          // Delete room if empty
          if (room.participants.length === 0) {
            rooms.delete(roomId);
            console.log(`🗑️  Room deleted: ${roomId} (participant disconnect)`);
          }
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 WebRTC Signaling Server running on http://localhost:${PORT}`);
  console.log(`\n📡 Socket.IO connected for real-time signaling`);
  console.log(`\n📋 REST API Endpoints:`);
  console.log(`  POST /api/rooms - Create a new room`);
  console.log(`  GET /api/rooms - List all active rooms`);
  console.log(`  GET /api/rooms/:roomId - Get room details`);
  console.log(`  DELETE /api/rooms/:roomId - Close a room`);
  console.log(`\n🔌 Socket.IO Events:`);
  console.log(`  user:register - Register user`);
  console.log(`  room:join - Join a room`);
  console.log(`  webrtc:offer - Send SDP offer`);
  console.log(`  webrtc:answer - Send SDP answer`);
  console.log(`  webrtc:ice-candidate - Send ICE candidate`);
  console.log(`  room:leave - Leave the room\n`);
});
