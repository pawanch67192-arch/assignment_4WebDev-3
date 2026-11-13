const User = require('../models/User');
const Message = require('../models/Message');
const { verifyToken, extractToken } = require('../utils/token');
const { emitter, EVENTS } = require('../events/appEvents');

const DEFAULT_ROOM = 'general';
const ROOM_RE = /^[a-zA-Z0-9_-]{1,30}$/;
const MAX_LEN = 500;
const HISTORY = 50;

const oneLine = (s) => String(s).replace(/[\r\n]+/g, ' '); // keep console logs on one line
const reply = (ack, payload) => typeof ack === 'function' && ack(payload);

module.exports = function initChat(io) {
  const online = new Map(); // userId -> Set(socketId)  (used for private messages)

  // ---- Authentication: socket must present a valid JWT during the handshake ----
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || extractToken(socket.handshake.headers);
      if (!token) return next(new Error('No token provided'));

      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id).select('username role');
      if (!user) return next(new Error('User not found'));

      socket.user = { id: user.id, username: user.username, role: user.role };
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, username } = socket.user;

    if (!online.has(userId)) online.set(userId, new Set());
    online.get(userId).add(socket.id);

    console.log(`User connected: ${socket.id}`);
    emitter.emit(EVENTS.CHAT_CONNECTED, { socketId: socket.id, userId, username });

    // ---- Rooms ----
    const joinRoom = async (room, ack) => {
      if (typeof room !== 'string' || !ROOM_RE.test(room)) {
        return reply(ack, { ok: false, error: 'Invalid room name (1-30 letters, numbers, - or _)' });
      }
      await socket.join(room);
      console.log(`${socket.id} joined room ${room}`);

      const rows = await Message.find({ room }).sort({ createdAt: -1 }).limit(HISTORY).lean();
      socket.emit('roomHistory', { room, messages: rows.reverse() });
      socket.to(room).emit('userJoined', { room, username });
      reply(ack, { ok: true, room });
    };

    joinRoom(DEFAULT_ROOM).catch((e) => console.error('[chat] join error:', e.message));

    socket.on('joinRoom', (room, ack) =>
      joinRoom(room, ack).catch(() => reply(ack, { ok: false, error: 'Could not join room' }))
    );

    socket.on('leaveRoom', (room, ack) => {
      if (typeof room !== 'string' || !socket.rooms.has(room)) {
        return reply(ack, { ok: false, error: 'You are not in that room' });
      }
      socket.leave(room);
      socket.to(room).emit('userLeft', { room, username });
      console.log(`${socket.id} left room ${room}`);
      reply(ack, { ok: true, room });
    });

    // ---- Group chat ----
    socket.on('chatMessage', async (data, ack) => {
      try {
        const room = data && data.room;
        const text = data && typeof data.message === 'string' ? data.message.trim() : '';

        if (typeof room !== 'string' || !socket.rooms.has(room)) {
          return reply(ack, { ok: false, error: 'Join the room before sending messages' });
        }
        if (!text || text.length > MAX_LEN) {
          return reply(ack, { ok: false, error: `Message must be 1-${MAX_LEN} characters` });
        }

        const saved = await Message.create({ room, sender: userId, username, text });
        const payload = { id: saved.id, room, username, message: text, createdAt: saved.createdAt };

        io.to(room).emit('chatMessage', payload);
        console.log(`[${room}] ${username}: ${oneLine(text)}`);
        emitter.emit(EVENTS.CHAT_MESSAGE, { room, userId, username });
        reply(ack, { ok: true });
      } catch (e) {
        console.error('[chat] message error:', e.message);
        reply(ack, { ok: false, error: 'Message could not be sent' });
      }
    });

    // ---- Private message to one user ----
    socket.on('privateMessage', (data, ack) => {
      const toUserId = data && data.toUserId;
      const text = data && typeof data.message === 'string' ? data.message.trim() : '';
      if (!text || text.length > MAX_LEN) {
        return reply(ack, { ok: false, error: `Message must be 1-${MAX_LEN} characters` });
      }
      const targets = online.get(toUserId);
      if (!targets || targets.size === 0) return reply(ack, { ok: false, error: 'User is offline' });

      targets.forEach((sid) =>
        io.to(sid).emit('privateMessage', { from: username, fromId: userId, message: text, createdAt: new Date() })
      );
      console.log(`[private] ${username} -> ${toUserId}: ${oneLine(text)}`);
      reply(ack, { ok: true });
    });

    // ---- Typing indicator ----
    socket.on('typing', (room) => {
      if (typeof room === 'string' && socket.rooms.has(room)) socket.to(room).emit('typing', { room, username });
    });

    socket.on('disconnect', () => {
      const set = online.get(userId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) online.delete(userId);
      }
      console.log(`User disconnected: ${socket.id}`);
      emitter.emit(EVENTS.CHAT_DISCONNECTED, { socketId: socket.id, userId, username });
    });
  });
};
