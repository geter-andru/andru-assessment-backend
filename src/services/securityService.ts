// Comprehensive security service
// ==============================

import { configService } from './configService';
import { logger } from './loggingService';
import { monitoringService } from './monitoringService';
import { AssessmentError, AuthenticationError, AuthorizationError, RateLimitError } from './errorHandler';

export interface SecurityHeaders {
  'Content-Security-Policy': string;
  'X-Frame-Options': string;
  'X-Content-Type-Options': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'Strict-Transport-Security': string;
}

export interface SecurityConfig {
  rateLimit: {
    max: number;
    window: number;
  };
  cors: {
    origin: string[];
    methods: string[];
    allowedHeaders: string[];
  };
  headers: SecurityHeaders;
  encryption: {
    algorithm: string;
    keyLength: number;
  };
}

export interface SecurityEvent {
  type: 'authentication' | 'authorization' | 'rate_limit' | 'suspicious_activity' | 'data_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export class SecurityService {
  private static instance: SecurityService;
  private rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();
  private securityEvents: SecurityEvent[] = [];
  private blockedIPs: Set<string> = new Set();
  private suspiciousPatterns: RegExp[] = [];

  private constructor() {
    this.initializeSecurityPatterns();
  }

  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  private initializeSecurityPatterns(): void {
    // Common attack patterns
    this.suspiciousPatterns = [
      /<script[^>]*>.*?<\/script>/gi, // XSS
      /javascript:/gi, // JavaScript injection
      /on\w+\s*=/gi, // Event handlers
      /union\s+select/gi, // SQL injection
      /drop\s+table/gi, // SQL injection
      /exec\s*\(/gi, // Command injection
      /eval\s*\(/gi, // Code injection
      /\.\.\//g, // Path traversal
      /%2e%2e%2f/gi, // URL encoded path traversal
      /<iframe[^>]*>/gi, // Iframe injection
      /<object[^>]*>/gi, // Object injection
      /<embed[^>]*>/gi, // Embed injection
    ];
  }

  // Rate limiting
  public checkRateLimit(
    identifier: string,
    maxRequests: number = 100,
    windowMs: number = 900000
  ): boolean {
    const now = Date.now();
    const key = `rate_limit_${identifier}`;
    const limit = this.rateLimitStore.get(key);

    if (!limit || now > limit.resetTime) {
      this.rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (limit.count >= maxRequests) {
      this.recordSecurityEvent({
        type: 'rate_limit',
        severity: 'medium',
        message: `Rate limit exceeded for ${identifier}`,
        metadata: { identifier, maxRequests, windowMs }
      });
      return false;
    }

    limit.count++;
    return true;
  }

  public getRateLimitInfo(identifier: string, maxRequests: number = 100): {
    limit: number;
    remaining: number;
    reset: Date;
  } {
    const key = `rate_limit_${identifier}`;
    const limit = this.rateLimitStore.get(key);
    
    if (!limit) {
      return { limit: maxRequests, remaining: maxRequests, reset: new Date() };
    }

    return {
      limit: maxRequests,
      remaining: Math.max(0, maxRequests - limit.count),
      reset: new Date(limit.resetTime)
    };
  }

  // Input validation and sanitization
  public validateInput(input: any, type: 'string' | 'number' | 'email' | 'url' | 'json'): boolean {
    if (input === null || input === undefined) {
      return false;
    }

    switch (type) {
      case 'string':
        return typeof input === 'string' && input.length > 0 && input.length < 10000;
      case 'number':
        return typeof input === 'number' && !isNaN(input) && isFinite(input);
      case 'email':
        return typeof input === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
      case 'url':
        try {
          new URL(input);
          return true;
        } catch {
          return false;
        }
      case 'json':
        try {
          JSON.parse(input);
          return true;
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  public sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return String(input);
    }

    // Remove null bytes
    let sanitized = input.replace(/\0/g, '');
    
    // Remove suspicious patterns
    this.suspiciousPatterns.forEach(pattern => {
      if (pattern.test(sanitized)) {
        this.recordSecurityEvent({
          type: 'suspicious_activity',
          severity: 'high',
          message: `Suspicious pattern detected in input`,
          metadata: { pattern: pattern.toString(), input: sanitized.substring(0, 100) }
        });
        sanitized = sanitized.replace(pattern, '[BLOCKED]');
      }
    });

    // HTML encode special characters
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return sanitized;
  }

  // Authentication and authorization
  public validateAPIKey(apiKey: string, expectedKey: string): boolean {
    if (!apiKey || !expectedKey) {
      return false;
    }

    const isValid = apiKey === expectedKey;
    
    if (!isValid) {
      this.recordSecurityEvent({
        type: 'authentication',
        severity: 'high',
        message: 'Invalid API key provided',
        metadata: { providedKey: apiKey.substring(0, 10) + '...' }
      });
    }

    return isValid;
  }

  public validateSession(sessionId: string, userId?: string): boolean {
    if (!sessionId) {
      return false;
    }

    // Basic session validation - in production, you'd check against a database
    const isValid = /^[a-zA-Z0-9_-]{20,}$/.test(sessionId);
    
    if (!isValid) {
      this.recordSecurityEvent({
        type: 'authentication',
        severity: 'medium',
        message: 'Invalid session ID format',
        metadata: { sessionId: sessionId.substring(0, 10) + '...', userId }
      });
    }

    return isValid;
  }

  public checkPermission(userId: string, resource: string, action: string): boolean {
    // Basic permission check - in production, you'd implement proper RBAC
    const hasPermission = true; // Simplified for now
    
    if (!hasPermission) {
      this.recordSecurityEvent({
        type: 'authorization',
        severity: 'medium',
        message: `Permission denied: ${action} on ${resource}`,
        metadata: { userId, resource, action }
      });
    }

    return hasPermission;
  }

  // Security headers
  public getSecurityHeaders(): SecurityHeaders {
    const config = configService.getSecurityConfig();
    
    return {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' https:; object-src 'none'; media-src 'self'; frame-src 'none';",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'Strict-Transport-Security': `max-age=${config.hstsMaxAge}; includeSubDomains; preload`
    };
  }

  // CORS configuration
  public getCORSConfig(): SecurityConfig['cors'] {
    const allowedOrigins = configService.isDevelopment() 
      ? ['http://localhost:3000', 'http://localhost:3001']
      : ['https://assessment.andruai.com', 'https://platform.andruai.com'];

    return {
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    };
  }

  // IP blocking
  public blockIP(ip: string, reason: string): void {
    this.blockedIPs.add(ip);
    
    this.recordSecurityEvent({
      type: 'suspicious_activity',
      severity: 'critical',
      message: `IP blocked: ${ip}`,
      metadata: { ip, reason }
    });

    logger.warn(`IP blocked: ${ip}`, {
      service: 'security',
      metadata: { ip, reason }
    });
  }

  public isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  public unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    
    logger.info(`IP unblocked: ${ip}`, {
      service: 'security',
      metadata: { ip }
    });
  }

  // Security event recording
  public recordSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date()
    };

    this.securityEvents.push(securityEvent);

    // Keep only last 1000 events
    if (this.securityEvents.length > 1000) {
      this.securityEvents.splice(0, this.securityEvents.length - 1000);
    }

    // Log security event
    const logLevel = event.severity === 'critical' || event.severity === 'high' ? 'error' : 'warn';
    logger[logLevel](`Security event: ${event.message}`, {
      service: 'security',
      metadata: { event: securityEvent }
    });

    // Create monitoring alert for critical events
    if (event.severity === 'critical') {
      monitoringService.createAlert({
        type: 'error',
        message: `Critical security event: ${event.message}`,
        metadata: { event: securityEvent }
      });
    }
  }

  public getSecurityEvents(limit: number = 100): SecurityEvent[] {
    return this.securityEvents.slice(-limit);
  }

  public getSecurityEventsByType(type: SecurityEvent['type'], limit: number = 100): SecurityEvent[] {
    return this.securityEvents
      .filter(event => event.type === type)
      .slice(-limit);
  }

  // Data encryption (basic implementation)
  public encrypt(data: string): string {
    // In production, use proper encryption libraries like crypto-js
    // This is a basic implementation for demonstration
    return Buffer.from(data).toString('base64');
  }

  public decrypt(encryptedData: string): string {
    try {
      return Buffer.from(encryptedData, 'base64').toString('utf-8');
    } catch (error) {
      throw new AssessmentError('Failed to decrypt data', 'DECRYPTION_ERROR', 400, 'security');
    }
  }

  // Request validation
  public validateRequest(request: Request): boolean {
    const ip = this.getClientIP(request);
    
    // Check if IP is blocked
    if (this.isIPBlocked(ip)) {
      this.recordSecurityEvent({
        type: 'suspicious_activity',
        severity: 'high',
        message: `Blocked IP attempted access: ${ip}`,
        ip
      });
      return false;
    }

    // Check rate limit
    if (!this.checkRateLimit(ip)) {
      throw new RateLimitError();
    }

    // Validate request headers
    const userAgent = request.headers.get('User-Agent');
    if (!userAgent || userAgent.length < 10) {
      this.recordSecurityEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        message: 'Suspicious User-Agent header',
        ip,
        userAgent
      });
      return false;
    }

    return true;
  }

  private getClientIP(request: Request): string {
    // In production, you'd get the real IP from headers like X-Forwarded-For
    return '127.0.0.1'; // Simplified for now
  }

  // Security audit
  public performSecurityAudit(): {
    score: number;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check environment variables
    const requiredEnvVars = [
      'ANTHROPIC_API_KEY',
      'NEXT_PUBLIC_AIRTABLE_API_KEY',
      'NEXT_PUBLIC_AIRTABLE_BASE_ID'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      issues.push(`Missing environment variables: ${missingVars.join(', ')}`);
      score -= 20;
    }

    // Check for development settings in production
    if (configService.isProduction()) {
      if (configService.getOptional('DEBUG_MODE')) {
        issues.push('Debug mode enabled in production');
        score -= 15;
      }
      
      if (configService.getOptional('MOCK_EXTERNAL_APIS')) {
        issues.push('Mock APIs enabled in production');
        score -= 10;
      }
    }

    // Check security headers
    const headers = this.getSecurityHeaders();
    if (!headers['Content-Security-Policy']) {
      issues.push('Content Security Policy not configured');
      score -= 10;
    }

    // Generate recommendations
    if (score < 90) {
      recommendations.push('Review and fix security issues');
    }
    
    if (missingVars.length > 0) {
      recommendations.push('Configure all required environment variables');
    }

    recommendations.push('Implement proper authentication and authorization');
    recommendations.push('Set up monitoring and alerting for security events');
    recommendations.push('Regular security audits and penetration testing');

    return { score, issues, recommendations };
  }

  // Cleanup
  public destroy(): void {
    this.rateLimitStore.clear();
    this.securityEvents.length = 0;
    this.blockedIPs.clear();
  }
}

// Export singleton instance
export const securityService = SecurityService.getInstance();

// Convenience functions
export const checkRateLimit = (identifier: string, maxRequests?: number, windowMs?: number) =>
  securityService.checkRateLimit(identifier, maxRequests, windowMs);
export const validateInput = (input: any, type: 'string' | 'number' | 'email' | 'url' | 'json') =>
  securityService.validateInput(input, type);
export const sanitizeInput = (input: string) => securityService.sanitizeInput(input);
export const validateAPIKey = (apiKey: string, expectedKey: string) =>
  securityService.validateAPIKey(apiKey, expectedKey);
export const validateSession = (sessionId: string, userId?: string) =>
  securityService.validateSession(sessionId, userId);
export const recordSecurityEvent = (event: Omit<SecurityEvent, 'timestamp'>) =>
  securityService.recordSecurityEvent(event);
