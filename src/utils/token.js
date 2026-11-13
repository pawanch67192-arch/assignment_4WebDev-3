const jwt = require('jsonwebtoken');

const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });

const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

// Minimal cookie parser (cookie-parser is not in the allowed library list)
const parseCookies = (header = '') =>
  header
    .split(';')
    .map((c) => c.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const i = pair.indexOf('=');
      if (i > 0) {
        try {
          acc[pair.slice(0, i)] = decodeURIComponent(pair.slice(i + 1));
        } catch {
          /* ignore malformed cookie */
        }
      }
      return acc;
    }, {});

// Accepts "Authorization: Bearer <token>" or an httpOnly "token" cookie
const extractToken = (headers = {}) => {
  const auth = headers.authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return parseCookies(headers.cookie).token || null;
};

module.exports = { signToken, verifyToken, extractToken, parseCookies };
