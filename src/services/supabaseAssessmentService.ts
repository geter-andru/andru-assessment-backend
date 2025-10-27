import { createClient, SupabaseClient } from '@supabase/supabase-js';

// TypeScript Interfaces
interface AssessmentData {
  sessionId: string;
  results: {
    overallScore: number;
    performanceLevel: string;
    buyerScore: number;
    techScore: number;
    challenges: string[];
    primaryRecommendation: string;
    focusArea: string;
    revenueOpportunity: number;
    roiMultiplier: number;
    isHighPriority: boolean;
    leadPriority: string;
    impactTimeline: string;
  };
  userInfo: {
    email: string;
    company: string;
    productName: string;
    productDescription: string;
    businessModel: string;
    distinguishingFeature: string;
    competitivePositioning: string;
  };
  duration: number;
  completionContext: Record<string, any>;
}

interface UserInfo {
  email: string;
  company: string;
  productName?: string;
  productDescription?: string;
  businessModel?: string;
  distinguishingFeature?: string;
  competitivePositioning?: string;
}

interface AssessmentResult {
  success: boolean;
  assessmentId?: string;
  sessionId?: string;
  error?: string;
}

interface UpdateResult {
  success: boolean;
  data?: any;
  error?: string;
}

interface RedirectResult {
  redirectUrl: string;
  supabaseStored: boolean;
  assessmentId?: string;
  message: string;
}

// Supabase configuration - use environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Create Supabase client if credentials are available
let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn('Supabase credentials not found. Assessment will work in standalone mode.');
}

/**
 * Supabase Assessment Service
 * Handles assessment data storage and retrieval in Supabase
 */
export class SupabaseAssessmentService {
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = !!supabase;
  }

  /**
   * Store completed assessment for linking after user signup
   */
  async storeCompletedAssessment(assessmentData: AssessmentData, userInfo: UserInfo): Promise<AssessmentResult> {
    if (!this.isEnabled) {
      console.log('Supabase not configured, assessment stored locally only');
      return { success: false, error: 'supabase_not_configured' };
    }

    try {
      const assessmentRecord = {
        session_id: assessmentData.sessionId || this.generateSessionId(),
        assessment_data: JSON.stringify(assessmentData),
        user_email: userInfo.email,
        company_name: userInfo.company,
        overall_score: assessmentData.results?.overallScore || 0,
        buyer_score: assessmentData.results?.buyerScore || 0,
        tech_score: assessmentData.results?.techScore || 0,
        performance_level: assessmentData.results?.performanceLevel || 'Foundation',
        challenges: JSON.stringify(assessmentData.results?.challenges || []),
        primary_recommendation: assessmentData.results?.primaryRecommendation || '',
        focus_area: assessmentData.results?.focusArea || 'customer_analysis',
        revenue_opportunity: assessmentData.results?.revenueOpportunity || 0,
        roi_multiplier: assessmentData.results?.roiMultiplier || 1.0,
        is_high_priority: assessmentData.results?.isHighPriority || false,
        lead_priority: assessmentData.results?.leadPriority || 'standard',
        impact_timeline: assessmentData.results?.impactTimeline || 'medium_term',
        product_name: userInfo.productName || '',
        product_description: userInfo.productDescription || '',
        business_model: userInfo.businessModel || '',
        distinguishing_feature: userInfo.distinguishingFeature || '',
        competitive_positioning: userInfo.competitivePositioning || '',
        duration_minutes: assessmentData.duration || 0,
        completion_context: JSON.stringify(assessmentData.completionContext || {}),
        status: 'completed_awaiting_signup',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase!
        .from('assessment_sessions')
        .insert(assessmentRecord)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ Assessment stored in Supabase:', data.id);
      return { 
        success: true, 
        assessmentId: data.id,
        sessionId: data.session_id 
      };
    } catch (error) {
      console.error('Failed to store assessment in Supabase:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update assessment status (e.g., when user signs up)
   */
  async updateAssessmentStatus(sessionId: string, status: string, userId?: string): Promise<UpdateResult> {
    if (!this.isEnabled) {
      return { success: false, error: 'supabase_not_configured' };
    }

    try {
      const updates: Record<string, any> = {
        status: status,
        updated_at: new Date().toISOString()
      };

      if (userId) {
        updates.user_id = userId;
      }

      const { data, error } = await supabase!
        .from('assessment_sessions')
        .update(updates)
        .eq('session_id', sessionId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      console.error('Failed to update assessment status:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Retrieve assessment data by session ID
   */
  async getAssessmentBySessionId(sessionId: string): Promise<AssessmentData | null> {
    if (!this.isEnabled) {
      return null;
    }

    try {
      const { data, error } = await supabase!
        .from('assessment_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (error) {
        throw error;
      }

      // Parse the assessment data
      const assessmentData = JSON.parse(data.assessment_data || '{}');
      return assessmentData;
    } catch (error) {
      console.error('Failed to retrieve assessment from Supabase:', error);
      return null;
    }
  }

  /**
   * Retrieve assessment data by user email
   */
  async getAssessmentByEmail(email: string): Promise<AssessmentData | null> {
    if (!this.isEnabled) {
      return null;
    }

    try {
      const { data, error } = await supabase!
        .from('assessment_sessions')
        .select('*')
        .eq('user_email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        throw error;
      }

      // Parse the assessment data
      const assessmentData = JSON.parse(data.assessment_data || '{}');
      return assessmentData;
    } catch (error) {
      console.error('Failed to retrieve assessment by email from Supabase:', error);
      return null;
    }
  }

  /**
   * Generate platform redirect URL with assessment data
   */
  generatePlatformRedirectUrl(userInfo: UserInfo, assessmentData: AssessmentData): string {
    const platformBaseUrl = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000';
    const params = new URLSearchParams({
      email: userInfo.email,
      company: userInfo.company,
      score: assessmentData.results?.overallScore?.toString() || '0',
      challenges: assessmentData.results?.challenges?.length?.toString() || '0',
      sessionId: assessmentData.sessionId,
      performanceLevel: assessmentData.results?.performanceLevel || 'Foundation',
      focusArea: assessmentData.results?.focusArea || 'customer_analysis',
      revenueOpportunity: assessmentData.results?.revenueOpportunity?.toString() || '0'
    });

    // Direct to signup with assessment context
    return `${platformBaseUrl}/signup?${params.toString()}`;
  }

  /**
   * Generate unique session ID
   */
  generateSessionId(): string {
    return `asmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if Supabase is configured
   */
  isConfigured(): boolean {
    return this.isEnabled;
  }

  /**
   * Get redirect message for users
   */
  getRedirectMessage(): string {
    return this.isEnabled 
      ? "Your assessment has been saved! Sign up to access your personalized Revenue Intelligence dashboard."
      : "Complete your setup in the Revenue Intelligence Platform to see your personalized results.";
  }

  /**
   * Enhanced redirect with assessment data storage
   */
  async completeAssessmentAndRedirect(assessmentData: AssessmentData, userInfo: UserInfo): Promise<RedirectResult> {
    // Store in Supabase if available
    const storeResult = await this.storeCompletedAssessment(assessmentData, userInfo);
    
    // Generate redirect URL
    const redirectUrl = this.generatePlatformRedirectUrl(userInfo, assessmentData);
    
    // Store in sessionStorage as backup
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('assessmentResults', JSON.stringify({
          results: assessmentData,
          userInfo: userInfo,
          timestamp: Date.now(),
          supabaseStored: storeResult.success
        }));
      }
    } catch (error) {
      console.warn('Could not store assessment in sessionStorage:', error);
    }

    return {
      redirectUrl,
      supabaseStored: storeResult.success,
      assessmentId: storeResult.assessmentId,
      message: this.getRedirectMessage()
    };
  }

  /**
   * Test connection to Supabase
   */
  async testConnection(): Promise<{ connected: boolean; reason?: string; error?: string }> {
    if (!this.isEnabled) {
      return { connected: false, reason: 'not_configured' };
    }

    try {
      // Try to access a table (this will fail gracefully if not set up)
      const { data, error } = await supabase!
        .from('assessment_sessions')
        .select('count(*)', { count: 'exact', head: true })
        .limit(1);

      if (error && error.code !== 'PGRST116') { // PGRST116 is "table not found" which is acceptable
        throw error;
      }

      return { connected: true };
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      return { 
        connected: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get assessment statistics
   */
  async getAssessmentStats(): Promise<{
    totalAssessments: number;
    averageScore: number;
    topChallenges: string[];
    successRate: number;
  } | null> {
    if (!this.isEnabled) {
      return null;
    }

    try {
      const { data, error } = await supabase!
        .from('assessment_sessions')
        .select('overall_score, challenges, status');

      if (error) {
        throw error;
      }

      const totalAssessments = data.length;
      const averageScore = data.reduce((sum, item) => sum + (item.overall_score || 0), 0) / totalAssessments;
      
      // Count challenge frequencies
      const challengeCounts: Record<string, number> = {};
      data.forEach(item => {
        try {
          const challenges = JSON.parse(item.challenges || '[]');
          challenges.forEach((challenge: string) => {
            challengeCounts[challenge] = (challengeCounts[challenge] || 0) + 1;
          });
        } catch (e) {
          // Ignore parsing errors
        }
      });

      const topChallenges = Object.entries(challengeCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([challenge]) => challenge);

      const successRate = data.filter(item => item.status === 'completed_awaiting_signup').length / totalAssessments;

      return {
        totalAssessments,
        averageScore: Math.round(averageScore),
        topChallenges,
        successRate: Math.round(successRate * 100)
      };
    } catch (error) {
      console.error('Failed to get assessment stats:', error);
      return null;
    }
  }

  /**
   * Delete assessment data (for privacy/GDPR compliance)
   */
  async deleteAssessment(sessionId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isEnabled) {
      return { success: false, error: 'supabase_not_configured' };
    }

    try {
      const { error } = await supabase!
        .from('assessment_sessions')
        .delete()
        .eq('session_id', sessionId);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to delete assessment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate JWT token for assessment claiming
   * Token contains session ID and expires in 24 hours
   */
  async generateAssessmentToken(sessionId: string): Promise<{ success: boolean; token?: string; error?: string }> {
    if (!this.isEnabled) {
      return { success: false, error: 'supabase_not_configured' };
    }

    try {
      // Verify assessment exists
      const { data: assessment, error: fetchError } = await supabase!
        .from('assessment_sessions')
        .select('session_id, user_email, status')
        .eq('session_id', sessionId)
        .single();

      if (fetchError || !assessment) {
        return { success: false, error: 'assessment_not_found' };
      }

      // Check if already claimed
      if (assessment.status === 'linked_to_user') {
        return { success: false, error: 'already_claimed' };
      }

      // Import jwt dynamically (ES modules)
      const jwt = await import('jsonwebtoken');

      // Generate JWT token
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
      const token = jwt.default.sign(
        {
          sessionId: sessionId,
          email: assessment.user_email,
          type: 'assessment_claim',
          iat: Math.floor(Date.now() / 1000)
        },
        jwtSecret,
        { expiresIn: '24h' }
      );

      console.log('✅ Assessment token generated for session:', sessionId);
      return { success: true, token };
    } catch (error) {
      console.error('Failed to generate assessment token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Claim assessment by token and link to authenticated user
   */
  async claimAssessmentByToken(token: string, userId: string): Promise<{ success: boolean; assessment?: any; error?: string }> {
    if (!this.isEnabled) {
      return { success: false, error: 'supabase_not_configured' };
    }

    try {
      // Verify and decode JWT token
      const jwt = await import('jsonwebtoken');
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

      let decoded: any;
      try {
        decoded = jwt.default.verify(token, jwtSecret);
      } catch (error) {
        return { success: false, error: 'invalid_or_expired_token' };
      }

      // Validate token type
      if (decoded.type !== 'assessment_claim') {
        return { success: false, error: 'invalid_token_type' };
      }

      const sessionId = decoded.sessionId;

      // Fetch assessment
      const { data: assessment, error: fetchError } = await supabase!
        .from('assessment_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (fetchError || !assessment) {
        return { success: false, error: 'assessment_not_found' };
      }

      // Check if already claimed
      if (assessment.status === 'linked_to_user' && assessment.user_id) {
        return { success: false, error: 'already_claimed' };
      }

      // Link assessment to user
      const { data: updatedAssessment, error: updateError } = await supabase!
        .from('assessment_sessions')
        .update({
          user_id: userId,
          status: 'linked_to_user',
          updated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      console.log('✅ Assessment claimed and linked to user:', userId);

      // Parse assessment data
      const assessmentData = JSON.parse(updatedAssessment.assessment_data || '{}');

      return {
        success: true,
        assessment: {
          ...updatedAssessment,
          assessmentData
        }
      };
    } catch (error) {
      console.error('Failed to claim assessment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get assessments by user ID
   */
  async getAssessmentsByUserId(userId: string): Promise<any[]> {
    if (!this.isEnabled) {
      return [];
    }

    try {
      const { data, error } = await supabase!
        .from('assessment_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get assessments by user ID:', error);
      return [];
    }
  }
}

// Create singleton instance
export const supabaseAssessmentService = new SupabaseAssessmentService();
