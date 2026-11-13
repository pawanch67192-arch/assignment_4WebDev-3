const bcrypt = require('bcrypt');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');
const { emitter, EVENTS } = require('../events/appEvents');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;

// Pre-computed hash used to keep login timing similar when the email doesn't exist
const DUMMY_HASH = bcrypt.hashSync('dummy-password', SALT_ROUNDS);

// POST /api/auth/signup
exports.signup = asyncHandler(async (req, res) => {
  const username = req.body.username.trim();
  const email = req.body.email.trim().toLowerCase();

  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    throw new AppError(
      existing.email === email ? 'Email is already registered' : 'Username is already taken',
      409
    );
  }

  const password = await bcrypt.hash(req.body.password, SALT_ROUNDS);
  const isAdmin = process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL.trim().toLowerCase();
  const user = await User.create({ username, email, password, role: isAdmin ? 'admin' : 'user' });

  emitter.emit(EVENTS.USER_REGISTERED, { id: user.id, username: user.username, role: user.role });

  res.status(201).json({
    message: 'User registered',
    id: user.id,
    username: user.username,
    email: user.email,
  });
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const email = req.body.email.trim().toLowerCase();
  const user = await User.findOne({ email }).select('+password');

  const valid = await bcrypt.compare(req.body.password, user ? user.password : DUMMY_HASH);
  if (!user || !valid) {
    emitter.emit(EVENTS.LOGIN_FAILED, { email, ip: req.ip });
    throw new AppError('Invalid email or password', 401); // same message for both cases
  }

  const token = signToken(user);

  // Also set the token as an httpOnly cookie (not readable from JavaScript -> XSS-safe)
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 1000,
  });

  emitter.emit(EVENTS.USER_LOGGED_IN, { id: user.id, username: user.username, email });
  res.json({ message: 'Login successful', token });
});

// POST /api/auth/logout
exports.logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
};

// GET /api/auth/me   (protected)
exports.me = (req, res) => res.json({ user: req.user });
