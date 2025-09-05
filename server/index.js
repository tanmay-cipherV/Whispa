// server/index.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Setup socket.io server with CORS allowed
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_ORIGIN === '*' ? true : process.env.CLIENT_ORIGIN }
});

// Middlewares
app.use(cors());              // allow frontend to call API
app.use(express.json());      // parse JSON request bodies
app.use(morgan('dev'));       // log HTTP requests in console

// --- DB ---
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('Mongo connected');
}).catch(err => {
  console.error('Mongo error', err);
  process.exit(1);
});

// --- Models (tables in MongoDB) ---
const { Schema, model, Types } = mongoose;

const UserSchema = new Schema({
  username: { type: String, unique: true, required: true, trim: true },
  passwordHash: { type: String, required: true },
  lastSeen: Date
}, { timestamps: true });

const ConversationSchema = new Schema({
  members: [{ type: Types.ObjectId, ref: 'User' }],
  lastMessage: { type: Types.ObjectId, ref: 'Message' }
}, { timestamps: true });

const MessageSchema = new Schema({
  conversation: { type: Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: Types.ObjectId, ref: 'User', required: true },
  recipient: { type: Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true },
  deliveredAt: Date,
  readAt: Date
}, { timestamps: true });

const User = model('User', UserSchema);
const Conversation = model('Conversation', ConversationSchema);
const Message = model('Message', MessageSchema);

// --- Helpers ---
const signJWT = (user) =>
  jwt.sign({ sub: user._id.toString(), username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Middleware: check JWT for protected routes
const auth = async (req, res, next) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// --- REST ---
// Register user
app.post('/auth/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username & password required' });
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, passwordHash });
    const token = signJWT(user);
    res.json({ token, user: { _id: user._id, username: user.username } });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ error: 'Username already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

// Login user
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = signJWT(user);
  res.json({ token, user: { _id: user._id, username: user.username } });
});

// Users list (excluding me) with online/offline
const onlineUsers = new Map(); // userId -> socketId
app.get('/users', auth, async (req, res) => {
  const me = req.userId;
  const users = await User.find({ _id: { $ne: me } }, { username: 1 }).lean();
  const withPresence = users.map(u => ({
    ...u,
    online: onlineUsers.has(u._id.toString())
  }));
  res.json(withPresence);
});

// Messages for a 1:1 conversation
async function getOrCreateConversation(a, b) {
  let convo = await Conversation.findOne({ members: { $all: [a, b] }, $expr: { $eq: [{ $size: "$members" }, 2] } });
  if (!convo) convo = await Conversation.create({ members: [a, b] });
  return convo;
}

app.get('/conversations/:id/messages', auth, async (req, res) => {
  const me = req.userId;
  const other = req.params.id;
  const convo = await getOrCreateConversation(me, other);
  const msgs = await Message.find({ conversation: convo._id }).sort({ createdAt: 1 }).lean();
  res.json({ conversationId: convo._id, messages: msgs });
});

// --- Socket.IO realtime ---
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.sub;
    return next();
  } catch {
    return next(new Error('Bad token'));
  }
});

io.on('connection', async (socket) => {
  const userId = socket.userId;
  onlineUsers.set(userId, socket.id);
  io.emit('presence:update', { userId, online: true });

  socket.on('typing:start', ({ to }) => {
    const toSocket = onlineUsers.get(to);
    if (toSocket) io.to(toSocket).emit('typing:start', { from: userId });
  });

  socket.on('typing:stop', ({ to }) => {
    const toSocket = onlineUsers.get(to);
    if (toSocket) io.to(toSocket).emit('typing:stop', { from: userId });
  });

  socket.on('message:send', async ({ to, body, tempId }) => {
    if (!to || !body) return;
    const convo = await getOrCreateConversation(userId, to);
    const msg = await Message.create({
      conversation: convo._id,
      sender: userId,
      recipient: to,
      body
    });
    await Conversation.findByIdAndUpdate(convo._id, { lastMessage: msg._id }, { new: true });

    // delivery
    const toSocket = onlineUsers.get(to);
    if (toSocket) {
      msg.deliveredAt = new Date();
      await msg.save();
    }

    // echo to sender
    io.to(socket.id).emit('message:new', { ...msg.toObject(), tempId });

    // deliver to recipient
    if (toSocket) {
      io.to(toSocket).emit('message:new', msg);
    }
  });

  // mark as read
  socket.on('message:read', async ({ conversationId }) => {
    if (!conversationId) return;
    const now = new Date();
    await Message.updateMany(
      { conversation: conversationId, recipient: userId, readAt: { $exists: false } },
      { $set: { readAt: now } }
    );
    const convo = await Conversation.findById(conversationId).lean();
    if (!convo) return;
    const other = convo.members.map(String).find(id => id !== userId);
    const otherSocket = onlineUsers.get(other);
    if (otherSocket) io.to(otherSocket).emit('message:read', { conversationId, readAt: now });
  });

  socket.on('disconnect', async () => {
    onlineUsers.delete(userId);
    await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
    io.emit('presence:update', { userId, online: false });
  });
});

// Start server
server.listen(process.env.PORT, () => {
  console.log('Server on http://localhost:' + process.env.PORT);
});
