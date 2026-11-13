# Secure Connect and Communication Platform

**Assignment 4 – Web Dev III (Unit 4)**
**Author:** Pawan Chauhan

A secure backend built with **Node.js, Express, MongoDB (Mongoose), JWT, bcrypt, Socket.IO and dotenv** – no pre-built
auth or chat frameworks.

## Features
| Module | What it does |
|--------|--------------|
| Signup / Login | Input validation, bcrypt-hashed passwords (salted), duplicate checks, generic login errors |
| JWT authentication | Signed token (`id`, `role`, expiry) returned in the response **and** set as an httpOnly cookie |
| Protected routes | `authenticate` middleware accepts `Authorization: Bearer <token>` or the `token` cookie |
| RBAC | `authorize('admin')` guards the `/api/admin/*` routes |
| Secure Notes API | Full CRUD; every query is scoped to the logged-in owner (other users' notes return 404) |
| Real-time chat | Socket.IO with JWT-authenticated handshake, rooms, history, typing, private messages |
| Event-driven features | Central `EventEmitter` -> listeners for logging, counters and brute-force alerts |

## Setup
```bash
npm install
cp .env.example .env        # Windows: copy .env.example .env
# edit .env -> set JWT_SECRET (and MONGO_URI if needed)
npm start                   # or: npm run dev
```
Requires Node.js 18+ and MongoDB running locally (or an Atlas URI in `MONGO_URI`).

Generate a strong secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Project structure
```
server.js                       HTTP server + Socket.IO bootstrap
public/index.html               browser chat test client  ->  http://localhost:5000
src/
  app.js                        express app, security headers, routes
  config/db.js
  models/        User, Note, Message
  controllers/   auth, note, admin
  routes/        authRoutes, noteRoutes, adminRoutes
  middleware/    auth (authenticate + authorize), validate, errorHandler
  events/        appEvents (EventEmitter), listeners
  sockets/chat.js
  utils/         token helpers, AppError, asyncHandler
```

## REST API
| Method | Endpoint | Auth | Description |
|-------:|----------|------|-------------|
| POST | `/api/auth/signup` | – | Register: `{ username, email, password }` -> 201 |
| POST | `/api/auth/login` | – | `{ email, password }` -> `{ message, token }` (+ cookie) |
| POST | `/api/auth/logout` | – | Clears the cookie |
| GET  | `/api/auth/me` | JWT | Current user |
| POST | `/api/notes` | JWT | Create note `{ title, content }` |
| GET  | `/api/notes` | JWT | List my notes |
| GET  | `/api/notes/:id` | JWT | Get one of my notes |
| PUT  | `/api/notes/:id` | JWT | Update title and/or content |
| DELETE | `/api/notes/:id` | JWT | Delete note |
| GET  | `/api/admin/users` | JWT + admin | List all users |
| DELETE | `/api/admin/users/:id` | JWT + admin | Delete user and their notes |
| GET  | `/api/admin/notes` | JWT + admin | All notes with owner info |
| GET  | `/api/admin/stats` | JWT + admin | Event counters from the EventEmitter |

### Testing flow (Postman)
1. `POST /api/auth/signup`  `{ "username": "victor", "email": "victor@example.com", "password": "123456" }`
2. `POST /api/auth/login` -> copy the `token`
3. `GET /api/notes` with **no** token -> `403 {"message":"No token provided"}`
4. Add header `Authorization: Bearer <token>` -> `POST /api/notes` `{ "title": "My First Note", "content": "..." }`, then `GET /api/notes`

**Admin user:** sign up with the email set in `ADMIN_EMAIL` (in `.env`) to get the `admin` role.
Roles can never be set from the signup body, so users cannot make themselves admins.

## Real-time chat (Socket.IO)
Open `http://localhost:5000` in two browser tabs, sign up two users, log in, and chat.

The socket handshake must include the JWT: `io({ auth: { token } })` (otherwise `connect_error: No token provided`).

| Client emits | Payload | Server behaviour |
|--------------|---------|------------------|
| `joinRoom` | `"room"` | joins room, sends `roomHistory`, broadcasts `userJoined` |
| `leaveRoom` | `"room"` | leaves room, broadcasts `userLeft` |
| `chatMessage` | `{ room, message }` | saves it and broadcasts `chatMessage` to the room |
| `privateMessage` | `{ toUserId, message }` | delivers to that user's sockets only |
| `typing` | `"room"` | broadcasts `typing` to others in the room |

Every user is placed in room `general` automatically on connect. Server console output:
```
User connected: sK92_xT31Qp
sK92_xT31Qp joined room general
[general] Aditi: Hey team, backend is ready
```

## Event-driven design (Node.js EventEmitter)
Controllers and sockets only **emit** events (`src/events/appEvents.js`); `src/events/listeners.js` **subscribes** to them.

| Event | Fired when | Listener action |
|-------|-----------|-----------------|
| `user:registered` | signup succeeds | log |
| `user:loggedIn` | login succeeds | log, reset failed-login counter |
| `auth:loginFailed` | wrong credentials | count failures per email |
| `security:alert` | 5 failed logins in a row | console warning |
| `note:created/updated/deleted` | notes API | log |
| `chat:connected/disconnected/message` | socket activity | log |

All events are also counted and exposed to admins at `GET /api/admin/stats`.

## Security notes
- Passwords hashed with bcrypt (configurable salt rounds); hashes are never returned (`select: false`)
- Same error message for unknown email / wrong password, plus constant-time-ish compare to limit user enumeration
- `typeof` checks on inputs prevent NoSQL-injection objects; request body size limited to 10 kb
- httpOnly + SameSite=strict cookie (Secure in production); JWT secret only from environment
- Owner-scoped queries and role checks on the server; role comes from the DB, not from the token alone
- Socket connections are rejected without a valid JWT; chat input is length-limited and rendered with `textContent`
