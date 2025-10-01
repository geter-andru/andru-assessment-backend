// Comprehensive logging service
// =============================

import { LogEntry, HealthCheck } from './types';
import { configService } from './configService';
import { AssessmentError } from './errorHandler';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogContext {
  sessionId?: string;
  userId?: string;
  service?: string;
  operation?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export class LoggingService {
  private static instance: LoggingService;
  private logLevel: LogLevel;
  private logFilePath: string;
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = configService.isDevelopment();
    this.logLevel = this.parseLogLevel(configService.getLoggingConfig().level);
    this.logFilePath = configService.getLoggingConfig().filePath;
  }

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'debug': return LogLevel.DEBUG;
      case 'info': return LogLevel.INFO;
      case 'warn': return LogLevel.WARN;
      case 'error': return LogLevel.ERROR;
      default: return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatLogEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const service = entry.service.padEnd(15);
    const sessionId = entry.sessionId ? `[${entry.sessionId}]` : '[no-session]';
    const userId = entry.userId ? `[${entry.userId}]` : '[no-user]';
    
    let logLine = `${timestamp} ${level} ${service} ${sessionId} ${userId} ${entry.message}`;
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      logLine += ` | ${JSON.stringify(entry.metadata)}`;
    }
    
    return logLine;
  }

  private createLogEntry(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    context?: LogContext
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date(),
      service: context?.service || 'unknown',
      sessionId: context?.sessionId,
      userId: context?.userId,
      metadata: {
        operation: context?.operation,
        duration: context?.duration,
        ...context?.metadata
      }
    };
  }

  private writeLog(entry: LogEntry): void {
    if (!this.shouldLog(LogLevel[entry.level.toUpperCase() as keyof typeof LogLevel])) {
      return;
    }

    const formattedLog = this.formatLogEntry(entry);

    // Console output for development
    if (this.isDevelopment) {
      switch (entry.level) {
        case 'debug':
          console.debug(formattedLog);
          break;
        case 'info':
          console.info(formattedLog);
          break;
        case 'warn':
          console.warn(formattedLog);
          break;
        case 'error':
          console.error(formattedLog);
          break;
      }
    }

    // TODO: Implement file logging in production
    // In production, you would write to files, send to external logging services, etc.
    // For now, we'll just use console output
  }

  public debug(message: string, context?: LogContext): void {
    const entry = this.createLogEntry('debug', message, context);
    this.writeLog(entry);
  }

  public info(message: string, context?: LogContext): void {
    const entry = this.createLogEntry('info', message, context);
    this.writeLog(entry);
  }

  public warn(message: string, context?: LogContext): void {
    const entry = this.createLogEntry('warn', message, context);
    this.writeLog(entry);
  }

  public error(message: string, error?: Error | AssessmentError, context?: LogContext): void {
    const errorContext = {
      ...context,
      metadata: {
        ...context?.metadata,
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          ...(error instanceof AssessmentError ? {
            code: error.code,
            statusCode: error.statusCode,
            details: error.details
          } : {})
        } : undefined
      }
    };

    const entry = this.createLogEntry('error', message, errorContext);
    this.writeLog(entry);
  }

  public logOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const startTime = Date.now();
    const operationContext = {
      ...context,
      operation,
      service: context?.service || 'unknown'
    };

    this.debug(`Starting operation: ${operation}`, operationContext);

    return fn()
      .then(result => {
        const duration = Date.now() - startTime;
        this.info(`Operation completed: ${operation}`, {
          ...operationContext,
          duration
        });
        return result;
      })
      .catch(error => {
        const duration = Date.now() - startTime;
        this.error(`Operation failed: ${operation}`, error, {
          ...operationContext,
          duration
        });
        throw error;
      });
  }

  public logAPIRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
    const message = `${method} ${url} - ${statusCode}`;
    
    this[level](message, {
      ...context,
      metadata: {
        ...context?.metadata,
        method,
        url,
        statusCode,
        duration
      }
    });
  }

  public logAssessmentEvent(
    event: string,
    sessionId: string,
    userId?: string,
    metadata?: Record<string, any>
  ): void {
    this.info(`Assessment event: ${event}`, {
      sessionId,
      userId,
      service: 'assessment',
      metadata
    });
  }

  public logExternalServiceCall(
    service: string,
    operation: string,
    success: boolean,
    duration: number,
    context?: LogContext
  ): void {
    const level = success ? 'info' : 'error';
    const message = `External service call: ${service}.${operation}`;
    
    this[level](message, {
      ...context,
      service,
      operation,
      duration,
      metadata: {
        ...context?.metadata,
        success
      }
    });
  }

  public logPerformanceMetric(
    metric: string,
    value: number,
    unit: string = 'ms',
    context?: LogContext
  ): void {
    this.info(`Performance metric: ${metric}`, {
      ...context,
      metadata: {
        ...context?.metadata,
        metric,
        value,
        unit
      }
    });
  }

  public logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context?: LogContext
  ): void {
    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    const message = `Security event: ${event}`;
    
    this[level](message, {
      ...context,
      service: 'security',
      metadata: {
        ...context?.metadata,
        event,
        severity
      }
    });
  }

  public logHealthCheck(healthCheck: HealthCheck): void {
    const level = healthCheck.status === 'healthy' ? 'info' : 
                  healthCheck.status === 'degraded' ? 'warn' : 'error';
    
    this[level](`Health check: ${healthCheck.service} - ${healthCheck.status}`, {
      service: 'health-check',
      metadata: {
        service: healthCheck.service,
        status: healthCheck.status,
        responseTime: healthCheck.responseTime,
        dependencies: healthCheck.dependencies,
        metrics: healthCheck.metrics
      }
    });
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public getLogLevel(): LogLevel {
    return this.logLevel;
  }
}

// Export singleton instance
export const logger = LoggingService.getInstance();

// Convenience functions
export const logDebug = (message: string, context?: LogContext) => logger.debug(message, context);
export const logInfo = (message: string, context?: LogContext) => logger.info(message, context);
export const logWarn = (message: string, context?: LogContext) => logger.warn(message, context);
export const logError = (message: string, error?: Error | AssessmentError, context?: LogContext) => 
  logger.error(message, error, context);
