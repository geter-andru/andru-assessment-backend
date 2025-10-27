// Centralized configuration service
// ================================

import { EnvironmentConfig, ServiceConfig } from './types';
import { ConfigurationError, ErrorHandler } from './errorHandler';

export class ConfigService {
  private static instance: ConfigService;
  private config: Partial<EnvironmentConfig>;

  private constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  private loadConfig(): Partial<EnvironmentConfig> {
    return {
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      NEXT_PUBLIC_AIRTABLE_API_KEY: process.env.NEXT_PUBLIC_AIRTABLE_API_KEY,
      NEXT_PUBLIC_AIRTABLE_BASE_ID: process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID,
      REACT_APP_AIRTABLE_BASE_ID: process.env.REACT_APP_AIRTABLE_BASE_ID,
      REACT_APP_AIRTABLE_API_KEY: process.env.REACT_APP_AIRTABLE_API_KEY,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      MODERN_PLATFORM_API_URL: process.env.MODERN_PLATFORM_API_URL || 'http://localhost:3000',
      MODERN_PLATFORM_API_KEY: process.env.MODERN_PLATFORM_API_KEY,
      NEXT_PUBLIC_PLATFORM_URL: process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000',
      NEXT_PUBLIC_MAKE_WEBHOOK_URL: process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100'),
      RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'),
      LOG_LEVEL: (process.env.LOG_LEVEL as any) || 'info',
      LOG_FILE_PATH: process.env.LOG_FILE_PATH || './logs/assessment.log',
      DATABASE_URL: process.env.DATABASE_URL,
      REDIS_URL: process.env.REDIS_URL,
      SENTRY_DSN: process.env.SENTRY_DSN,
      ANALYTICS_ID: process.env.ANALYTICS_ID,
      ENABLE_REAL_TIME_INSIGHTS: process.env.ENABLE_REAL_TIME_INSIGHTS === 'true',
      ENABLE_ADVANCED_ANALYTICS: process.env.ENABLE_ADVANCED_ANALYTICS === 'true',
      ENABLE_EXPORT_FUNCTIONALITY: process.env.ENABLE_EXPORT_FUNCTIONALITY === 'true',
      ENABLE_PROGRESS_TRACKING: process.env.ENABLE_PROGRESS_TRACKING === 'true',
      MAX_CONCURRENT_ASSESSMENTS: parseInt(process.env.MAX_CONCURRENT_ASSESSMENTS || '50'),
      ASSESSMENT_TIMEOUT: parseInt(process.env.ASSESSMENT_TIMEOUT || '300000'),
      CACHE_TTL: parseInt(process.env.CACHE_TTL || '3600'),
      CSP_REPORT_URI: process.env.CSP_REPORT_URI,
      HSTS_MAX_AGE: parseInt(process.env.HSTS_MAX_AGE || '31536000'),
      SKIP_ENV_VALIDATION: process.env.SKIP_ENV_VALIDATION === 'true',
      MOCK_EXTERNAL_APIS: process.env.MOCK_EXTERNAL_APIS === 'true',
      DEBUG_MODE: process.env.DEBUG_MODE === 'true'
    };
  }

  private validateConfig(): void {
    if (this.config.SKIP_ENV_VALIDATION) {
      return;
    }

    const requiredVars = [
      'ANTHROPIC_API_KEY',
      'NEXT_PUBLIC_AIRTABLE_API_KEY',
      'NEXT_PUBLIC_AIRTABLE_BASE_ID'
    ];

    const missing = requiredVars.filter(varName => !this.config[varName as keyof EnvironmentConfig]);
    
    if (missing.length > 0) {
      throw new ConfigurationError(
        `Missing required environment variables: ${missing.join(', ')}`,
        { missing, config: this.config }
      );
    }
  }

  public get<K extends keyof EnvironmentConfig>(key: K): EnvironmentConfig[K] {
    const value = this.config[key];
    if (value === undefined) {
      throw new ConfigurationError(`Configuration key '${key}' is not defined`);
    }
    return value;
  }

  public getOptional<K extends keyof EnvironmentConfig>(key: K): EnvironmentConfig[K] | undefined {
    return this.config[key];
  }

  public isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  public isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  public isTest(): boolean {
    return this.config.NODE_ENV === 'test';
  }

  public getServiceConfig(serviceName: string): ServiceConfig {
    const baseUrl = this.getServiceUrl(serviceName);
    const apiKey = this.getServiceApiKey(serviceName);

    return {
      apiKey,
      baseUrl,
      timeout: 30000,
      retries: 3,
      rateLimit: {
        max: this.config.RATE_LIMIT_MAX || 100,
        window: this.config.RATE_LIMIT_WINDOW || 900000
      }
    };
  }

  private getServiceUrl(serviceName: string): string {
    switch (serviceName) {
      case 'anthropic':
        return 'https://api.anthropic.com';
      case 'airtable':
        return 'https://api.airtable.com';
      case 'supabase':
        return this.config.SUPABASE_URL || '';
      case 'modern-platform':
        return this.config.MODERN_PLATFORM_API_URL || 'http://localhost:3000';
      case 'make':
        return this.config.NEXT_PUBLIC_MAKE_WEBHOOK_URL || '';
      default:
        throw new ConfigurationError(`Unknown service: ${serviceName}`);
    }
  }

  private getServiceApiKey(serviceName: string): string {
    switch (serviceName) {
      case 'anthropic':
        return this.config.ANTHROPIC_API_KEY || '';
      case 'airtable':
        return this.config.NEXT_PUBLIC_AIRTABLE_API_KEY || '';
      case 'supabase':
        return this.config.SUPABASE_ANON_KEY || '';
      case 'modern-platform':
        return this.config.MODERN_PLATFORM_API_KEY || '';
      default:
        throw new ConfigurationError(`No API key configured for service: ${serviceName}`);
    }
  }

  public getFeatureFlag(flag: string): boolean {
    switch (flag) {
      case 'realTimeInsights':
        return this.config.ENABLE_REAL_TIME_INSIGHTS || false;
      case 'advancedAnalytics':
        return this.config.ENABLE_ADVANCED_ANALYTICS || false;
      case 'exportFunctionality':
        return this.config.ENABLE_EXPORT_FUNCTIONALITY || false;
      case 'progressTracking':
        return this.config.ENABLE_PROGRESS_TRACKING || false;
      default:
        return false;
    }
  }

  public getPerformanceConfig() {
    return {
      maxConcurrentAssessments: this.config.MAX_CONCURRENT_ASSESSMENTS || 50,
      assessmentTimeout: this.config.ASSESSMENT_TIMEOUT || 300000,
      cacheTTL: this.config.CACHE_TTL || 3600
    };
  }

  public getSecurityConfig() {
    return {
      cspReportUri: this.config.CSP_REPORT_URI,
      hstsMaxAge: this.config.HSTS_MAX_AGE || 31536000,
      rateLimitMax: this.config.RATE_LIMIT_MAX || 100,
      rateLimitWindow: this.config.RATE_LIMIT_WINDOW || 900000
    };
  }

  public getLoggingConfig() {
    return {
      level: this.config.LOG_LEVEL || 'info',
      filePath: this.config.LOG_FILE_PATH || './logs/assessment.log'
    };
  }

  public getAllConfig(): Partial<EnvironmentConfig> {
    return { ...this.config };
  }

  public reload(): void {
    this.config = this.loadConfig();
    this.validateConfig();
  }
}

// Export singleton instance
export const configService = ConfigService.getInstance();
