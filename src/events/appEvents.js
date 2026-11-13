const EventEmitter = require('events');

// One shared emitter for the whole app. Controllers / sockets only EMIT events;
// listeners (see listeners.js) decide what to do with them -> loose coupling.
class AppEmitter extends EventEmitter {}

const emitter = new AppEmitter();

const EVENTS = {
  USER_REGISTERED: 'user:registered',
  USER_LOGGED_IN: 'user:loggedIn',
  LOGIN_FAILED: 'auth:loginFailed',
  SECURITY_ALERT: 'security:alert',
  NOTE_CREATED: 'note:created',
  NOTE_UPDATED: 'note:updated',
  NOTE_DELETED: 'note:deleted',
  CHAT_CONNECTED: 'chat:connected',
  CHAT_DISCONNECTED: 'chat:disconnected',
  CHAT_MESSAGE: 'chat:message',
};

module.exports = { emitter, EVENTS };
