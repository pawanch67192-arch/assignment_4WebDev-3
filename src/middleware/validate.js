const AppError = require('../utils/AppError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;
const isString = (v) => typeof v === 'string';

const validateSignup = (req, res, next) => {
  const { username, email, password } = req.body || {};
  if (!isString(username) || !USERNAME_RE.test(username.trim())) {
    return next(new AppError('Username must be 3-30 characters (letters, numbers, underscore)', 400));
  }
  if (!isString(email) || !EMAIL_RE.test(email.trim())) {
    return next(new AppError('A valid email is required', 400));
  }
  // bcrypt only uses the first 72 bytes, so reject longer passwords
  if (!isString(password) || password.length < 6 || Buffer.byteLength(password) > 72) {
    return next(new AppError('Password must be 6-72 characters', 400));
  }
  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body || {};
  // typeof checks also block NoSQL-injection payloads like { "email": { "$gt": "" } }
  if (!isString(email) || !isString(password) || !email || !password) {
    return next(new AppError('Email and password are required', 400));
  }
  next();
};

const validateNote = (isCreate) => (req, res, next) => {
  const { title, content } = req.body || {};
  if (title !== undefined && (!isString(title) || !title.trim() || title.length > 100)) {
    return next(new AppError('Title must be a non-empty string up to 100 characters', 400));
  }
  if (content !== undefined && (!isString(content) || content.length > 5000)) {
    return next(new AppError('Content must be a string up to 5000 characters', 400));
  }
  if (isCreate && title === undefined) return next(new AppError('Title is required', 400));
  if (!isCreate && title === undefined && content === undefined) {
    return next(new AppError('Provide title and/or content to update', 400));
  }
  // whitelist: owner / timestamps can never be set by the client
  req.body = { ...(title !== undefined && { title: title.trim() }), ...(content !== undefined && { content }) };
  next();
};

const validateObjectId = (req, res, next, id) => {
  if (!/^[0-9a-fA-F]{24}$/.test(id)) return next(new AppError(`Invalid id: ${id}`, 400));
  next();
};

module.exports = { validateSignup, validateLogin, validateNote, validateObjectId };
