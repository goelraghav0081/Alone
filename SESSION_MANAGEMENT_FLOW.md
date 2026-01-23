# Session Management Flow - Complete Guide

## Overview
Your application uses **JWT (JSON Web Token) based stateless session management** with a dual-token system (Access Token + Refresh Token). This ensures security and better scalability.

---

## 1. SESSION MANAGEMENT ARCHITECTURE

### Token Types & Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    TOKEN LIFECYCLE                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ACCESS TOKEN (Short-lived)                                  │
│  ├─ Expiry: 7 days (configurable via JWT_EXPIRY)            │
│  ├─ Purpose: Authenticate API requests                       │
│  ├─ Storage: localStorage/sessionStorage (Frontend)          │
│  └─ Risk: If compromised, limited damage window             │
│                                                               │
│  REFRESH TOKEN (Long-lived)                                  │
│  ├─ Expiry: 30 days (configurable via REFRESH_TOKEN_EXPIRY) │
│  ├─ Purpose: Get new access tokens without re-login         │
│  ├─ Storage: httpOnly Cookie (recommended) or localStorage   │
│  └─ Security: Separate & more restricted usage              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. COMPLETE USER JOURNEY FLOW

### A. SIGNUP FLOW

```
┌─────────────────────────────────────────────────────────────────┐
│                      SIGNUP PROCESS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. USER SUBMISSION                                              │
│     ↓                                                             │
│     POST /auth/signup                                            │
│     {                                                            │
│       name: "John Doe",                                          │
│       email: "john@example.com",                                 │
│       password: "securePassword123"                              │
│     }                                                            │
│                                                                   │
│  2. VALIDATION                                                   │
│     ├─ Check all fields present? ✓                              │
│     ├─ Email format valid? ✓                                    │
│     └─ Password strength OK? ✓                                  │
│                                                                   │
│  3. CHECK EXISTING USER                                          │
│     ├─ Query MongoDB: User.findOne({ email })                   │
│     └─ If exists → Return 409 (Conflict)                        │
│                                                                   │
│  4. PASSWORD HASHING (bcryptjs)                                  │
│     ├─ Salt rounds: 10                                          │
│     ├─ Original: "securePassword123"                            │
│     └─ Hashed: "$2a$10$..." (irreversible)                      │
│                                                                   │
│  5. DATABASE INSERT                                              │
│     └─ User.create({                                            │
│          name: "John Doe",                                      │
│          email: "john@example.com",                             │
│          password: "$2a$10$...",    ← Hashed                    │
│          createdAt: timestamp,                                  │
│          updatedAt: timestamp                                   │
│        })                                                       │
│                                                                   │
│  6. RESPONSE (201 Created)                                       │
│     {                                                            │
│       name: "John Doe",                                         │
│       message: "User registered successfully",                  │
│       userId: "507f1f77bcf86cd799439011"                        │
│     }                                                            │
│     ⚠️ NOTE: Password is NEVER returned                         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### B. LOGIN FLOW (Creates Session)

```
┌──────────────────────────────────────────────────────────────────┐
│                     LOGIN PROCESS                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  STEP 1: USER CREDENTIALS                                         │
│          ↓                                                         │
│          POST /auth/login                                         │
│          {                                                        │
│            email: "john@example.com",                             │
│            password: "securePassword123"                          │
│          }                                                        │
│                                                                    │
│  STEP 2: INPUT VALIDATION                                         │
│          ├─ Email required? ✓                                    │
│          └─ Password required? ✓                                 │
│                                                                    │
│  STEP 3: USER LOOKUP                                              │
│          ↓                                                         │
│          User.findOne({ email: "john@example.com" })              │
│          ↓                                                         │
│          Found user with hashed password: "$2a$10$..."           │
│                                                                    │
│  STEP 4: PASSWORD VERIFICATION                                    │
│          ↓                                                         │
│          bcrypt.compare(                                          │
│            "securePassword123",     ← User input                 │
│            "$2a$10$..."              ← Database hash             │
│          )                                                        │
│          ↓                                                         │
│          Passwords match? YES ✓                                   │
│                                                                    │
│  STEP 5: GENERATE ACCESS TOKEN                                    │
│          ↓                                                         │
│          generateAccessToken({                                    │
│            userId: "507f1f77bcf86cd799439011",                    │
│            email: "john@example.com"                              │
│          })                                                       │
│          ↓                                                         │
│          jwt.sign(payload, JWT_SECRET, {                          │
│            expiresIn: "7d",           ← 7 days from now          │
│            algorithm: "HS256"                                     │
│          })                                                       │
│          ↓                                                         │
│          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."              │
│                                                                    │
│  STEP 6: GENERATE REFRESH TOKEN                                   │
│          ↓                                                         │
│          generateRefreshToken({                                   │
│            userId: "507f1f77bcf86cd799439011",                    │
│            email: "john@example.com"                              │
│          })                                                       │
│          ↓                                                         │
│          jwt.sign(payload, JWT_SECRET, {                          │
│            expiresIn: "30d",          ← 30 days from now         │
│            algorithm: "HS256"                                     │
│          })                                                       │
│          ↓                                                         │
│          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."              │
│                                                                    │
│  STEP 7: RETURN RESPONSE (200 OK)                                 │
│          ↓                                                         │
│          {                                                        │
│            message: "Login successful",                           │
│            accessToken: "eyJ...",                                 │
│            refreshToken: "eyJ...",                                │
│            user: {                                                │
│              userId: "507f1f77bcf86cd799439011",                  │
│              name: "John Doe",                                    │
│              email: "john@example.com"                            │
│            },                                                     │
│            redirectUrl: "/dashboard"                              │
│          }                                                        │
│                                                                    │
│  STEP 8: CLIENT STORAGE                                           │
│          ├─ localStorage.setItem('accessToken', token)           │
│          └─ localStorage.setItem('refreshToken', token)          │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

### C. PROTECTED API REQUEST FLOW

```
┌──────────────────────────────────────────────────────────────────┐
│          ACCESSING PROTECTED ROUTES (with valid token)            │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  STEP 1: CLIENT REQUEST                                           │
│          ↓                                                         │
│          GET /api/protected-route                                 │
│          Headers: {                                               │
│            Authorization: "Bearer eyJ..."  ← Access Token         │
│          }                                                        │
│                                                                    │
│  STEP 2: REQUEST REACHES SERVER                                   │
│          ↓                                                         │
│          Express middleware chain                                 │
│          ↓                                                         │
│          authMiddleware executes                                  │
│                                                                    │
│  STEP 3: EXTRACT TOKEN FROM HEADER                                │
│          ↓                                                         │
│          const authHeader = "Bearer eyJ..."                       │
│          ↓                                                         │
│          const parts = authHeader.split(" ")                      │
│          ↓                                                         │
│          parts = ["Bearer", "eyJ..."]                             │
│                                                                    │
│  STEP 4: VALIDATE FORMAT                                          │
│          ├─ parts.length === 2? ✓                                │
│          ├─ parts[0] === "Bearer"? ✓                             │
│          └─ token = parts[1]                                      │
│                                                                    │
│  STEP 5: VERIFY TOKEN                                             │
│          ↓                                                         │
│          verifyAccessToken(token)                                 │
│          ↓                                                         │
│          jwt.verify(token, JWT_SECRET)                            │
│          ↓                                                         │
│          Check signature (HMAC with JWT_SECRET)                   │
│          ↓                                                         │
│          Check expiration (iat & exp claims)                      │
│          ↓                                                         │
│          Token valid? YES ✓                                       │
│                                                                    │
│  STEP 6: DECODE & EXTRACT PAYLOAD                                 │
│          ↓                                                         │
│          payload = {                                              │
│            userId: "507f1f77bcf86cd799439011",                    │
│            email: "john@example.com",                             │
│            iat: 1674432000,        ← Issued at                   │
│            exp: 1674518400         ← Expires at                  │
│          }                                                        │
│                                                                    │
│  STEP 7: ATTACH TO REQUEST OBJECT                                 │
│          ↓                                                         │
│          req.userId = "507f1f77bcf86cd799439011"                  │
│          req.email = "john@example.com"                           │
│                                                                    │
│  STEP 8: ALLOW REQUEST TO PROCEED                                 │
│          ↓                                                         │
│          next()  ← Call next middleware/controller                │
│                                                                    │
│  STEP 9: CONTROLLER EXECUTES                                      │
│          ↓                                                         │
│          You can now use:                                         │
│          - req.userId                                             │
│          - req.email                                              │
│          - Query database, perform actions, etc.                  │
│                                                                    │
│  STEP 10: SEND RESPONSE                                           │
│          ↓                                                         │
│          res.json({ data: "..." })                                │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

### D. TOKEN REFRESH FLOW

```
┌───────────────────────────────────────────────────────────────────┐
│         REFRESH TOKEN FLOW (When Access Token Expires)             │
├───────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SCENARIO: Access token is expired or near expiry                  │
│                                                                     │
│  STEP 1: CLIENT DETECTS EXPIRY                                     │
│          ├─ Decode token without verification (client-side)        │
│          ├─ Check exp claim                                        │
│          └─ If expired or < 1 hour left, refresh                   │
│                                                                     │
│  STEP 2: CLIENT SENDS REFRESH REQUEST                              │
│          ↓                                                          │
│          POST /auth/refresh-token                                  │
│          Body: {                                                   │
│            refreshToken: "eyJ..."                                  │
│          }                                                         │
│                                                                     │
│  STEP 3: VALIDATE REFRESH TOKEN                                    │
│          ├─ Refresh token required? ✓                             │
│          └─ Verify signature & expiration                          │
│                                                                     │
│  STEP 4: VERIFY REFRESH TOKEN                                      │
│          ↓                                                          │
│          verifyRefreshToken(token)                                 │
│          ↓                                                          │
│          jwt.verify(token, JWT_SECRET)                             │
│          ↓                                                          │
│          Valid? YES ✓                                              │
│          ↓                                                          │
│          payload = {                                               │
│            userId: "507f1f77bcf86cd799439011",                     │
│            email: "john@example.com"                               │
│          }                                                         │
│                                                                     │
│  STEP 5: CHECK USER EXISTS (Optional but Recommended)              │
│          ↓                                                          │
│          User.findById(payload.userId)                             │
│          ↓                                                          │
│          User found? YES ✓                                         │
│                                                                     │
│  STEP 6: GENERATE NEW ACCESS TOKEN                                 │
│          ↓                                                          │
│          generateAccessToken({                                     │
│            userId: "507f1f77bcf86cd799439011",                     │
│            email: "john@example.com"                               │
│          })                                                        │
│          ↓                                                          │
│          New token with fresh 7-day expiry                         │
│                                                                     │
│  STEP 7: RETURN RESPONSE (200 OK)                                  │
│          ↓                                                          │
│          {                                                         │
│            message: "Access token refreshed successfully",         │
│            accessToken: "eyJ..." ← NEW TOKEN                       │
│          }                                                         │
│                                                                     │
│  STEP 8: CLIENT UPDATES STORAGE                                    │
│          ↓                                                          │
│          localStorage.setItem('accessToken', newToken)             │
│                                                                     │
│  STEP 9: RETRY ORIGINAL REQUEST                                    │
│          ↓                                                          │
│          Use new access token to retry failed request              │
│                                                                     │
└───────────────────────────────────────────────────────────────────┘
```

### E. LOGOUT FLOW

```
┌────────────────────────────────────────────────────────────────┐
│                    LOGOUT PROCESS                               │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STEP 1: CLIENT LOGOUT REQUEST                                 │
│          ↓                                                      │
│          POST /auth/logout                                     │
│          Headers: {                                            │
│            Authorization: "Bearer eyJ..."                      │
│          }                                                     │
│                                                                 │
│  STEP 2: MIDDLEWARE VERIFICATION                               │
│          ├─ authMiddleware validates token                     │
│          ├─ Token valid? YES ✓                                 │
│          └─ Proceed to logout controller                       │
│                                                                 │
│  STEP 3: LOGOUT ENDPOINT EXECUTION                              │
│          ↓                                                      │
│          // In current implementation:                         │
│          // Logout is handled by client discarding tokens      │
│          // (Stateless approach - no server-side state)        │
│                                                                 │
│  STEP 4: RETURN RESPONSE (200 OK)                              │
│          ↓                                                      │
│          {                                                     │
│            message: "Logged out successfully",                 │
│            code: "LOGOUT_SUCCESS"                              │
│          }                                                     │
│                                                                 │
│  STEP 5: CLIENT CLEANUP                                        │
│          ├─ localStorage.removeItem('accessToken')             │
│          ├─ localStorage.removeItem('refreshToken')            │
│          ├─ Clear user state in app                            │
│          └─ Redirect to login page                             │
│                                                                 │
│  STEP 6: SESSION TERMINATED                                    │
│          ↓                                                      │
│          Future requests without valid token will fail         │
│                                                                 │
│  NOTE: Current implementation uses STATELESS logout            │
│        (No server blacklist). See "Advanced" section for        │
│        implementing token blacklist.                           │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### F. TOKEN VALIDATION ERROR FLOWS

```
┌──────────────────────────────────────────────────────────────────┐
│              ERROR SCENARIOS & HANDLING                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  SCENARIO 1: NO TOKEN PROVIDED                                    │
│  ─────────────────────────────────────────                        │
│  Request: GET /api/protected                                      │
│           (No Authorization header)                               │
│           ↓                                                        │
│  Response (401 Unauthorized):                                     │
│  {                                                                │
│    message: "No token provided",                                  │
│    code: "NO_TOKEN"                                               │
│  }                                                                │
│                                                                    │
│  ─────────────────────────────────────────                        │
│                                                                    │
│  SCENARIO 2: INVALID TOKEN FORMAT                                 │
│  ─────────────────────────────────────────                        │
│  Request: GET /api/protected                                      │
│           Authorization: "InvalidFormat token123"                 │
│           ↓                                                        │
│  Parsing: authHeader.split(" ") = ["InvalidFormat", "token123"]   │
│           ↓                                                        │
│  Validation: parts[0] !== "Bearer"? TRUE                          │
│           ↓                                                        │
│  Response (401 Unauthorized):                                     │
│  {                                                                │
│    message: "Invalid token format",                               │
│    code: "INVALID_FORMAT"                                         │
│  }                                                                │
│                                                                    │
│  ─────────────────────────────────────────                        │
│                                                                    │
│  SCENARIO 3: EXPIRED TOKEN                                        │
│  ─────────────────────────────────────────                        │
│  Token created: 7 days ago                                        │
│  Current time: Now (token.exp < Date.now())                       │
│           ↓                                                        │
│  jwt.verify() checks expiration                                   │
│           ↓                                                        │
│  Throws TokenExpiredError                                         │
│           ↓                                                        │
│  Response (401 Unauthorized):                                     │
│  {                                                                │
│    message: "Invalid or expired token",                           │
│    code: "INVALID_TOKEN"                                          │
│  }                                                                │
│                                                                    │
│  Client Action: Use refresh token to get new access token         │
│                                                                    │
│  ─────────────────────────────────────────                        │
│                                                                    │
│  SCENARIO 4: TAMPERED TOKEN                                       │
│  ─────────────────────────────────────────                        │
│  Token: eyJ...modified...                                         │
│  (Signature doesn't match JWT_SECRET)                             │
│           ↓                                                        │
│  jwt.verify() validates signature (HMAC)                          │
│           ↓                                                        │
│  Signature mismatch → Throws JsonWebTokenError                    │
│           ↓                                                        │
│  Response (401 Unauthorized):                                     │
│  {                                                                │
│    message: "Invalid or expired token",                           │
│    code: "INVALID_TOKEN"                                          │
│  }                                                                │
│                                                                    │
│  Security Note: Tampering detected! Token cannot be forged        │
│                                                                    │
│  ─────────────────────────────────────────                        │
│                                                                    │
│  SCENARIO 5: REFRESH TOKEN EXPIRED                                │
│  ─────────────────────────────────────────                        │
│  Request: POST /auth/refresh-token                                │
│           Body: { refreshToken: "expired_token" }                 │
│           ↓                                                        │
│  verifyRefreshToken() throws error                                │
│           ↓                                                        │
│  Response (401 Unauthorized):                                     │
│  {                                                                │
│    message: "Invalid or expired refresh token",                   │
│    code: "INVALID_REFRESH_TOKEN"                                  │
│  }                                                                │
│                                                                    │
│  Client Action: Redirect to login page (re-authentication)        │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. SESSION STATE IN DATABASE VS JWT

```
┌─────────────────────────────────────────────────────────────┐
│            HOW DATA IS STORED & MANAGED                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  DATABASE (MongoDB - Persistent)                            │
│  ═════════════════════════════════════════                  │
│  Collection: users                                          │
│  ┌──────────────────────────────────────┐                  │
│  │ _id: ObjectId                        │                  │
│  │ name: "John Doe"                     │                  │
│  │ email: "john@example.com"            │                  │
│  │ password: "$2a$10$..."  ← Hashed     │                  │
│  │ createdAt: 2026-01-23...             │                  │
│  │ updatedAt: 2026-01-23...             │                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
│  Access Token (JWT - Ephemeral)                             │
│  ═════════════════════════════════════════                  │
│  Contains (Encoded):                                        │
│  {                                                          │
│    userId: "507f1f77bcf86cd799439011",                      │
│    email: "john@example.com",                               │
│    iat: 1674432000,      ← Issued at                        │
│    exp: 1674518400       ← Expires at (7 days)             │
│  }                                                          │
│                                                              │
│  Format: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2...    │
│          └─ Header    └─ Payload        └─ Signature       │
│                                                              │
│  Refresh Token (JWT - Long-lived)                           │
│  ═════════════════════════════════════════                  │
│  Contains (Encoded):                                        │
│  {                                                          │
│    userId: "507f1f77bcf86cd799439011",                      │
│    email: "john@example.com",                               │
│    iat: 1674432000,      ← Issued at                        │
│    exp: 1675036800       ← Expires at (30 days)            │
│  }                                                          │
│                                                              │
│  Format: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2...    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. TOKEN LIFECYCLE TIMELINE

```
TIMELINE: From Login to Token Expiry
═════════════════════════════════════════════════════════════

T=0 (Login Moment)
│
├─ User logs in with email & password
├─ Credentials verified against DB
├─ Access Token created
│  └─ iat (Issued At): 2026-01-23 10:00:00
│  └─ exp (Expires At): 2026-01-30 10:00:00  [+7 days]
├─ Refresh Token created
│  └─ iat: 2026-01-23 10:00:00
│  └─ exp: 2026-02-22 10:00:00  [+30 days]
│
├─ Tokens sent to client
└─ Client stores both tokens


T=7 days (Access Token Expires)
│
├─ Client tries to access protected route
├─ Sends request with expired Access Token
├─ Server rejects: "Invalid or expired token"
├─ Client uses Refresh Token to get new Access Token
├─ New Access Token created
│  └─ iat: 2026-01-30 10:00:00
│  └─ exp: 2026-02-06 10:00:00  [+7 days from refresh]
│
├─ Refresh Token still valid (23 days left)
└─ Client can continue using app


T=30 days (Refresh Token Expires)
│
├─ Refresh Token has expired
├─ Client cannot refresh anymore
├─ Session is completely invalid
│
├─ User must login again
├─ New Access & Refresh tokens issued
└─ Process repeats


VISUAL TIMELINE:
───────────────────────────────────────────────────────────

Day 0          Day 7          Day 14         Day 22    Day 30
│              │              │              │         │
Login ──────┐  Access Token   │   Keep      │   Access│ Refresh
            │  Expires ────┐  │   Using     │   Token │ Token
Tokens      │              │  │   Refresh ──┼──→ Re-  │ Expires
Created     │              └──┼─→ Refresh   │   Fresh │ LOGOUT
            │                 │   Now       │         │ REQUIRED
            │                 │             │         │
      Access Token #1   Access Token #2              (Must Relogin)

```

---

## 5. REQUEST-RESPONSE CYCLE DIAGRAM

```
┌──────────────┐
│    CLIENT    │
└──────┬───────┘
       │
       │ (1) POST /auth/login
       │     { email, password }
       │
       ├────────────────────────────────────────┐
       │                                        │
       ▼                                        │
┌─────────────────┐                            │
│ Express Server  │                            │
│   Routes       │                            │
│ auth.routes.ts │                            │
└────────┬────────┘                            │
         │                                     │
         │ (2) Route Match: POST /auth/login   │
         │                                     │
         ▼                                     │
┌───────────────────┐                         │
│ Auth Controller   │                         │
│ auth.controller   │                         │
│   .ts            │                         │
└────────┬──────────┘                         │
         │                                     │
         │ (3) Step-by-step validation         │
         │  ├─ Check fields                    │
         │  ├─ Find user in DB                │
         │  └─ Verify password                │
         │                                     │
         ▼                                     │
┌──────────────────────┐                      │
│ MongoDB (User)       │                      │
│ Stores user data     │                      │
└────────┬─────────────┘                      │
         │                                     │
         │ (4) Return user doc                 │
         │                                     │
         ▼                                     │
┌──────────────────────┐                      │
│ bcryptjs             │                      │
│ Password comparison  │                      │
│  Plain vs Hashed    │                      │
└────────┬─────────────┘                      │
         │                                     │
         │ (5) If password matches...          │
         │                                     │
         ▼                                     │
┌──────────────────────┐                      │
│ JWT Utils            │                      │
│ jwt.utils.ts        │                      │
│                      │                      │
│ generateAccessToken()│                      │
│ generateRefreshToken│                      │
└────────┬─────────────┘                      │
         │                                     │
         │ (6) Generate 2 JWT tokens          │
         │  ├─ Access Token (7 days)          │
         │  └─ Refresh Token (30 days)        │
         │                                     │
         ▼                                     │
┌──────────────────────┐                      │
│ Response Builder     │                      │
│                      │                      │
│ {                    │                      │
│   accessToken: "...",│                      │
│   refreshToken: "...│                      │
│   user: {...}        │                      │
│ }                    │                      │
└────────┬─────────────┘                      │
         │                                     │
         │ (7) 200 OK Response                │
         │                                     │
         └────────────────────────────────────┘
               │
               │ (8) Response reaches client
               │
               ▼
┌──────────────┐
│    CLIENT    │
│              │
│ localStorage │
│  .setItem()  │
│              │
│ Store both   │
│ tokens       │
└──────────────┘
```

---

## 6. DATA FLOW IN PROTECTED REQUESTS

```
PROTECTED ROUTE REQUEST WITH VALID TOKEN
═════════════════════════════════════════════

┌─────────────────────────┐
│ CLIENT APPLICATION      │
│                         │
│ 1. Get token from       │
│    localStorage         │
│                         │
│ 2. Build request:       │
│    GET /api/user-data   │
│    Authorization:       │
│    "Bearer <token>"     │
└────────────┬────────────┘
             │
             │ HTTP Request
             │
             ▼
┌─────────────────────────────┐
│ EXPRESS SERVER              │
│                             │
│ 1. Express middleware chain │
│    requests flow through    │
│    registered middleware    │
└────────────┬────────────────┘
             │
             │ Next middleware
             │
             ▼
┌──────────────────────────────┐
│ AUTH MIDDLEWARE              │
│ authMiddleware               │
│                              │
│ 1. Check if header exists    │
│    ├─ NO  → 401 NO_TOKEN     │
│    └─ YES → Continue         │
│                              │
│ 2. Extract token             │
│    split(" ") → parts[]      │
│                              │
│ 3. Validate format           │
│    ├─ NOT Bearer? → 401      │
│    └─ OK → Continue          │
│                              │
│ 4. Token = parts[1]          │
└────────────┬─────────────────┘
             │
             │ Call verifyAccessToken()
             │
             ▼
┌──────────────────────────────┐
│ JWT UTILS                    │
│ verifyAccessToken()          │
│                              │
│ 1. jwt.verify(token, SECRET) │
│                              │
│ 2. Checks:                   │
│    ├─ Signature valid?       │
│    │  (HMAC with SECRET)     │
│    │                         │
│    ├─ exp > now?             │
│    │  (Not expired)          │
│    │                         │
│    └─ Returns payload OR null│
│                              │
│ payload = {                  │
│   userId: "...",             │
│   email: "...",              │
│   iat: 1674...,              │
│   exp: 1674...               │
│ }                            │
└────────────┬─────────────────┘
             │
             │ Payload returned
             │
             ▼
┌──────────────────────────────┐
│ AUTH MIDDLEWARE (continued)  │
│                              │
│ 1. payload != null?          │
│    ├─ NULL → 401 INVALID     │
│    └─ YES → Continue         │
│                              │
│ 2. Attach to request:        │
│    req.userId = payload.uid  │
│    req.email = payload.email │
│                              │
│ 3. Call next()               │
└────────────┬─────────────────┘
             │
             │ Proceed to controller
             │
             ▼
┌──────────────────────────────┐
│ ROUTE CONTROLLER             │
│                              │
│ Handler function executes    │
│                              │
│ Access available:            │
│ - req.userId                 │
│ - req.email                  │
│ - req.body, req.params, etc. │
│                              │
│ Example:                     │
│ const user =                 │
│   User.findById(req.userId)  │
│                              │
│ res.json({ userData })       │
└────────────┬─────────────────┘
             │
             │ HTTP Response (200)
             │
             ▼
┌─────────────────────────┐
│ CLIENT                  │
│                         │
│ Response received       │
│ Process data            │
│ Update UI               │
└─────────────────────────┘
```

---

## 7. SECURITY LAYERS BREAKDOWN

```
┌─────────────────────────────────────────────────────────┐
│            SECURITY IMPLEMENTATION LAYERS                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  LAYER 1: PASSWORD SECURITY                             │
│  ════════════════════════════════════════               │
│  Plain password: "securePassword123"                     │
│              ↓                                           │
│  bcryptjs.hash(password, saltRounds=10)                 │
│              ↓                                           │
│  Hashed: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XG"  │
│              ↓                                           │
│  ✓ Irreversible                                         │
│  ✓ One-way function                                     │
│  ✓ Salt rounds = 10 (slows down brute force)           │
│  ✓ Storage: MongoDB (never store plain text)            │
│                                                          │
│                                                          │
│  LAYER 2: TOKEN SIGNING (JWT)                           │
│  ════════════════════════════════════════               │
│  Payload: { userId: "...", email: "..." }               │
│              ↓                                           │
│  Header + Payload + SECRET                              │
│              ↓                                           │
│  HMACSHA256(header.payload, JWT_SECRET)                 │
│              ↓                                           │
│  Signature: "9f86d081884c7d6d9ffd60014fc8b2f3d3..."    │
│              ↓                                           │
│  Token: header.payload.signature                        │
│              ↓                                           │
│  ✓ Can verify authenticity (signature check)            │
│  ✓ Cannot modify payload (signature would fail)         │
│  ✓ Cannot forge without SECRET                          │
│  ✓ Only server knows JWT_SECRET                         │
│                                                          │
│                                                          │
│  LAYER 3: TOKEN EXPIRATION                              │
│  ════════════════════════════════════════               │
│  Access Token exp: 7 days                               │
│              ↓                                           │
│  ✓ Reduces damage window if token stolen                │
│  ✓ Forces periodic re-authentication                    │
│                                                          │
│  Refresh Token exp: 30 days                             │
│              ↓                                           │
│  ✓ Allows user to stay logged in longer                 │
│  ✓ Still limits total damage window                     │
│                                                          │
│                                                          │
│  LAYER 4: HEADER VALIDATION                             │
│  ════════════════════════════════════════               │
│  Authorization: "Bearer <token>"                        │
│              ↓                                           │
│  Strict format check                                    │
│  ├─ Must start with "Bearer"                            │
│  ├─ Must have space separator                           │
│  └─ Token must follow                                   │
│              ↓                                           │
│  ✓ Prevents malformed requests                          │
│  ✓ Standard HTTP convention                             │
│                                                          │
│                                                          │
│  LAYER 5: STATELESS VERIFICATION                        │
│  ════════════════════════════════════════               │
│  No server-side session storage                         │
│  (No reliance on memory/database for session state)     │
│              ↓                                           │
│  ✓ Scalable (no session replication needed)             │
│  ✓ Distributed system friendly                          │
│  ✓ No session store attacks                             │
│                                                          │
│                                                          │
│  LAYER 6: DUAL TOKEN SYSTEM                             │
│  ════════════════════════════════════════               │
│  Access Token (Short-lived)                             │
│  ├─ Used for API calls                                  │
│  └─ Limited exposure window                             │
│                                                          │
│  Refresh Token (Long-lived)                             │
│  ├─ Only used to get new access tokens                  │
│  ├─ Can be more restricted (httpOnly cookie)            │
│  └─ Separate from API token                             │
│              ↓                                           │
│  ✓ If access token stolen: limited damage (7 days)     │
│  ✓ If refresh token stolen: attacker could get tokens  │
│    but can be revoked by user logout                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 8. ENVIRONMENT VARIABLES CONFIGURATION

```
FILE: .env
═════════════════════════════════════════════════════════

MONGO_URI=mongodb+srv://user:pass@cluster.../db
│
├─ Used in: src/config/db.ts
├─ Purpose: Connect to MongoDB database
├─ Security: Keep credentials safe, use env vars

PORT=3001
│
├─ Used in: src/app.ts
├─ Purpose: Server listening port
├─ Default: 3000 (if not set)

JWT_SECRET=your_secret_key_here
│
├─ Used in: src/utils/jwt.utils.ts
├─ Purpose: Sign & verify JWT tokens
├─ Requirements:
│  ├─ Minimum 32 characters (recommended)
│  ├─ Strong random string
│  ├─ Keep absolutely secret
│  ├─ Never commit to git
│  └─ Rotate periodically
│
├─ How it works:
│  ├─ Signing: jwt.sign(payload, JWT_SECRET)
│  └─ Verifying: jwt.verify(token, JWT_SECRET)
│
├─ If compromised:
│  ├─ Attacker can forge valid tokens
│  ├─ Must rotate immediately
│  ├─ All tokens signed with old secret become invalid
│  └─ Users must re-login

JWT_EXPIRY=7d
│
├─ Used in: generateAccessToken()
├─ Format: "7d" (7 days)
│  └─ Can be: "1h", "24h", "7d", "30d", etc.
├─ Purpose: Access token validity period
├─ Smaller = More secure, but more refresh calls
├─ Larger = Less secure, but smoother UX
├─ Recommended: 15 minutes to 7 days

REFRESH_TOKEN_EXPIRY=30d
│
├─ Used in: generateRefreshToken()
├─ Format: "30d" (30 days)
├─ Purpose: Refresh token validity period
├─ Larger than JWT_EXPIRY (allows extended sessions)
├─ Recommended: 7 to 90 days

FRONTEND_URL=http://localhost:3000
│
├─ Used in: CORS configuration
├─ Purpose: Allow requests from frontend origin
├─ Development: http://localhost:3000
├─ Production: https://yourdomain.com
├─ Security: Prevent unauthorized CORS requests

═════════════════════════════════════════════════════════
```

---

## 9. QUICK REFERENCE: API ENDPOINTS

| Method | Endpoint | Auth | Purpose | Returns |
|--------|----------|------|---------|---------|
| POST | /auth/signup | ❌ | Register new user | userId, message |
| POST | /auth/login | ❌ | Login, get tokens | accessToken, refreshToken, user |
| POST | /auth/refresh-token | ❌ | Get new access token | accessToken |
| POST | /auth/logout | ✅ | Logout (discard tokens) | success message |

---

## 10. TOKEN ANATOMY

```
JWT TOKEN STRUCTURE
═════════════════════════════════════════════════════════

Complete Token:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJl
bWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJpYXQiOjE2NzQ0MzIw
MDAsImV4cCI6MTY3NDUxODQwMH0.
9f86d081884c7d6d9ffd60014fc8b2f3d3c1a4b5c6d7e8f9a0b1c2d3e4f5g6


PART 1: HEADER (Base64 encoded JSON)
───────────────────────────────────────
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9

Decoded:
{
  "alg": "HS256",        ← Algorithm (HMAC SHA-256)
  "typ": "JWT"           ← Token type
}


PART 2: PAYLOAD (Base64 encoded JSON)
───────────────────────────────────────
eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJl...

Decoded:
{
  "userId": "507f1f77bcf86cd799439011",
  "email": "john@example.com",
  "iat": 1674432000,     ← Issued at (Unix timestamp)
  "exp": 1674518400      ← Expiration (Unix timestamp)
}

iat = Jan 23, 2026 10:00:00 UTC
exp = Jan 30, 2026 10:00:00 UTC (7 days later)


PART 3: SIGNATURE (Cryptographic)
───────────────────────────────────────
9f86d081884c7d6d9ffd60014fc8b2f3d3c1a4b5c6d7e8f9a0b1c2d3e4f5g6

Created by:
HMACSHA256(base64(header) + "." + base64(payload), JWT_SECRET)

Verification:
1. Compute: HMACSHA256(header.payload, JWT_SECRET)
2. Compare with received signature
3. If match → Token authentic & not tampered
4. If mismatch → Token invalid or forged


WHY IT'S SECURE
───────────────
- Signature proves token hasn't been modified
- Only server knows JWT_SECRET
- Attacker cannot forge without SECRET
- Changing any part (header/payload) breaks signature
- Token is self-contained (no server lookup needed)


TOKEN VERIFICATION PROCESS
───────────────────────────
1. Client sends: "Authorization: Bearer <token>"
2. Server receives token
3. Server splits by "."
   └─ Parts: [header, payload, signature]
4. Server recalculates signature:
   └─ HMACSHA256(header.payload, JWT_SECRET)
5. Compare:
   ├─ IF signature matches → VALID ✓
   └─ IF signature mismatch → INVALID ✗
6. Check expiration:
   ├─ IF exp > now → NOT EXPIRED ✓
   └─ IF exp <= now → EXPIRED ✗

```

---

## 11. COMPARISON: STATEFUL vs STATELESS SESSIONS

```
┌──────────────────────────────────────────────────────────┐
│        STATEFUL (Traditional Sessions)                    │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Server Responsibility:                                  │
│  ├─ Maintain session data in memory/database            │
│  ├─ Match session ID to user on each request            │
│  └─ Clean up expired sessions                           │
│                                                           │
│  Storage Example (Redis):                                │
│  ├─ SessionID: "abc123xyz"                              │
│  └─ SessionData: {                                       │
│     userId: "507f1f77...",                              │
│     email: "john@example.com",                           │
│     createdAt: timestamp,                                │
│     lastAccess: timestamp                                │
│  }                                                       │
│                                                           │
│  Request Flow:                                           │
│  1. Client sends: "Cookie: sessionid=abc123xyz"         │
│  2. Server lookup in Redis                              │
│  3. If found & valid → Allow request                    │
│  4. If not found → Reject request                       │
│                                                           │
│  Pros:                                                   │
│  ✓ Can revoke sessions immediately (logout)             │
│  ✓ Store additional session data                        │
│  ✓ Control session expiry per session                   │
│                                                           │
│  Cons:                                                   │
│  ✗ Server-side storage required                         │
│  ✗ Doesn't scale well (session replication)             │
│  ✗ Memory overhead on server                            │
│  ✗ Requires session store (Redis/DB)                    │
│  ✗ Sticky sessions needed in load balancing             │
│                                                           │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│        STATELESS (JWT-based) - YOUR IMPLEMENTATION        │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Server Responsibility:                                  │
│  ├─ Sign token on login                                  │
│  ├─ Verify signature on each request                     │
│  └─ No storage needed!                                   │
│                                                           │
│  Token Structure (JWT):                                  │
│  └─ header.payload.signature                            │
│     ├─ Contains: userId, email, exp                      │
│     └─ Signed with: JWT_SECRET                           │
│                                                           │
│  Request Flow:                                           │
│  1. Client sends: "Authorization: Bearer <token>"       │
│  2. Server verifies signature                           │
│  3. Server checks expiration                            │
│  4. If valid → Allow request                            │
│  5. If invalid → Reject request                         │
│                                                           │
│  Pros:                                                   │
│  ✓ No server-side session storage                       │
│  ✓ Scales horizontally (no session replication)         │
│  ✓ Stateless architecture                               │
│  ✓ Works across multiple servers/domains                │
│  ✓ Mobile-friendly (no cookies required)                │
│  ✓ Lower memory footprint                               │
│  ✓ Self-contained (no lookup needed)                    │
│                                                           │
│  Cons:                                                   │
│  ✗ Cannot revoke immediately (token still valid)        │
│  ✗ Token size (larger than session ID)                  │
│  ✗ Payload visible (base64, not encrypted)              │
│  ✗ For true revocation, need blacklist (defeats purpose)│
│                                                           │
│  Workaround for Revocation:                              │
│  ├─ Use token blacklist (Redis set)                     │
│  ├─ Check if token in blacklist on verify               │
│  └─ Add to blacklist on logout                          │
│                                                           │
└──────────────────────────────────────────────────────────┘

YOUR SYSTEM: JWT STATELESS
═════════════════════════════════════════════════════════

No server-side session storage
     ↓
Highly scalable
     ↓
Suitable for microservices
     ↓
Mobile apps friendly (API-based)
     ↓
Perfect for modern distributed systems
```

---

## 12. EXAMPLE FRONTEND INTEGRATION

```javascript
// FRONTEND CODE EXAMPLE
// ═══════════════════════════════════════════════════════

// 1. LOGIN
async function login() {
  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'john@example.com',
      password: 'securePassword123'
    })
  });
  
  const data = await response.json();
  
  if (response.ok) {
    // Store tokens
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    // Redirect
    window.location.href = data.redirectUrl;
  }
}

// 2. API REQUEST WITH TOKEN
async function fetchUserData() {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch('/api/user-data', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.status === 401) {
    // Token expired, refresh
    await refreshToken();
    // Retry request
    return fetchUserData();
  }
  
  return response.json();
}

// 3. REFRESH TOKEN
async function refreshToken() {
  const token = localStorage.getItem('refreshToken');
  
  const response = await fetch('/auth/refresh-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: token })
  });
  
  const data = await response.json();
  
  if (response.ok) {
    localStorage.setItem('accessToken', data.accessToken);
  } else {
    // Refresh token expired, redirect to login
    logout();
  }
}

// 4. LOGOUT
function logout() {
  const token = localStorage.getItem('accessToken');
  
  fetch('/auth/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  // Clear tokens
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  
  // Redirect to login
  window.location.href = '/login';
}
```

---

## 13. PRODUCTION SECURITY CHECKLIST

```
□ JWT_SECRET
  ├─ 32+ characters strong random string
  ├─ Stored securely in environment variables
  ├─ Never committed to version control
  ├─ Different for dev/staging/production
  └─ Rotated periodically

□ Token Storage
  ├─ Access Token → httpOnly cookie (recommended)
  │  └─ Prevents XSS attacks
  ├─ OR localStorage (if httpOnly not possible)
  │  └─ More vulnerable to XSS
  └─ Refresh Token → httpOnly, SameSite cookie

□ HTTPS Only
  ├─ All API calls over HTTPS
  ├─ Secure cookie flag enabled
  └─ HSTS headers configured

□ CORS Configuration
  ├─ Only allow trusted origins
  ├─ Methods restricted (GET, POST, etc.)
  └─ Credentials included in cross-origin

□ Rate Limiting
  ├─ Login endpoint: Limit login attempts
  └─ Token refresh: Limit refresh attempts

□ Token Blacklist (Optional)
  ├─ Redis or in-memory store
  ├─ Add tokens on logout
  ├─ Check blacklist on verification
  └─ Clean up expired entries

□ Monitoring & Logging
  ├─ Log failed login attempts
  ├─ Log failed token verification
  ├─ Alert on unusual patterns
  └─ Keep audit trail

□ Password Policy
  ├─ Minimum length: 8 characters
  ├─ Complexity requirements
  ├─ Hash algorithm: bcryptjs (✓ you have this)
  └─ Salt rounds: 10+ (✓ you have this)

□ Error Messages
  ├─ Don't reveal why login failed
  ├─ Use generic: "Invalid credentials"
  └─ Prevents user enumeration attacks

□ Updates & Dependencies
  ├─ Keep dependencies updated
  ├─ Monitor security advisories
  ├─ Regular vulnerability scans
  └─ Test before deploying

```

---

## SUMMARY

Your JWT session management system:

✅ **Uses Stateless Architecture** - No server-side session storage  
✅ **Dual Token System** - Access (short) + Refresh (long) tokens  
✅ **Strong Password Security** - bcryptjs with salt rounds  
✅ **Token Signing** - HMAC-SHA256 algorithm  
✅ **Signature Verification** - Ensures token authenticity  
✅ **Expiration Tracking** - Time-based token validity  
✅ **Middleware-based Protection** - authMiddleware guards routes  
✅ **TypeScript Support** - Full type safety  
✅ **Scalable Design** - Works across distributed systems  

This is a production-grade JWT implementation following industry best practices! 🚀
