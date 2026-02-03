# JWT Middleware Usage Guide

## Overview

The `verifyJWT` middleware automatically validates JWT access tokens and attaches the user information to the request object.

## How to Use

### 1. Import the Middleware

```typescript
import { verifyJWT } from "@qr/common";
```

### 2. Add to Route's preHandler

```typescript
app.get("/protected-route", {
  preHandler: [verifyJWT],  // <-- Add middleware here
}, async (req: any, reply: any) => {
  // User is now available at req.user
  const userId = req.user.id;
  const userEmail = req.user.email;
  
  // Your protected route logic here
});
```

### 3. Example: Protected Route

```typescript
import { verifyJWT } from "@qr/common";

export default async function protectedRoutes(app: any) {
  app.get("/api/profile", {
    schema: {
      security: [{ bearerAuth: [] }],  // Document in Swagger
    },
    preHandler: [verifyJWT],  // Protect the route
  }, async (req: any, reply: any) => {
    // Access authenticated user
    const user = req.user;
    
    return {
      message: `Hello ${user.email}!`,
      userId: user.id,
    };
  });
}
```

## What the Middleware Does

1. **Extracts Token**: Gets the JWT from `Authorization: Bearer <token>` header
2. **Validates Token**: Verifies the token signature and expiration
3. **Attaches User**: Adds decoded user data to `req.user`:
   ```typescript
   req.user = {
     id: string,      // User ID
     email: string    // User email
   }
   ```
4. **Handles Errors**: Returns 401 if token is missing, invalid, or expired

## Making Authenticated Requests

### From Frontend/Client

```javascript
// Get token from login
const { accessToken } = await fetch('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password }),
}).then(r => r.json());

// Use token in protected requests
const response = await fetch('/api/profile', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### Using cURL

```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.accessToken')

# Use token
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/auth/me
```

## Multiple Middleware Example

You can chain multiple middleware functions:

```typescript
app.post("/admin/action", {
  preHandler: [
    verifyJWT,        // First: verify token
    checkAdmin,       // Second: check admin role
    rateLimiter,      // Third: rate limiting
  ],
}, async (req, reply) => {
  // All middleware passed!
});
```

## Error Handling

The middleware automatically returns appropriate errors:

- **401 Unauthorized**: Missing or invalid token
  ```json
  { "error": "Unauthorized" }
  ```

- **401 Invalid Token**: Token expired or tampered
  ```json
  { "error": "Invalid or expired token" }
  ```

## Best Practices

1. **Always use HTTPS** in production to protect tokens
2. **Store access tokens in memory** (not localStorage)
3. **Use refresh tokens** for long-lived sessions
4. **Implement token refresh** before expiration
5. **Add rate limiting** to protected endpoints
6. **Log authentication failures** for security monitoring

## Token Lifetimes

- **Access Token**: 15 minutes (short-lived for security)
- **Refresh Token**: 7 days (long-lived for convenience)

## Example: Full Service Integration

```typescript
// services/qr-service/src/routes/qr.ts
import { verifyJWT } from "@qr/common";

export default async function qrRoutes(app: any) {
  // Public route - no auth required
  app.get("/qr/:id", async (req, reply) => {
    // Anyone can access
  });

  // Protected route - auth required
  app.post("/qr/create", {
    preHandler: [verifyJWT],
  }, async (req: any, reply) => {
    const userId = req.user.id;
    
    // Create QR code for authenticated user
    const qr = await createQR({
      ...req.body,
      ownerId: userId,
    });
    
    return qr;
  });

  // Protected route - update QR
  app.put("/qr/:id", {
    preHandler: [verifyJWT],
  }, async (req: any, reply) => {
    const userId = req.user.id;
    const qrId = req.params.id;
    
    // Verify user owns the QR code
    const qr = await getQR(qrId);
    if (qr.ownerId !== userId) {
      return reply.code(403).send({ error: "Forbidden" });
    }
    
    // Update QR code
    return updateQR(qrId, req.body);
  });
}
```

## Testing Protected Routes

See `test-refresh-token.sh` for a complete example of:
1. Login to get tokens
2. Use access token for protected requests
3. Refresh access token when expired
4. Use new access token

Run the test:
```bash
./test-refresh-token.sh
```
