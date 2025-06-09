import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import multer from 'multer';
import { GridFSBucket } from 'mongodb';
import { Readable } from 'stream';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Message Schema
const messageSchema = new mongoose.Schema({
  text: { type: String, required: true },
  sender: { type: String, required: true, enum: ['🐞', '🦎'] },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  replyTo: {
    id: String,
    text: String,
    sender: String
  },
  edited: { type: Boolean, default: false },
  voiceUrl: String,
  reaction: { type: String, enum: ['🖤', '👀', '😭', '🌚', '🤣', '👍'] }
});

const Message = mongoose.model('Message', messageSchema);

// User Status Schema
const userStatusSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, enum: ['🐞', '🦎'] },
  lastSeen: { type: Date, default: Date.now },
  isOnline: { type: Boolean, default: false },
  isTyping: { type: Boolean, default: false }
});

const UserStatus = mongoose.model('UserStatus', userStatusSchema);

// GridFS setup for file storage
let gfsBucket;
mongoose.connection.once('open', () => {
  gfsBucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'voiceMessages'
  });
});

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Socket.io connection handling
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('user-login', async (userId) => {
    connectedUsers.set(socket.id, userId);
    socket.userId = userId;
    
    // Update user status
    await UserStatus.findOneAndUpdate(
      { userId },
      { isOnline: true, lastSeen: new Date() },
      { upsert: true }
    );

    // Broadcast status update
    const statuses = await UserStatus.find({});
    io.emit('user-statuses', statuses);
  });

  socket.on('typing', async (data) => {
    const { userId, isTyping } = data;
    
    await UserStatus.findOneAndUpdate(
      { userId },
      { isTyping },
      { upsert: true }
    );

    socket.broadcast.emit('user-typing', { userId, isTyping });
  });

  socket.on('send-message', async (messageData) => {
    try {
      const message = new Message(messageData);
      await message.save();
      
      io.emit('new-message', message);
    } catch (error) {
      console.error('Error saving message:', error);
      socket.emit('error', 'Failed to send message');
    }
  });

  socket.on('edit-message', async (data) => {
    try {
      const { messageId, text } = data;
      const message = await Message.findByIdAndUpdate(
        messageId,
        { text, edited: true },
        { new: true }
      );
      
      io.emit('message-edited', message);
    } catch (error) {
      console.error('Error editing message:', error);
      socket.emit('error', 'Failed to edit message');
    }
  });

  socket.on('delete-message', async (messageId) => {
    try {
      await Message.findByIdAndDelete(messageId);
      io.emit('message-deleted', messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
      socket.emit('error', 'Failed to delete message');
    }
  });

  socket.on('react-to-message', async (data) => {
    try {
      const { messageId, reaction } = data;
      const message = await Message.findByIdAndUpdate(
        messageId,
        { reaction },
        { new: true }
      );
      
      io.emit('message-reaction', message);
    } catch (error) {
      console.error('Error adding reaction:', error);
      socket.emit('error', 'Failed to add reaction');
    }
  });

  socket.on('remove-reaction', async (messageId) => {
    try {
      const message = await Message.findByIdAndUpdate(
        messageId,
        { $unset: { reaction: 1 } },
        { new: true }
      );
      
      io.emit('message-reaction', message);
    } catch (error) {
      console.error('Error removing reaction:', error);
      socket.emit('error', 'Failed to remove reaction');
    }
  });

  socket.on('mark-as-read', async (data) => {
    try {
      const { messageId, userId } = data;
      await Message.findByIdAndUpdate(messageId, { read: true });
      io.emit('message-read', { messageId, userId });
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  });

  socket.on('disconnect', async () => {
    const userId = connectedUsers.get(socket.id);
    if (userId) {
      connectedUsers.delete(socket.id);
      
      // Update user status
      await UserStatus.findOneAndUpdate(
        { userId },
        { isOnline: false, lastSeen: new Date(), isTyping: false }
      );

      // Broadcast status update
      const statuses = await UserStatus.find({});
      io.emit('user-statuses', statuses);
    }
    console.log('User disconnected:', socket.id);
  });
});

// REST API Routes

// Get all messages
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await Message.find({}).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Delete all messages
app.delete('/api/messages', async (req, res) => {
  try {
    await Message.deleteMany({});
    io.emit('all-messages-deleted');
    res.json({ message: 'All messages deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete messages' });
  }
});

// Get user statuses
app.get('/api/user-statuses', async (req, res) => {
  try {
    const statuses = await UserStatus.find({});
    res.json(statuses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user statuses' });
  }
});

// Upload voice message
app.post('/api/upload-voice', upload.single('voice'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { sender } = req.body;
    const filename = `voice-${sender}-${Date.now()}.webm`;
    
    const uploadStream = gfsBucket.openUploadStream(filename, {
      contentType: 'audio/webm'
    });

    const readableStream = new Readable();
    readableStream.push(req.file.buffer);
    readableStream.push(null);

    readableStream.pipe(uploadStream);

    uploadStream.on('finish', async () => {
      const voiceUrl = `/api/voice/${uploadStream.id}`;
      
      // Create voice message
      const message = new Message({
        text: '🎤 Voice message',
        sender,
        voiceUrl,
        timestamp: new Date()
      });

      await message.save();
      io.emit('new-message', message);
      
      res.json({ voiceUrl, messageId: message._id });
    });

    uploadStream.on('error', (error) => {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to upload voice message' });
    });

  } catch (error) {
    console.error('Voice upload error:', error);
    res.status(500).json({ error: 'Failed to upload voice message' });
  }
});

// Serve voice messages
app.get('/api/voice/:id', async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const downloadStream = gfsBucket.openDownloadStream(fileId);

    downloadStream.on('error', (error) => {
      console.error('Download error:', error);
      res.status(404).json({ error: 'Voice message not found' });
    });

    res.set('Content-Type', 'audio/webm');
    downloadStream.pipe(res);
  } catch (error) {
    console.error('Voice serve error:', error);
    res.status(500).json({ error: 'Failed to serve voice message' });
  }
});

const PORT = process.env.PORT || 3001;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});