const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken, extractToken } = require('../utils/token');

// Protects a route: requires a valid JWT (Authorization header or "token" cookie)
const authenticate = asyncHandler(async (req, res, next) => {
  const token = extractToken(req.headers);
  if (!token) throw new AppError('No token provided', 403);

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    throw new AppError('Invalid or expired token', 401);
  }

  // Make sure the account still exists and use the role stored in the DB
  const user = await User.findById(decoded.id).select('username email role');
  if (!user) throw new AppError('User no longer exists', 401);

  req.user = { id: user.id, username: user.username, email: user.email, role: user.role };
  next();
});

// Role-based access control: authorize('admin'), authorize('admin', 'moderator'), ...
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('Access denied: insufficient permissions', 403));
  }
  next();
};

module.exports = { authenticate, authorize };
