# Andru Assessment API Backend

This is the backend API server for the Andru Assessment platform, built with Express.js and following the modern-platform architecture pattern.

## Features

- **Assessment Management**: Start and submit assessment sessions
- **Health Monitoring**: Health check endpoints for monitoring
- **Welcome Data**: Retrieve assessment results and user data
- **Validation**: Comprehensive input validation
- **Error Handling**: Structured error handling with proper HTTP status codes
- **Logging**: Winston-based logging system
- **Security**: CORS, rate limiting, and security headers

## API Endpoints

### Assessment
- `POST /api/assessment/start` - Start a new assessment session
- `POST /api/assessment/submit` - Submit assessment results

### Health
- `GET /api/health` - Health check endpoint

### Welcome
- `GET /api/welcome/:sessionId` - Get welcome data by session ID

## Environment Variables

Required environment variables:

```bash
# Airtable Configuration
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=your_airtable_base_id
AIRTABLE_TABLE_NAME=Assessment Results

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# Optional
PORT=3001
NODE_ENV=development
LOG_LEVEL=info
```

## Development

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```

### Run Tests
```bash
npm test
npm run test:watch
npm run test:coverage
```

### Lint Code
```bash
npm run lint
npm run lint:fix
```

## Project Structure

```
src/
├── controllers/          # Request handlers
│   ├── assessmentController.js
│   ├── healthController.js
│   └── welcomeController.js
├── middleware/           # Express middleware
│   └── errorHandler.js
├── routes/              # Route definitions
│   ├── assessment.js
│   ├── health.js
│   └── welcome.js
├── services/            # Business logic
│   └── validation.js
├── config/              # Configuration
│   └── index.js
├── utils/               # Utility functions
│   └── logger.js
└── server.js            # Main server file
```

## Error Handling

The API uses structured error handling with custom error classes:

- `ValidationError` (400) - Input validation errors
- `AuthenticationError` (401) - Authentication required
- `AuthorizationError` (403) - Insufficient permissions
- `NotFoundError` (404) - Resource not found
- `ConflictError` (409) - Resource conflict
- `RateLimitError` (429) - Rate limit exceeded
- `ExternalServiceError` (502) - External service errors

## Logging

Uses Winston for structured logging with different log levels and file outputs:

- Error logs: `logs/error.log`
- Combined logs: `logs/combined.log`
- Console output in development

## Security

- **CORS**: Configured for frontend domain
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Security Headers**: Helmet.js for security headers
- **Input Validation**: Comprehensive validation for all inputs
- **Error Sanitization**: No sensitive data in error responses

## Deployment

The backend is designed to be deployed on Render.com with the following configuration:

- Node.js 18+
- Environment variables configured in Render dashboard
- Health check endpoint for monitoring
- Automatic deployments from GitHub
