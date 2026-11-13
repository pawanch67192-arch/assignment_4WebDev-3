const path = require('path');
const express = require('express');
const authRoutes = require('./routes/authRoutes');
const noteRoutes = require('./routes/noteRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));

// Basic security headers (helmet is not in the allowed library list)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

// Tiny browser chat client for testing the Socket.IO features
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
