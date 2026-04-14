# EasyRent Auth API Cheat Sheet

Quick reference for demo, viva, and frontend integration.

## Base URL

- `http://localhost:5000`

## Auth Header (Protected APIs)

- `Authorization: Bearer <JWT_TOKEN>`

## 1) Register User

- Method: `POST`
- Endpoint: `/api/auth/register`
- Auth: Not required

### Request Body

```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "123456",
  "role": "user",
  "phoneNumber": "+8801700000000",
  "profilePicture": "",
  "address": "Uttara, Dhaka",
  "preferredArea": "Uttara",
  "nid": "1234567890",
  "bio": "Looking for a 2 bed apartment"
}
```

### Success (201)

```json
{
  "message": "User registered successfully",
  "user": {
    "id": "...",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "persona": "user",
    "status": "Active",
    "phoneNumber": "+8801700000000",
    "profile": {
      "profilePicture": "",
      "address": "Uttara, Dhaka",
      "preferredArea": "Uttara",
      "nid": "1234567890",
      "bio": "Looking for a 2 bed apartment"
    }
  }
}
```

### Common Errors

- `400`: missing fields / invalid role / invalid phone / user already exists
- `403`: admin registration attempted from public endpoint

## 2) Login User

- Method: `POST`
- Endpoint: `/api/auth/login`
- Auth: Not required

### Request Body

```json
{
  "email": "john@example.com",
  "password": "123456"
}
```

### Success (200)

```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "...",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "persona": "user",
    "status": "Active",
    "phoneNumber": "+8801700000000",
    "profile": {
      "profilePicture": "",
      "address": "Uttara, Dhaka",
      "preferredArea": "Uttara",
      "nid": "1234567890",
      "bio": "Looking for a 2 bed apartment"
    }
  }
}
```

### Common Errors

- `400`: invalid credentials
- `403`: owner pending verification / blocked / suspended account
- `500`: `JWT_SECRET` not configured

## 3) Get Current User

- Method: `GET`
- Endpoint: `/api/auth/me`
- Auth: Required

### Success (200)

```json
{
  "user": {
    "id": "...",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "persona": "user",
    "status": "Active",
    "phoneNumber": "+8801700000000",
    "profile": {
      "profilePicture": "",
      "address": "Uttara, Dhaka",
      "preferredArea": "Uttara",
      "nid": "1234567890",
      "bio": "Looking for a 2 bed apartment"
    }
  }
}
```

### Common Errors

- `401`: token missing / invalid / expired
- `404`: user not found

## 4) Admin Overview

- Method: `GET`
- Endpoint: `/api/admin/overview`
- Auth: Required (`admin` role)

### Success (200)

```json
{
  "totals": {
    "totalUsers": 12,
    "totalOwners": 4,
    "pendingOwners": 1,
    "blockedUsers": 2,
    "totalAreas": 3,
    "totalBuildings": 8,
    "totalFlats": 24,
    "totalBookings": 7
  },
  "roleBreakdown": [
    { "role": "user", "count": 12 },
    { "role": "owner", "count": 4 },
    { "role": "admin", "count": 1 }
  ],
  "personaBreakdown": [
    { "persona": "user", "count": 9 },
    { "persona": "tenant", "count": 3 }
  ]
}
```

### Common Errors

- `401`: invalid/missing token
- `403`: non-admin token

## 5) List Users (Admin)

- Method: `GET`
- Endpoint: `/api/admin/users`
- Auth: Required (`admin` role)

### Optional Query Params

- `role=user|owner|admin`
- `status=Active|Pending|Blocked|Suspended`
- `persona=user|tenant|buyer|renter|owner|landlord|seller|central_admin`
- `search=<text>`

### Success (200)

```json
{
  "total": 3,
  "users": [
    {
      "id": "...",
      "fullName": "General User",
      "email": "user@easyrent.com",
      "role": "user",
      "persona": "user",
      "status": "Active",
      "phoneNumber": "+8801700000002",
      "createdAt": "2026-04-08T10:00:00.000Z",
      "profile": {
        "profilePicture": "",
        "address": "Uttara, Dhaka",
        "preferredArea": "Uttara",
        "nid": "USER0002",
        "bio": "General user account"
      }
    }
  ]
}
```

## 6) Update User Status (Admin)

- Method: `PATCH`
- Endpoint: `/api/admin/users/:id/status`
- Auth: Required (`admin` role)

### Request Body

```json
{
  "status": "Active"
}
```

Allowed status values:

- `Active`
- `Pending`
- `Blocked`
- `Suspended`

### Success (200)

```json
{
  "message": "User status updated",
  "user": {
    "id": "...",
    "fullName": "General Owner",
    "status": "Active"
  }
}
```

### Common Errors

- `400`: invalid user id or status
- `404`: user not found

## Frontend Integration Quick Notes

- Login page calls: `POST /api/auth/login`
- Register page calls: `POST /api/auth/register`
- Session restore calls: `GET /api/auth/me`
- Admin dashboard calls:
  - `GET /api/admin/overview`
  - `GET /api/admin/users`
  - `PATCH /api/admin/users/:id/status`

Set frontend env:

- `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000`

## Demo Accounts (After Seeding)

Run:

- `npm run seed:users`

Accounts:

- `admin@easyrent.com` / `123456`
- `user@easyrent.com` / `123456`
- `owner@easyrent.com` / `123456`
