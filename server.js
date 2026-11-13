require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const initChat = require('./src/sockets/chat');
const registerListeners = require('./src/events/listeners');

const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  console.error('[server] JWT_SECRET is not set. Copy .env.example to .env and set it.');
  process.exit(1);
}

(async () => {
  await connectDB();

  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: false } });

  registerListeners();   // EventEmitter subscribers
  initChat(io);          // Socket.IO real-time chat

  server.listen(PORT, () => console.log(`[server] listening on http://localhost:${PORT}`));

  const shutdown = () => {
    console.log('\n[server] shutting down...');
    io.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})();
