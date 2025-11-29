# Swagger API Documentation

All services now include interactive Swagger/OpenAPI documentation.

## Access Swagger UI

Each service has its own Swagger UI available at `/docs`:

### Auth Service (Port 3001)
- **Swagger UI**: http://localhost:3001/docs
- **OpenAPI JSON**: http://localhost:3001/docs/json

**Available Endpoints:**
- `POST /auth/signup` - Register a new user
- `POST /auth/login` - Login and get JWT token
- `GET /auth/me` - Get current user details (requires Bearer token)

### QR Service (Port 3002)
- **Swagger UI**: http://localhost:3002/docs
- **OpenAPI JSON**: http://localhost:3002/docs/json

**Available Endpoints:**
- `POST /generate` - Generate a new QR code (requires Bearer token)
- `GET /qr/:qrId` - Get QR code metadata (requires Bearer token)
- `GET /qr/:qrId/image` - Get QR code PNG image (public)

### Analytics Service (Port 3004)
- **Swagger UI**: http://localhost:3004/docs
- **OpenAPI JSON**: http://localhost:3004/docs/json

**Available Endpoints:**
- `GET /analytics` - Service health check
- `GET /health` - Health probe

### Microsite Service (Port 3005)
- **Swagger UI**: http://localhost:3005/docs
- **OpenAPI JSON**: http://localhost:3005/docs/json

**Available Endpoints:**
- `GET /microsite` - Service health check
- `GET /health` - Health probe

## Using the Swagger UI

### Testing Authenticated Endpoints

1. **Get a JWT Token:**
   - Go to http://localhost:3001/docs
   - Use `POST /auth/signup` to create an account or `POST /auth/login` to login
   - Copy the `token` from the response

2. **Authorize in Swagger UI:**
   - Click the **Authorize** button (🔓 icon) at the top right
   - Enter: `Bearer <your-token>` (replace `<your-token>` with the actual token)
   - Click **Authorize**, then **Close**

3. **Test Protected Endpoints:**
   - Now you can test endpoints that require authentication
   - Try `GET /auth/me` to verify your token works
   - Go to http://localhost:3002/docs and test `POST /generate` to create a QR code

### Example Workflow

1. **Create an account:**
   ```bash
   curl -X POST http://localhost:3001/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

2. **Login:**
   ```bash
   curl -X POST http://localhost:3001/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

3. **Generate QR Code:**
   ```bash
   curl -X POST http://localhost:3002/generate \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <your-token>" \
     -d '{"targetUrl":"https://example.com"}'
   ```

4. **Get QR Image:**
   ```bash
   curl http://localhost:3002/qr/<qr-id>/image -o qrcode.png
   ```

## Features

- **Interactive Testing**: Try all endpoints directly in the browser
- **Request/Response Examples**: See expected payload formats
- **Authentication Support**: Built-in JWT Bearer token authorization
- **Schema Validation**: View request and response schemas
- **OpenAPI 3.0 Specification**: Export and use with other tools

## Export OpenAPI Spec

You can export the OpenAPI specification for any service:

```bash
# Auth Service
curl http://localhost:3001/docs/json > auth-api.json

# QR Service
curl http://localhost:3002/docs/json > qr-api.json

# Analytics Service
curl http://localhost:3004/docs/json > analytics-api.json

# Microsite Service
curl http://localhost:3005/docs/json > microsite-api.json
```

These JSON files can be imported into tools like:
- Postman
- Insomnia
- API testing frameworks
- Code generators
