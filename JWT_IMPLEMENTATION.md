# JWT Authentication Implementation Guide

## Overview
This document explains the JWT (JSON Web Token) authentication implementation in your login API following industry best practices.

## Features Implemented

### 1. **Access Token & Refresh Token Pattern**
- **Access Token**: Short-lived (7 days by default), used for API requests
- **Refresh Token**: Long-lived (30 days by default), used to get new access tokens without re-login

### 2. **Authentication Middleware**
- `authMiddleware`: Validates access tokens on protected routes
- `optionalAuthMiddleware`: Allows requests even with invalid/missing tokens

### 3. **JWT Utilities**
Located in `src/utils/jwt.utils.ts`:
- `generateAccessToken()`: Creates short-lived tokens
- `generateRefreshToken()`: Creates long-lived tokens
- `verifyAccessToken()`: Validates and decodes access tokens
- `verifyRefreshToken()`: Validates refresh tokens
- `decodeToken()`: Decodes without verification (use cautiously)

## API Endpoints

### 1. **POST /auth/signup**
Register a new user
```json
Request:
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}

Response (201):
{
  "name": "John Doe",
  "message": "User registered successfully",
  "userId": "user_id_here"
}
```

### 2. **POST /auth/login**
Login and get tokens
```json
Request:
{
  "email": "john@example.com",
  "password": "securePassword123"
}

Response (200):
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "userId": "user_id",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "redirectUrl": "/dashboard"
}
```

### 3. **POST /auth/refresh-token**
Get a new access token using refresh token
```json
Request:
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

Response (200):
{
  "message": "Access token refreshed successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 4. **POST /auth/logout**
Logout (Protected Route - Requires Access Token)
```
Headers:
Authorization: Bearer <access_token>

Response (200):
{
  "message": "Logged out successfully",
  "code": "LOGOUT_SUCCESS"
}
```

## Environment Variables

Add to your `.env` file:
```
JWT_SECRET=your_secret_key_here
JWT_EXPIRY=7d                          # Access token expiry
REFRESH_TOKEN_EXPIRY=30d               # Refresh token expiry
```

**Note**: The `JWT_SECRET` should be a strong, random string. Keep it secure and never commit it to version control.

## How to Use

### 1. **Login & Store Tokens**
```javascript
// Frontend code
const response = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password'
  })
});

const data = await response.json();

// Store tokens securely
localStorage.setItem('accessToken', data.accessToken);
localStorage.setItem('refreshToken', data.refreshToken);
```

### 2. **Use Access Token in Requests**
```javascript
const response = await fetch('/protected-route', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  }
});
```

### 3. **Refresh Expired Token**
```javascript
const response = await fetch('/auth/refresh-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    refreshToken: localStorage.getItem('refreshToken')
  })
});

const data = await response.json();
localStorage.setItem('accessToken', data.accessToken);
```

### 4. **Protected Routes**
```typescript
import { authMiddleware } from "../middleware/auth.middleware";

// In your routes
router.get("/protected-route", authMiddleware, controllerFunction);
```

## Best Practices Implemented

✅ **Token Verification**: All tokens are verified before use  
✅ **Token Expiration**: Tokens have expiry times to reduce security risk  
✅ **Separate Tokens**: Access and refresh tokens have different purposes  
✅ **Secure Headers**: Uses Bearer token format (standard practice)  
✅ **Error Handling**: Clear error messages and codes  
✅ **User Data**: Never exposes passwords in responses  
✅ **TypeScript**: Full type safety with interfaces  
✅ **Algorithm**: Uses HS256 (HMAC with SHA-256)  

## Security Recommendations

1. **Store Tokens Securely**
   - Avoid `localStorage` for sensitive apps; use `httpOnly` cookies instead
   - Or use a secure storage mechanism

2. **Token Rotation**
   - Implement token refresh on every request (optional but secure)
   - Clear tokens on logout

3. **HTTPS Only**
   - Always use HTTPS in production

4. **Secret Management**
   - Use environment variables for `JWT_SECRET`
   - Rotate secrets periodically
   - Use strong, random strings (minimum 32 characters)

5. **Token Blacklist** (Optional Enhancement)
   - Implement token blacklist for logout functionality
   - Use Redis or database to store invalidated tokens
   - Check blacklist on token verification

6. **CORS Configuration**
   - Configure CORS properly to prevent unauthorized requests

## Example: Adding Token Blacklist (Future Enhancement)

```typescript
// In logout endpoint, add token to blacklist
const blacklistedTokens = new Set<string>();

export const logout = async (req: AuthRequest, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    blacklistedTokens.add(token);
  }
  return res.status(200).json({ message: "Logged out successfully" });
};

// In middleware, check blacklist
if (blacklistedTokens.has(token)) {
  return res.status(401).json({ message: "Token has been revoked" });
}
```

## Token Payload Structure

The JWT contains the following claims:
```json
{
  "userId": "mongodb_user_id",
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1234654290
}
```

- `iat`: Issued at time
- `exp`: Expiration time
- `userId`: User's database ID
- `email`: User's email

## Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| NO_TOKEN | 401 | No authorization header provided |
| INVALID_FORMAT | 401 | Authorization header not in "Bearer token" format |
| INVALID_TOKEN | 401 | Token is invalid or expired |
| UNAUTHORIZED | 401 | General authorization error |
| INVALID_REFRESH_TOKEN | 401 | Refresh token is invalid or expired |

## Testing

### Test with cURL:

**Login:**
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

**Protected Route:**
```bash
curl -X POST http://localhost:3001/auth/logout \
  -H "Authorization: Bearer <your_access_token>"
```

**Refresh Token:**
```bash
curl -X POST http://localhost:3001/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<your_refresh_token>"}'
```

## File Structure

```
src/
├── utils/
│   └── jwt.utils.ts          # JWT generation & verification
├── middleware/
│   └── auth.middleware.ts     # Authentication middleware
├── controllers/
│   └── auth.controller.ts     # Login, signup, refresh, logout
├── routes/
│   └── auth.routes.ts         # Route definitions
└── app.ts                      # Express setup
```

---

**Version**: 1.0.0  
**Last Updated**: January 2026
