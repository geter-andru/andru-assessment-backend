import { logger } from '../utils/logger.js';

export class ValidationError extends Error {
  field: string | null;
  statusCode: number;

  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.statusCode = 400;
  }
}

export class AuthenticationError extends Error {
  statusCode: number;

  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
  }
}

export class AuthorizationError extends Error {
  statusCode: number;

  constructor(message = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = 403;
  }
}

export class NotFoundError extends Error {
  statusCode: number;

  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

export class ConflictError extends Error {
  statusCode: number;

  constructor(message = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}

export class RateLimitError extends Error {
  statusCode: number;

  constructor(message = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
    this.statusCode = 429;
  }
}

export class ExternalServiceError extends Error {
  service: string | null;
  statusCode: number;

  constructor(message = 'External service error', service = null) {
    super(message);
    this.name = 'ExternalServiceError';
    this.service = service;
    this.statusCode = 502;
  }
}

// Main error handler middleware
export default (err, req, res, next) => {
  // Log the error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Handle known error types
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json({
      success: false,
      error: 'Validation Error',
      message: err.message,
      field: err.field
    });
  }

  if (err instanceof AuthenticationError) {
    return res.status(err.statusCode).json({
      success: false,
      error: 'Authentication Error',
      message: err.message
    });
  }

  if (err instanceof AuthorizationError) {
    return res.status(err.statusCode).json({
      success: false,
      error: 'Authorization Error',
      message: err.message
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(err.statusCode).json({
      success: false,
      error: 'Not Found',
      message: err.message
    });
  }

  if (err instanceof ConflictError) {
    return res.status(err.statusCode).json({
      success: false,
      error: 'Conflict',
      message: err.message
    });
  }

  if (err instanceof RateLimitError) {
    return res.status(err.statusCode).json({
      success: false,
      error: 'Rate Limit Exceeded',
      message: err.message
    });
  }

  if (err instanceof ExternalServiceError) {
    return res.status(err.statusCode).json({
      success: false,
      error: 'External Service Error',
      message: err.message,
      service: err.service
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid Token',
      message: 'Invalid authentication token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token Expired',
      message: 'Authentication token has expired'
    });
  }

  // Handle validation errors from Joi
  if (err.isJoi) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: err.details[0].message,
      field: err.details[0].path.join('.')
    });
  }

  // Handle database errors
  if (err.code === '23505') { // PostgreSQL unique violation
    return res.status(409).json({
      success: false,
      error: 'Conflict',
      message: 'Resource already exists'
    });
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    return res.status(400).json({
      success: false,
      error: 'Invalid Reference',
      message: 'Referenced resource does not exist'
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: 'Internal Server Error',
    message: message
  });
};
