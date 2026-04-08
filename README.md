# EasyRent Backend (Auth Only)

This backend is intentionally refactored to keep only authentication APIs.

## Tech Stack
- Node.js + Express
- MongoDB native driver (`mongodb`) (no mongoose)
- JWT authentication
- bcrypt password hashing

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Update environment variables in `.env`:
   - `MONGO_URI` -> your MongoDB connection string
   - `DB_NAME` -> your DB name (optional if already included in `MONGO_URI`)
   - `JWT_SECRET` -> strong secret key
3. Run server:
   ```bash
   npm run dev
   ```

## Base URL
- `http://localhost:5000`

## Endpoints

### 1. Register User
- **Method:** `POST`
- **Path:** `/api/auth/register`

#### Request Body
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "12345678",
  "role": "tenant",
  "phoneNumber": "+8801700000000",
  "profilePicture": "https://your-cdn.com/john.jpg",
  "address": "House 10, Road 2, Dhaka",
  "preferredArea": "Banani",
  "nid": "1234567890",
  "bio": "Looking for a family apartment"
}
```

#### Required Fields
- `fullName`
- `email`
- `password`
- `role` (`user`/`tenant`/`buyer`/`renter` or `owner`/`landlord`/`seller`)
- `phoneNumber`

#### Optional Profile Fields (can be sent at signup time)
- `profilePicture`
- `address`
- `preferredArea`
- `nid`
- `bio`

#### Success Response (`201`)
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "...",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "phoneNumber": "+8801700000000",
    "profile": {
      "profilePicture": "https://your-cdn.com/john.jpg",
      "address": "House 10, Road 2, Dhaka",
      "preferredArea": "Banani",
      "nid": "1234567890",
      "bio": "Looking for a family apartment"
    }
  }
}
```

### 2. Login User
- **Method:** `POST`
- **Path:** `/api/auth/login`

#### Request Body
```json
{
  "email": "john@example.com",
  "password": "12345678"
}
```

#### Success Response (`200`)
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "...",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "phoneNumber": "+8801700000000",
    "profile": {
      "profilePicture": "...",
      "address": "...",
      "preferredArea": "...",
      "nid": "...",
      "bio": "..."
    }
  }
}
```

### 3. Get Current User
- **Method:** `GET`
- **Path:** `/api/auth/me`
- **Auth Header:** `Authorization: Bearer <jwt_token_here>`

#### Success Response (`200`)
```json
{
  "user": {
    "id": "...",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "phoneNumber": "+8801700000000",
    "profile": {
      "profilePicture": "...",
      "address": "...",
      "preferredArea": "...",
      "nid": "...",
      "bio": "..."
    }
  }
}
```

## Notes
- Email is normalized to lowercase.
- Password is hashed before storing.
- JWT expires based on `JWT_EXPIRES_IN`.
- If `JWT_SECRET` is missing, login is blocked for safety.
- Public registration supports only `user` and `owner` role families.
- `owner` registrations are created with `Pending` status by default and require admin verification.

## Central Admin APIs

All endpoints below require an admin JWT token (`role: admin`) in `Authorization: Bearer <token>`.

### 4. Admin Overview
- **Method:** `GET`
- **Path:** `/api/admin/overview`

### 5. List Users (Admin)
- **Method:** `GET`
- **Path:** `/api/admin/users`
- **Optional Query:** `role`, `status`, `persona`, `search`

### 6. Update User Status (Admin)
- **Method:** `PATCH`
- **Path:** `/api/admin/users/:id/status`
- **Body:**
```json
{
  "status": "Active"
}
```
- Allowed status: `Active`, `Pending`, `Blocked`, `Suspended`

## Seed Script

Run this command to insert/update sample accounts (central admin + user/owner personas):

```bash
npm run seed:users
```

Seeded accounts:
- `admin@easyrent.com` (role: `admin`, persona: `central_admin`)
- `user@easyrent.com` (role: `user`, persona: `user`)
- `owner@easyrent.com` (role: `owner`, persona: `owner`)

Default seeded password for all accounts: `123456`
