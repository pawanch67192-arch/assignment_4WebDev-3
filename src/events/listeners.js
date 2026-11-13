const { emitter, EVENTS } = require('./appEvents');

const MAX_FAILED_LOGINS = 5;
const failedLogins = new Map(); // email -> consecutive failures
const stats = {};               // event name -> times fired
const startedAt = new Date();

const count = (name) => {
  stats[name] = (stats[name] || 0) + 1;
};

const getStats = () => ({ since: startedAt.toISOString(), events: { ...stats } });

module.exports = function registerListeners() {
  // Count every application event
  Object.values(EVENTS).forEach((name) => emitter.on(name, () => count(name)));

  emitter.on(EVENTS.USER_REGISTERED, ({ username, role }) =>
    console.log(`[event] new user registered: ${username} (${role})`)
  );

  emitter.on(EVENTS.USER_LOGGED_IN, ({ username, email }) => {
    failedLogins.delete(email); // reset counter on success
    console.log(`[event] user logged in: ${username}`);
  });

  // Brute-force detection: too many failed logins -> raise a security alert
  emitter.on(EVENTS.LOGIN_FAILED, ({ email, ip }) => {
    const n = (failedLogins.get(email) || 0) + 1;
    failedLogins.set(email, n);
    if (n >= MAX_FAILED_LOGINS) {
      emitter.emit(EVENTS.SECURITY_ALERT, {
        reason: `${n} failed login attempts`,
        email,
        ip,
      });
    }
  });

  emitter.on(EVENTS.SECURITY_ALERT, ({ reason, email, ip }) =>
    console.warn(`[security] ALERT: ${reason} for "${email}" from ${ip}`)
  );

  emitter.on(EVENTS.NOTE_CREATED, ({ noteId, owner }) =>
    console.log(`[event] note created: ${noteId} by user ${owner}`)
  );
  emitter.on(EVENTS.NOTE_UPDATED, ({ noteId }) => console.log(`[event] note updated: ${noteId}`));
  emitter.on(EVENTS.NOTE_DELETED, ({ noteId }) => console.log(`[event] note deleted: ${noteId}`));

  emitter.on(EVENTS.CHAT_CONNECTED, ({ username }) => console.log(`[event] ${username} came online`));
  emitter.on(EVENTS.CHAT_DISCONNECTED, ({ username }) => console.log(`[event] ${username} went offline`));
};

module.exports.getStats = getStats;
