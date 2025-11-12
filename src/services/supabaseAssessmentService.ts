// Supabase service for assessment app integration
import { createClient } from '@supabase/supabase-js';

// Supabase configuration - use environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Create Supabase client if credentials are available
let supabase = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn('Supabase credentials not found. Assessment will work in standalone mode.');
}

export class SupabaseAssessmentService {
  isEnabled: boolean;

  constructor() {
    this.isEnabled = !!supabase;
  }

  // Store completed assessment for linking after user signup
  async storeCompletedAssessment(assessmentData, userInfo) {
    if (!this.isEnabled) {
      console.log('Supabase not configured, assessment stored locally only');
      return { success: false, reason: 'supabase_not_configured' };
    }

    try {
      const assessmentRecord = {
        session_id: assessmentData.sessionId || this.generateSessionId(),
        assessment_data: JSON.stringify(assessmentData),
        user_email: userInfo.email,
        company_name: userInfo.company,
        overall_score: assessmentData.results?.overallScore || 0,
        buyer_score: assessmentData.results?.buyerScore || 0,
        status: 'completed_awaiting_signup',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
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
        error: error.message 
      };
    }
  }

  // Update assessment status (e.g., when user signs up)
  async updateAssessmentStatus(sessionId, status, userId = null) {
    if (!this.isEnabled) {
      return { success: false, reason: 'supabase_not_configured' };
    }

    try {
      const updates: { status: any; updated_at: string; user_id?: string } = {
        status: status,
        updated_at: new Date().toISOString()
      };

      if (userId) {
        updates.user_id = userId;
      }

      const { data, error } = await supabase
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
      return { success: false, error: error.message };
    }
  }

  // Generate platform redirect URL with assessment data
  generatePlatformRedirectUrl(userInfo, assessmentData) {
    const platformBaseUrl = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000';
    const params = new URLSearchParams({
      email: userInfo.email,
      company: userInfo.company,
      score: assessmentData.results?.overallScore || '0',
      challenges: assessmentData.results?.buyerScore || '0',
      sessionId: assessmentData.sessionId
    });

    // Direct to signup with assessment context
    return `${platformBaseUrl}/signup?${params.toString()}`;
  }

  // Generate unique session ID
  generateSessionId() {
    return `asmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Check if Supabase is configured
  isConfigured() {
    return this.isEnabled;
  }

  // Get redirect message for users
  getRedirectMessage() {
    return this.isEnabled 
      ? "Your assessment has been saved! Sign up to access your personalized Revenue Intelligence dashboard."
      : "Complete your setup in the Revenue Intelligence Platform to see your personalized results.";
  }

  // Enhanced redirect with assessment data storage
  async completeAssessmentAndRedirect(assessmentData, userInfo) {
    // Store in Supabase if available
    const storeResult = await this.storeCompletedAssessment(assessmentData, userInfo);
    
    // Generate redirect URL
    const redirectUrl = this.generatePlatformRedirectUrl(userInfo, assessmentData);
    
    // Store in sessionStorage as backup
    try {
      sessionStorage.setItem('assessmentResults', JSON.stringify({
        results: assessmentData,
        userInfo: userInfo,
        timestamp: Date.now(),
        supabaseStored: storeResult.success
      }));
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

  // Test connection to Supabase
  async testConnection() {
    if (!this.isEnabled) {
      return { connected: false, reason: 'not_configured' };
    }

    try {
      // Try to access a table (this will fail gracefully if not set up)
      const { data, error } = await supabase
        .from('assessment_sessions')
        .select('count(*)', { count: 'exact', head: true })
        .limit(1);

      if (error && error.code !== 'PGRST116') { // PGRST116 is "table not found" which is acceptable
        throw error;
      }

      return { connected: true };
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      return { connected: false, error: error.message };
    }
  }

  /**
   * Generate a JWT token for claiming an assessment
   * @param {string} sessionId - Assessment session ID
   * @returns {Promise<{success: boolean, token?: string, error?: string}>}
   */
  async generateAssessmentToken(sessionId) {
    if (!this.isEnabled) {
      return { success: false, error: 'supabase_not_configured' };
    }

    try {
      // Verify assessment exists
      const { data: assessment, error: fetchError } = await supabase
        .from('assessment_sessions')
        .select('session_id, user_email, status')
        .eq('session_id', sessionId)
        .single();

      if (fetchError || !assessment) {
        return { success: false, error: 'assessment_not_found' };
      }

      // Check if already claimed
      if (assessment.status === 'linked') {
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
      if (assessment.status === 'linked' && assessment.user_id) {
        return { success: false, error: 'already_claimed' };
      }

      // Link assessment to user
      const { data: updatedAssessment, error: updateError } = await supabase!
        .from('assessment_sessions')
        .update({
          user_id: userId,
          status: 'linked',
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
}

export const supabaseAssessmentService = new SupabaseAssessmentService();