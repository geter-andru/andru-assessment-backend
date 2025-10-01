// Comprehensive error handling utility
// ===================================

import { APIError, LogEntry } from './types';

export class AssessmentError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly timestamp: Date;
  public readonly service: string;

  public readonly context?: any;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    serviceOrContext: string | any = 'unknown',
    details?: any,
    context?: any
  ) {
    super(message);
    this.name = 'AssessmentError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date();
    
    // Handle both service string and context object as 4th parameter
    if (typeof serviceOrContext === 'string') {
      this.service = serviceOrContext;
      this.context = context;
    } else {
      this.service = 'unknown';
      this.context = serviceOrContext;
    }
  }

  toAPIError(): APIError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

export class ValidationError extends AssessmentError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, 'validation', details, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AssessmentError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401, 'auth');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AssessmentError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403, 'auth');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AssessmentError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(message, 'NOT_FOUND_ERROR', 404, 'database');
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AssessmentError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', 'RATE_LIMIT_ERROR', 429, 'rate-limit');
    this.name = 'RateLimitError';
    if (retryAfter) {
      this.details = { retryAfter };
    }
  }
}

export class ExternalServiceError extends AssessmentError {
  constructor(message: string, service: string, details?: any) {
    super(`External service error: ${message}`, 'EXTERNAL_SERVICE_ERROR', 502, service, details);
    this.name = 'ExternalServiceError';
  }
}

export class DatabaseError extends AssessmentError {
  constructor(message: string, details?: any) {
    super(`Database error: ${message}`, 'DATABASE_ERROR', 500, 'database', details);
    this.name = 'DatabaseError';
  }
}

export class ConfigurationError extends AssessmentError {
  constructor(message: string, details?: any) {
    super(`Configuration error: ${message}`, 'CONFIGURATION_ERROR', 500, 'config', details);
    this.name = 'ConfigurationError';
  }
}

// Error handling utilities
export class ErrorHandler {
  public static logError(error: Error, context?: any): void {
    const logEntry: LogEntry = {
      level: 'error',
      message: error.message,
      timestamp: new Date(),
      service: error instanceof AssessmentError ? error.service : 'unknown',
      metadata: {
        stack: error.stack,
        ...(error instanceof AssessmentError ? {
          statusCode: error.statusCode,
          details: error.details
        } : {})
      },
      ...(error instanceof AssessmentError ? {
        code: error.code
      } : {}),
      ...(context ? { ...context } : {})
    };

    // Log to console in development or test
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      console.error('Assessment Error:', logEntry);
    }

    // TODO: Implement proper logging service (Winston, etc.)
    // logger.error(logEntry);
  }

  public static handle(error: unknown, context?: any): AssessmentError {
    let assessmentError: AssessmentError;

    if (error instanceof AssessmentError) {
      assessmentError = error;
      // Preserve context if provided
      if (context) {
        assessmentError.context = context;
      }
    } else if (error instanceof Error) {
      // Convert generic errors to AssessmentError
      assessmentError = new AssessmentError(
        error.message,
        'UNKNOWN_ERROR',
        500,
        'unknown',
        { originalError: error.name },
        context
      );
    } else if (typeof error === 'string') {
      // Handle string errors
      assessmentError = new AssessmentError(
        error,
        'UNKNOWN_ERROR',
        500,
        'unknown',
        { originalError: 'String' },
        context
      );
    } else {
      // Handle unknown error types
      assessmentError = new AssessmentError(
        'An unknown error occurred',
        'UNKNOWN_ERROR',
        500,
        'unknown',
        { originalError: String(error) },
        context
      );
    }

    this.logError(assessmentError, context);
    return assessmentError;
  }

  public static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context?: any
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw this.handle(error, context);
    }
  }

  public static validateEnvironment(): void {
    const requiredVars = [
      'ANTHROPIC_API_KEY',
      'NEXT_PUBLIC_AIRTABLE_API_KEY',
      'NEXT_PUBLIC_AIRTABLE_BASE_ID'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw new ConfigurationError(
        `Missing required environment variables: ${missing.join(', ')}`,
        { missing }
      );
    }
  }

  public static sanitizeError(error: AssessmentError, includeDetails: boolean = false): APIError {
    const sanitized: APIError = {
      code: error.code,
      message: error.message,
      timestamp: error.timestamp
    };

    if (includeDetails && error.details) {
      sanitized.details = error.details;
    }

    return sanitized;
  }
}

// Rate limiting utility
export class RateLimiter {
  private static limits = new Map<string, { count: number; resetTime: number }>();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 900000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  public checkRateLimit(key: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const limit = RateLimiter.limits.get(key);

    if (!limit || now > limit.resetTime) {
      RateLimiter.limits.set(key, { count: 1, resetTime: now + this.windowMs });
      return { allowed: true, remaining: this.maxRequests - 1 };
    }

    if (limit.count >= this.maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    limit.count++;
    return { allowed: true, remaining: this.maxRequests - limit.count };
  }

  public static checkLimit(key: string, maxRequests: number = 100, windowMs: number = 900000): boolean {
    const now = Date.now();
    const limit = this.limits.get(key);

    if (!limit || now > limit.resetTime) {
      this.limits.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (limit.count >= maxRequests) {
      return false;
    }

    limit.count++;
    return true;
  }

  public static getRemainingRequests(key: string, maxRequests: number = 100): number {
    const limit = this.limits.get(key);
    if (!limit) return maxRequests;
    return Math.max(0, maxRequests - limit.count);
  }

  public static clearLimits(): void {
    this.limits.clear();
  }
}

// Retry utility
export class RetryHandler {
  private maxRetries: number;
  private delayMs: number;
  private backoffMultiplier: number;

  constructor(maxRetries: number = 3, delayMs: number = 1000, backoffMultiplier: number = 2) {
    this.maxRetries = maxRetries;
    this.delayMs = delayMs;
    this.backoffMultiplier = backoffMultiplier;
  }

  public async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    return RetryHandler.withRetry(operation, this.maxRetries, this.delayMs, this.backoffMultiplier);
  }

  public static async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000,
    backoffMultiplier: number = 2
  ): Promise<T> {
    return this.withRetry(operation, maxRetries, delayMs, backoffMultiplier);
  }

  public static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000,
    backoffMultiplier: number = 2
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries - 1) {
          break;
        }

        // Don't retry certain error types
        if (error instanceof ValidationError || 
            error instanceof AuthenticationError || 
            error instanceof AuthorizationError) {
          break;
        }

        const delay = delayMs * Math.pow(backoffMultiplier, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }
}

// Circuit breaker pattern
export class CircuitBreaker {
  private static states = new Map<string, {
    state: 'closed' | 'open' | 'half-open';
    failureCount: number;
    lastFailureTime: number;
    successCount: number;
  }>();

  private key: string;
  private options: {
    failureThreshold: number;
    recoveryTimeout: number;
    successThreshold: number;
  };

  constructor(
    failureThreshold: number = 5,
    recoveryTimeout: number = 60000,
    successThreshold: number = 3
  ) {
    this.key = 'default';
    this.options = {
      failureThreshold,
      recoveryTimeout,
      successThreshold
    };
  }

  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    return CircuitBreaker.execute(this.key, operation, this.options);
  }

  public static clearStates(): void {
    this.states.clear();
  }

  public static async execute<T>(
    key: string,
    operation: () => Promise<T>,
    options: {
      failureThreshold: number;
      recoveryTimeout: number;
      successThreshold: number;
    } = {
      failureThreshold: 5,
      recoveryTimeout: 60000,
      successThreshold: 3
    }
  ): Promise<T> {
    const state = this.states.get(key) || {
      state: 'closed' as const,
      failureCount: 0,
      lastFailureTime: 0,
      successCount: 0
    };

    // Check if circuit is open
    if (state.state === 'open') {
      if (Date.now() - state.lastFailureTime > options.recoveryTimeout) {
        state.state = 'half-open';
        state.successCount = 0;
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      
      // Success - reset failure count
      state.failureCount = 0;
      state.successCount++;
      
      if (state.state === 'half-open' && state.successCount >= options.successThreshold) {
        state.state = 'closed';
      }
      
      this.states.set(key, state);
      return result;
    } catch (error) {
      state.failureCount++;
      state.lastFailureTime = Date.now();
      
      if (state.failureCount >= options.failureThreshold) {
        state.state = 'open';
      }
      
      this.states.set(key, state);
      throw error;
    }
  }
}
