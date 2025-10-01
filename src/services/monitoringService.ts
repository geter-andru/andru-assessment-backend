// Comprehensive monitoring and health check service
// ================================================

import { HealthCheck, LogEntry } from './types';
import { configService } from './configService';
import { logger } from './loggingService';
import { AssessmentError, ExternalServiceError } from './errorHandler';

export interface Metric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  resolved: boolean;
  metadata?: Record<string, any>;
}

export interface ServiceStatus {
  name: string;
  healthy: boolean;
  responseTime: number;
  lastCheck: Date;
  error?: string;
  metrics: Record<string, number>;
}

export class MonitoringService {
  private static instance: MonitoringService;
  private metrics: Map<string, Metric[]> = new Map();
  private alerts: Alert[] = [];
  private serviceStatuses: Map<string, ServiceStatus> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeHealthChecks();
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  private initializeHealthChecks(): void {
    // Start periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 60000); // Check every minute

    // Initial health check
    this.performHealthChecks();
  }

  public cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  // Metrics collection
  public recordMetric(metric: Metric): void {
    const existingMetrics = this.metrics.get(metric.name) || [];
    existingMetrics.push(metric);
    
    // Keep only last 1000 metrics per name
    if (existingMetrics.length > 1000) {
      existingMetrics.splice(0, existingMetrics.length - 1000);
    }
    
    this.metrics.set(metric.name, existingMetrics);
    
    logger.debug(`Metric recorded: ${metric.name}`, {
      service: 'monitoring',
      metadata: { metric }
    });
  }

  public getMetric(name: string, timeRange?: { start: Date; end: Date }): Metric[] {
    const allMetrics = this.metrics.get(name) || [];
    
    if (!timeRange) {
      return allMetrics;
    }
    
    return allMetrics.filter(metric => 
      metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
    );
  }

  public getMetricStats(name: string, timeRange?: { start: Date; end: Date }): {
    count: number;
    min: number;
    max: number;
    avg: number;
    sum: number;
  } {
    const metrics = this.getMetric(name, timeRange);
    
    if (metrics.length === 0) {
      return { count: 0, min: 0, max: 0, avg: 0, sum: 0 };
    }
    
    const values = metrics.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: sum / values.length,
      sum
    };
  }

  // Health checks
  private async performHealthChecks(): Promise<void> {
    const services = [
      'anthropic',
      'airtable',
      'supabase',
      'modern-platform',
      'make'
    ];

    for (const serviceName of services) {
      try {
        await this.checkServiceHealth(serviceName);
      } catch (error) {
        logger.error(`Health check failed for ${serviceName}`, error, {
          service: 'monitoring'
        });
      }
    }
  }

  private async checkServiceHealth(serviceName: string): Promise<void> {
    const startTime = Date.now();
    let healthy = false;
    let error: string | undefined;

    try {
      switch (serviceName) {
        case 'anthropic':
          healthy = await this.checkAnthropicHealth();
          break;
        case 'airtable':
          healthy = await this.checkAirtableHealth();
          break;
        case 'supabase':
          healthy = await this.checkSupabaseHealth();
          break;
        case 'modern-platform':
          healthy = await this.checkModernPlatformHealth();
          break;
        case 'make':
          healthy = await this.checkMakeHealth();
          break;
        default:
          throw new Error(`Unknown service: ${serviceName}`);
      }
    } catch (err) {
      healthy = false;
      error = err instanceof Error ? err.message : String(err);
    }

    const responseTime = Date.now() - startTime;
    
    const status: ServiceStatus = {
      name: serviceName,
      healthy,
      responseTime,
      lastCheck: new Date(),
      error,
      metrics: {
        responseTime,
        healthy: healthy ? 1 : 0
      }
    };

    this.serviceStatuses.set(serviceName, status);

    // Record metrics
    this.recordMetric({
      name: `${serviceName}.health_check.response_time`,
      value: responseTime,
      unit: 'ms',
      timestamp: new Date(),
      tags: { service: serviceName, healthy: healthy.toString() }
    });

    this.recordMetric({
      name: `${serviceName}.health_check.status`,
      value: healthy ? 1 : 0,
      unit: 'boolean',
      timestamp: new Date(),
      tags: { service: serviceName }
    });

    // Create alert if service is unhealthy
    if (!healthy) {
      this.createAlert({
        type: 'error',
        message: `Service ${serviceName} is unhealthy: ${error}`,
        metadata: { service: serviceName, error }
      });
    }
  }

  private async checkAnthropicHealth(): Promise<boolean> {
    const apiKey = configService.getOptional('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    
    // Simple health check - just verify API key format
    return apiKey.startsWith('sk-ant-');
  }

  private async checkAirtableHealth(): Promise<boolean> {
    const apiKey = configService.getOptional('NEXT_PUBLIC_AIRTABLE_API_KEY');
    const baseId = configService.getOptional('NEXT_PUBLIC_AIRTABLE_BASE_ID');
    
    if (!apiKey || !baseId) {
      throw new Error('Airtable configuration missing');
    }
    
    // Simple health check - verify API key format
    return apiKey.startsWith('pat') && baseId.startsWith('app');
  }

  private async checkSupabaseHealth(): Promise<boolean> {
    const url = configService.getOptional('NEXT_PUBLIC_SUPABASE_URL');
    const key = configService.getOptional('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    if (!url || !key) {
      throw new Error('Supabase configuration missing');
    }
    
    // Simple health check - verify URL format
    return url.includes('supabase.co') && key.length > 50;
  }

  private async checkModernPlatformHealth(): Promise<boolean> {
    const url = configService.getOptional('MODERN_PLATFORM_API_URL');
    const key = configService.getOptional('MODERN_PLATFORM_API_KEY');
    
    if (!url || !key) {
      throw new Error('Modern Platform configuration missing');
    }
    
    // Simple health check - verify URL format
    return url.startsWith('http') && key.length > 10;
  }

  private async checkMakeHealth(): Promise<boolean> {
    const webhookUrl = configService.getOptional('NEXT_PUBLIC_MAKE_WEBHOOK_URL');
    
    if (!webhookUrl) {
      throw new Error('Make.com webhook URL not configured');
    }
    
    // Simple health check - verify URL format
    return webhookUrl.includes('hook.us1.make.com');
  }

  // Alerts
  public createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'resolved'>): Alert {
    const newAlert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false,
      ...alert
    };

    this.alerts.push(newAlert);
    
    logger.warn(`Alert created: ${newAlert.message}`, {
      service: 'monitoring',
      metadata: { alert: newAlert }
    });

    return newAlert;
  }

  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      logger.info(`Alert resolved: ${alertId}`, {
        service: 'monitoring',
        metadata: { alertId }
      });
      return true;
    }
    return false;
  }

  public getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  public getAllAlerts(): Alert[] {
    return [...this.alerts];
  }

  // Service status
  public getServiceStatus(serviceName: string): ServiceStatus | undefined {
    return this.serviceStatuses.get(serviceName);
  }

  public getAllServiceStatuses(): ServiceStatus[] {
    return Array.from(this.serviceStatuses.values());
  }

  public getOverallHealth(): HealthCheck {
    const services = this.getAllServiceStatuses();
    const healthyServices = services.filter(s => s.healthy);
    const overallStatus = healthyServices.length === services.length ? 'healthy' :
                         healthyServices.length > 0 ? 'degraded' : 'unhealthy';

    const dependencies: Record<string, 'healthy' | 'unhealthy'> = {};
    services.forEach(service => {
      dependencies[service.name] = service.healthy ? 'healthy' : 'unhealthy';
    });

    const metrics: Record<string, number> = {
      totalServices: services.length,
      healthyServices: healthyServices.length,
      unhealthyServices: services.length - healthyServices.length,
      averageResponseTime: services.reduce((sum, s) => sum + s.responseTime, 0) / services.length
    };

    return {
      service: 'assessment-platform',
      status: overallStatus,
      timestamp: new Date(),
      responseTime: metrics.averageResponseTime,
      dependencies,
      metrics
    };
  }

  // Performance monitoring
  public recordPerformanceMetric(
    operation: string,
    duration: number,
    success: boolean = true,
    metadata?: Record<string, any>
  ): void {
    this.recordMetric({
      name: `performance.${operation}.duration`,
      value: duration,
      unit: 'ms',
      timestamp: new Date(),
      tags: {
        operation,
        success: success.toString(),
        ...metadata
      }
    });

    this.recordMetric({
      name: `performance.${operation}.success`,
      value: success ? 1 : 0,
      unit: 'boolean',
      timestamp: new Date(),
      tags: { operation }
    });
  }

  // Error monitoring
  public recordError(
    error: Error | AssessmentError,
    context?: Record<string, any>
  ): void {
    const errorType = error instanceof AssessmentError ? error.code : error.name;
    
    this.recordMetric({
      name: `errors.${errorType}.count`,
      value: 1,
      unit: 'count',
      timestamp: new Date(),
      tags: {
        errorType,
        service: error instanceof AssessmentError ? error.service : 'unknown'
      }
    });

    // Create alert for critical errors
    if (error instanceof AssessmentError && error.statusCode >= 500) {
      this.createAlert({
        type: 'error',
        message: `Critical error: ${error.message}`,
        metadata: {
          error: error.toAPIError(),
          context
        }
      });
    }
  }

  // Cleanup
  public destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

// Export singleton instance
export const monitoringService = MonitoringService.getInstance();

// Convenience functions
export const recordMetric = (metric: Metric) => monitoringService.recordMetric(metric);
export const recordPerformanceMetric = (operation: string, duration: number, success?: boolean, metadata?: Record<string, any>) =>
  monitoringService.recordPerformanceMetric(operation, duration, success, metadata);
export const recordError = (error: Error | AssessmentError, context?: Record<string, any>) =>
  monitoringService.recordError(error, context);
export const createAlert = (alert: Omit<Alert, 'id' | 'timestamp' | 'resolved'>) =>
  monitoringService.createAlert(alert);
