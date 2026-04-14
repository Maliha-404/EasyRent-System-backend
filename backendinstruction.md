# EasyRent Backend Instruction Guide

This guide explains how the backend authentication system is organized, where each code file lives, how routes/controllers/middleware work together, and how API endpoints are created.

## 1. Backend Folder Map

- `server.js`: app entry point, middleware setup, route mounting, server start.
- `config/db.js`: MongoDB connection setup and shared database accessor.
- `routes/authRoutes.js`: public auth endpoints (`/register`, `/login`) and protected `/me` endpoint.
- `routes/adminRoutes.js`: admin-only endpoints for overview, user listing, and status updates.
- `controllers/authController.js`: registration, login, and current-user business logic.
- `controllers/adminController.js`: admin user management and dashboard metrics logic.
- `middlewares/authMiddleware.js`: JWT verification and role-based access checks.
- `scripts/seedUsers.js`: creates or updates demo admin/user/owner accounts.

## 2. How the Server Boots

In `server.js`:

1. Loads environment variables with `dotenv.config()`.
2. Creates Express app.
3. Applies middleware:
   - `cors()` for cross-origin requests.
   - `express.json()` to parse JSON request bodies.
4. Mounts route modules:
   - `app.use('/api/auth', require('./routes/authRoutes'))`
   - `app.use('/api/admin', require('./routes/adminRoutes'))`
5. Connects to MongoDB with `connectDB()`.
6. Starts listening on `PORT`.

## 3. How API Endpoints Are Generated

Endpoint paths are formed by combining:

- A base path in `server.js` (`/api/auth`, `/api/admin`)
- A route path in each router file

Examples:

- In `server.js`, auth router mounted at `/api/auth`.
- In `routes/authRoutes.js`, `router.post('/login', loginUser)`.
- Final endpoint becomes: `POST /api/auth/login`.

Same pattern for admin:

- Base mount: `/api/admin`
- Route: `router.get('/users', getAllUsersForAdmin)`
- Final endpoint: `GET /api/admin/users`.

## 4. Authentication Flow (Step-by-Step)

### A) Register (`POST /api/auth/register`)

Handled by `registerUser` in `controllers/authController.js`.

What it does:

1. Validates required fields: `fullName`, `email`, `password`, `role`, `phoneNumber`.
2. Normalizes `email` and role/persona values.
3. Rejects invalid role and blocks public admin registration.
4. Validates password length and phone format.
5. Checks if user already exists.
6. Hashes password with `bcrypt.hash(...)`.
7. Creates user document with profile and status defaults:
   - `owner` -> `Pending`
   - others -> `Active`
8. Inserts into `users` collection.
9. Returns safe user data (without password).

### B) Login (`POST /api/auth/login`)

Handled by `loginUser` in `controllers/authController.js`.

What it does:

1. Validates `email` and `password`.
2. Looks up user by normalized email.
3. Blocks login for disallowed statuses (`Blocked`, `Suspended`) and pending owner verification.
4. Compares password using `bcrypt.compare(...)`.
5. Creates JWT token with `jwt.sign(...)` using payload:
   - `id`
   - `role`
6. Returns token and safe user object.

### C) Current User (`GET /api/auth/me`)

Route is protected by `authenticate` middleware.

What happens:

1. `authenticate` checks `Authorization: Bearer <token>`.
2. Verifies JWT using `JWT_SECRET`.
3. Adds decoded payload to `req.user`.
4. `getCurrentUser` reads `req.user.id`, fetches DB user, returns safe user.

## 5. Middleware Responsibilities

In `middlewares/authMiddleware.js`:

- `authenticate`:
  - Reads bearer token.
  - Verifies token signature and expiry.
  - Sets `req.user` from decoded token.
  - Rejects invalid/missing token with `401`.

- `authorizeRoles(...allowedRoles)`:
  - Compares `req.user.role` against allowed roles.
  - Rejects unauthorized users with `403`.

In `routes/adminRoutes.js`, this line protects all admin routes:

`router.use(authenticate, authorizeRoles('admin'));`

So every admin endpoint requires a valid admin JWT.

## 6. Controller Responsibilities

### `controllers/authController.js`

- `registerUser`: create account + validation + hash password.
- `loginUser`: verify credentials + issue JWT.
- `getCurrentUser`: fetch authenticated user profile.

Utility helpers inside same file:

- `toSafeUser(...)`: strips sensitive data before response.
- `normalizeRole(...)`: maps role aliases to canonical roles.
- `normalizePersona(...)`: maps persona aliases.

### `controllers/adminController.js`

- `getAdminOverview`: returns platform/user counts and aggregates.
- `getAllUsersForAdmin`: list users with optional filters (`role`, `status`, `persona`, `search`).
- `updateUserStatusByAdmin`: update account status (`Active`, `Pending`, `Blocked`, `Suspended`).

## 7. MongoDB Access Pattern

`config/db.js` uses a singleton-style pattern:

- `connectDB()` creates one connection and stores `db` instance.
- `getDB()` returns that same `db` instance to controllers.

Controllers call `getDB()` then query collections like:

- `db.collection('users')`
- `db.collection('areas')`
- `db.collection('flats')`, etc.

## 8. Seed Script

`scripts/seedUsers.js`:

- Loads env.
- Connects DB.
- Removes legacy demo emails.
- Upserts 3 main accounts:
  - `admin@easyrent.com`
  - `user@easyrent.com`
  - `owner@easyrent.com`
- Hashes default passwords before storing.

Run with:

`npm run seed:users`

## 9. Current Auth/API Endpoints Summary

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (requires bearer token)

Admin (admin token required):

- `GET /api/admin/overview`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id/status`

## 10. Environment Variables Required

In backend `.env`:

- `MONGO_URI` or `MONGODB_URI`
- `DB_NAME` (optional if included in URI)
- `JWT_SECRET`
- `JWT_EXPIRES_IN` (optional, defaults to `1d`)
- `PORT` (optional, defaults to `5000`)

Without `JWT_SECRET`, login/token-based flows will fail by design.

## 11. Glossary (Backend Terms)

- Endpoint: A callable API URL + HTTP method pair, such as POST /api/auth/login.
- Route: The mapping layer that connects an endpoint path to a controller function.
- Controller: Function that contains business logic for handling a request and returning a response.
- Middleware: A function that runs before the controller, usually for auth, validation, logging, or transformation.
- JWT (JSON Web Token): A signed token used to identify a logged-in user without server-side session storage.
- Authorization Header: HTTP header carrying the JWT, normally in Bearer format.
- Hashing: One-way password transformation (bcrypt) so plain passwords are never stored.
- Payload: Data carried in request body or inside a JWT token.
- Status Code: Standard HTTP result code (200, 201, 400, 401, 403, 500).
- Singleton DB Connection: Reusing one database connection instance across requests.

## 12. Short Code Explanations

### A) Route -> Controller wiring

From routes/authRoutes.js:

```js
router.post('/login', loginUser);
```

Explanation:

- router.post means handle POST requests.
- /login is relative route path inside auth router.
- loginUser is the controller that executes the login logic.
- Because server.js mounts this router on /api/auth, final endpoint is POST /api/auth/login.

### B) Middleware chain for admin-only APIs

From routes/adminRoutes.js:

```js
router.use(authenticate, authorizeRoles('admin'));
```

Explanation:

- authenticate verifies token and sets req.user.
- authorizeRoles('admin') checks req.user.role.
- If either check fails, request never reaches admin controllers.

### C) Token verification in middleware

From middlewares/authMiddleware.js:

```js
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = decoded;
next();
```

Explanation:

- jwt.verify validates signature and expiry.
- decoded token payload is attached to req.user.
- next() passes control to the next middleware/controller.

### D) Password security in auth controller

From controllers/authController.js:

```js
const hashedPassword = await bcrypt.hash(password, 10);
```

Explanation:

- Stores only hashed password in database.
- Salt rounds 10 balance security and performance.
- During login, bcrypt.compare checks entered password against stored hash.

### E) JWT token generation on login

From controllers/authController.js:

```js
const token = jwt.sign(
   { id: user._id, role: user.role },
   process.env.JWT_SECRET,
   { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
);
```

Explanation:

- Creates signed token with minimal identity data.
- id and role are used by protected routes and role checks.
- expiresIn controls token lifetime.

### F) DB access pattern in controllers

From controllers:

```js
const db = getDB();
const user = await db.collection('users').findOne({ email: normalizedEmail });
```

Explanation:

- getDB returns already connected database instance.
- Controllers then run collection-level queries.
- This avoids reconnecting to DB for every request.
