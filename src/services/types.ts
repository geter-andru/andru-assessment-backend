// Shared types for all services to prevent circular dependencies
// =============================================================

export interface AssessmentResponse {
  questionId: string;
  questionText: string;
  response: string | number;
  responseType: 'multiple_choice' | 'scale' | 'text';
  timestamp: number;
  sessionId: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface Insight {
  id: string;
  sessionId: string;
  batchNumber?: 1 | 2 | 3;
  questionRange?: string; // e.g., "1-4", "5-9", "10-12"
  insight: string;
  challengeIdentified?: string;
  businessImpact?: string;
  confidence: number;
  generatedAt: string;
  type?: 'skill_gap' | 'strength' | 'recommendation' | 'pattern';
  title?: string;
  description?: string;
  evidence?: string[];
  actionable?: boolean;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  timestamp?: Date;
}

export interface AssessmentSession {
  id: string;
  userId?: string;
  status: 'active' | 'completed' | 'abandoned';
  startTime: Date;
  endTime?: Date;
  currentQuestion?: number;
  totalQuestions: number;
  responses: AssessmentResponse[];
  insights: Insight[];
  metadata: Record<string, any>;
}

export interface SkillAssessment {
  skillId: string;
  skillName: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  confidence: number;
  evidence: string[];
  recommendations: string[];
  timestamp: Date;
}

export interface AirtableRecord {
  id: string;
  fields: Record<string, any>;
  createdTime: string;
}

export interface ModernPlatformResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export interface ServiceConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  retries: number;
  rateLimit: {
    max: number;
    window: number;
  };
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  service: string;
  sessionId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  ttl: number;
  key: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  responseTime: number;
  dependencies: Record<string, 'healthy' | 'unhealthy'>;
  metrics: Record<string, number>;
}

// Environment variable types
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  ANTHROPIC_API_KEY: string;
  NEXT_PUBLIC_AIRTABLE_API_KEY: string;
  NEXT_PUBLIC_AIRTABLE_BASE_ID: string;
  REACT_APP_AIRTABLE_BASE_ID: string;
  REACT_APP_AIRTABLE_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  MODERN_PLATFORM_API_URL: string;
  MODERN_PLATFORM_API_KEY: string;
  NEXT_PUBLIC_PLATFORM_URL: string;
  NEXT_PUBLIC_MAKE_WEBHOOK_URL: string;
  NEXT_PUBLIC_API_URL: string;
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL: string;
  RATE_LIMIT_MAX: number;
  RATE_LIMIT_WINDOW: number;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  LOG_FILE_PATH: string;
  DATABASE_URL?: string;
  REDIS_URL?: string;
  SENTRY_DSN?: string;
  ANALYTICS_ID?: string;
  ENABLE_REAL_TIME_INSIGHTS: boolean;
  ENABLE_ADVANCED_ANALYTICS: boolean;
  ENABLE_EXPORT_FUNCTIONALITY: boolean;
  ENABLE_PROGRESS_TRACKING: boolean;
  MAX_CONCURRENT_ASSESSMENTS: number;
  ASSESSMENT_TIMEOUT: number;
  CACHE_TTL: number;
  CSP_REPORT_URI?: string;
  HSTS_MAX_AGE: number;
  SKIP_ENV_VALIDATION: boolean;
  MOCK_EXTERNAL_APIS: boolean;
  DEBUG_MODE: boolean;
}
