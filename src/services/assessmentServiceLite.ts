import realTimeInsightEngine from './realTimeInsightEngine';
import skillAssessmentEngine from './skillAssessmentEngine';
import { supabaseAssessmentService } from './supabaseAssessmentService';
import { airtableService } from './airtableService';

// TypeScript Interfaces for AssessmentServiceLite
export interface AssessmentResponse {
  questionId: string;
  questionText: string;
  response: string | number;
  responseType: 'multiple_choice' | 'scale' | 'text';
  timestamp: number;
}

export interface AssessmentSession {
  sessionId: string;
  userId?: string;
  userInfo: {
    email: string;
    company: string;
    productName: string;
    productDescription: string;
    businessModel: string;
  };
  responses: AssessmentResponse[];
  insights: Array<{
    id: string;
    sessionId: string;
    batchNumber: 1 | 2 | 3;
    questionRange: string;
    insight: string;
    challengeIdentified: string;
    businessImpact: string;
    confidence: number;
    generatedAt: string;
  }>;
  status: 'in_progress' | 'completed' | 'insight_generated' | 'results_generated';
  startedAt: string;
  completedAt?: string;
}

export interface AssessmentResults {
  sessionId: string;
  overallScore: number;
  performanceLevel: string;
  skillLevels: {
    customerAnalysis: number;
    businessCommunication: number;
    revenueStrategy: number;
    valueArticulation: number;
    strategicThinking: number;
  };
  challenges: Array<{
    name: string;
    description: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    impact: number;
    businessConsequence: string;
  }>;
  recommendations: Array<{
    category: string;
    title: string;
    description: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    expectedOutcome: string;
    timeframe: string;
    tools: string[];
  }>;
  focusArea: string;
  revenueOpportunity: number;
  roiMultiplier: number;
  nextSteps: string[];
  confidence: number;
  generatedAt: string;
}

export interface ModernPlatformSyncData {
  sessionId: string;
  userId: string;
  assessmentResults: AssessmentResults;
  userInfo: {
    email: string;
    company: string;
    productName: string;
    productDescription: string;
    businessModel: string;
  };
  syncTimestamp: string;
}

/**
 * AssessmentServiceLite - Core Assessment Functionality
 * 
 * Handles assessment flow, real-time insights, and basic results generation.
 * Communicates with modern-platform for professional development features.
 */
class AssessmentServiceLite {
  private activeSessions: Map<string, AssessmentSession> = new Map();

  /**
   * Start a new assessment session
   */
  async startAssessment(userInfo: {
    email: string;
    company: string;
    productName: string;
    productDescription: string;
    businessModel: string;
  }): Promise<{ sessionId: string; success: boolean; error?: string }> {
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const session: AssessmentSession = {
        sessionId,
        userInfo,
        responses: [],
        insights: [],
        status: 'in_progress',
        startedAt: new Date().toISOString()
      };

      // Store session locally
      this.activeSessions.set(sessionId, session);

      // Store session in Supabase
      await supabaseAssessmentService.createAssessmentSession(sessionId, userInfo);

      console.log(`✅ Assessment session started: ${sessionId}`);
      
      return { sessionId, success: true };
    } catch (error) {
      console.error('❌ Failed to start assessment session:', error);
      return { 
        sessionId: '', 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Add response to assessment session
   */
  async addResponse(sessionId: string, response: AssessmentResponse): Promise<{ success: boolean; error?: string }> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      // Add response to session
      session.responses.push(response);

      // Store response in Supabase
      await supabaseAssessmentService.storeAssessmentResponse(sessionId, response);

      // Check if we should generate insights
      await this.checkForInsightGeneration(session);

      console.log(`✅ Response added to session ${sessionId}: ${response.questionId}`);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to add response:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Check if we should generate insights based on response count
   */
  private async checkForInsightGeneration(session: AssessmentSession): Promise<void> {
    const responseCount = session.responses.length;
    
    // Generate insights at specific response milestones
    if (responseCount === 4 && !session.insights.some(i => i.batchNumber === 1)) {
      await this.generateInsight(session, 1, '1-4');
    } else if (responseCount === 9 && !session.insights.some(i => i.batchNumber === 2)) {
      await this.generateInsight(session, 2, '5-9');
    } else if (responseCount === 12 && !session.insights.some(i => i.batchNumber === 3)) {
      await this.generateInsight(session, 3, '10-12');
    }
  }

  /**
   * Generate insight for a specific batch
   */
  private async generateInsight(session: AssessmentSession, batchNumber: 1 | 2 | 3, questionRange: string): Promise<void> {
    try {
      console.log(`🔍 Generating insight for batch ${batchNumber} (${questionRange})`);
      
      // Get responses for this batch
      const startIndex = batchNumber === 1 ? 0 : batchNumber === 2 ? 4 : 9;
      const endIndex = batchNumber === 1 ? 4 : batchNumber === 2 ? 9 : 12;
      const batchResponses = session.responses.slice(startIndex, endIndex);

      // Generate insight using RealTimeInsightEngine
      let insight;
      if (batchNumber === 1) {
        insight = await realTimeInsightEngine.analyzeBatch1({
          responses: batchResponses,
          sessionId: session.sessionId,
          userInfo: session.userInfo
        });
      } else if (batchNumber === 2) {
        insight = await realTimeInsightEngine.analyzeBatch2({
          responses: batchResponses,
          previousInsights: session.insights,
          sessionId: session.sessionId,
          userInfo: session.userInfo
        });
      } else {
        insight = await realTimeInsightEngine.analyzeBatch3({
          responses: batchResponses,
          previousInsights: session.insights,
          sessionId: session.sessionId,
          userInfo: session.userInfo
        });
      }

      // Add insight to session
      session.insights.push(insight);
      session.status = 'insight_generated';

      // Update session in Supabase
      await supabaseAssessmentService.updateAssessmentStatus(session.sessionId, 'insight_generated', session.insights);

      console.log(`✅ Insight generated for batch ${batchNumber}: ${insight.challengeIdentified}`);
    } catch (error) {
      console.error(`❌ Failed to generate insight for batch ${batchNumber}:`, error);
    }
  }

  /**
   * Complete assessment and generate final results
   */
  async completeAssessment(sessionId: string): Promise<{ success: boolean; results?: AssessmentResults; error?: string }> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      if (session.responses.length < 12) {
        return { success: false, error: 'Assessment not complete - need 12 responses' };
      }

      console.log('🎯 Generating final assessment results...');

      // Generate final results using SkillAssessmentEngine
      const results = await skillAssessmentEngine.generateFinalResults({
        sessionId: session.sessionId,
        responses: session.responses,
        insights: session.insights,
        userInfo: session.userInfo
      });

      // Update session status
      session.status = 'completed';
      session.completedAt = new Date().toISOString();

      // Store completed assessment
      await supabaseAssessmentService.updateAssessmentStatus(session.sessionId, 'completed', session.insights);

      console.log(`✅ Assessment completed: ${sessionId} - Score: ${results.overallScore}`);

      return { success: true, results };
    } catch (error) {
      console.error('❌ Failed to complete assessment:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get assessment session data
   */
  getSession(sessionId: string): AssessmentSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get all insights for a session
   */
  getSessionInsights(sessionId: string): Array<{
    id: string;
    sessionId: string;
    batchNumber: 1 | 2 | 3;
    questionRange: string;
    insight: string;
    challengeIdentified: string;
    businessImpact: string;
    confidence: number;
    generatedAt: string;
  }> {
    const session = this.activeSessions.get(sessionId);
    return session ? session.insights : [];
  }

  /**
   * Sync assessment results to modern-platform
   */
  async syncToModernPlatform(sessionId: string, userId: string): Promise<{ success: boolean; redirectUrl?: string; error?: string }> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      if (session.status !== 'completed') {
        return { success: false, error: 'Assessment not completed' };
      }

      // Get final results
      const results = await skillAssessmentEngine.generateFinalResults({
        sessionId: session.sessionId,
        responses: session.responses,
        insights: session.insights,
        userInfo: session.userInfo
      });

      // Prepare sync data
      const syncData: ModernPlatformSyncData = {
        sessionId: session.sessionId,
        userId,
        assessmentResults: results,
        userInfo: session.userInfo,
        syncTimestamp: new Date().toISOString()
      };

      // Sync to modern-platform via API
      await this.sendToModernPlatform(syncData);

      // Generate redirect URL to platform
      const redirectUrl = `https://platform.andruai.com/assessment?sessionId=${sessionId}&userId=${userId}&synced=true&source=andru-assessment`;

      console.log(`✅ Assessment results synced to modern-platform for user: ${userId}`);
      
      return { success: true, redirectUrl };
    } catch (error) {
      console.error('❌ Failed to sync to modern-platform:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Send data to modern-platform via API
   */
  private async sendToModernPlatform(syncData: ModernPlatformSyncData): Promise<void> {
    try {
      const modernPlatformUrl = process.env.MODERN_PLATFORM_API_URL || 'http://localhost:3000';
      
      const response = await fetch(`${modernPlatformUrl}/api/assessment/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MODERN_PLATFORM_API_KEY || ''}`,
          'User-Agent': 'AndruAssessment/1.0'
        },
        body: JSON.stringify(syncData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Modern platform API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(`Modern platform sync failed: ${result.message || 'Unknown error'}`);
      }

      console.log('✅ Data successfully sent to modern-platform:', result.message);
    } catch (error) {
      console.error('❌ Failed to send data to modern-platform:', error);
      // In a real implementation, you might want to queue this for retry
      throw error;
    }
  }

  /**
   * Get assessment progress for a session
   */
  getAssessmentProgress(sessionId: string): {
    totalQuestions: number;
    answeredQuestions: number;
    progressPercentage: number;
    currentBatch: number;
    insightsGenerated: number;
  } {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return {
        totalQuestions: 12,
        answeredQuestions: 0,
        progressPercentage: 0,
        currentBatch: 1,
        insightsGenerated: 0
      };
    }

    const answeredQuestions = session.responses.length;
    const progressPercentage = Math.round((answeredQuestions / 12) * 100);
    const currentBatch = Math.min(3, Math.ceil(answeredQuestions / 4));
    const insightsGenerated = session.insights.length;

    return {
      totalQuestions: 12,
      answeredQuestions,
      progressPercentage,
      currentBatch,
      insightsGenerated
    };
  }

  /**
   * Get user progress from modern-platform
   */
  async getUserProgressFromModernPlatform(userId: string): Promise<{
    success: boolean;
    data?: {
      userId: string;
      baselineScores: {
        customerAnalysis: number;
        valueCommunication: number;
        salesExecution: number;
      };
      currentScores: {
        customerAnalysis: number;
        valueCommunication: number;
        salesExecution: number;
      };
      totalPoints: number;
      levelProgress: {
        current: {
          id: string;
          name: string;
          description: string;
          requiredPoints: number;
          maxPoints: number | null;
          color: string;
          benefits: string[];
          toolUnlocks: string[];
        };
        next: {
          id: string;
          name: string;
          description: string;
          requiredPoints: number;
          maxPoints: number | null;
          color: string;
          benefits: string[];
          toolUnlocks: string[];
        } | null;
        progress: number;
        pointsToNext: number;
        pointsInLevel: number;
        pointsNeededForLevel: number;
      };
      toolAccess: {
        icpAnalysis: boolean;
        costCalculator: boolean;
        businessCaseBuilder: boolean;
        advancedAnalytics: boolean;
        customFrameworks: boolean;
      };
      lastUpdated: string;
      assessmentHistory: Array<{
        sessionId: string;
        completedAt: string;
        overallScore: number;
        performanceLevel: string;
      }>;
    };
    error?: string;
  }> {
    try {
      const modernPlatformUrl = process.env.MODERN_PLATFORM_API_URL || 'http://localhost:3000';
      
      const response = await fetch(`${modernPlatformUrl}/api/assessment/progress/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MODERN_PLATFORM_API_KEY || ''}`,
          'User-Agent': 'AndruAssessment/1.0'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Modern platform API error: ${response.status} ${response.statusText} - ${errorText}`
        };
      }

      const result = await response.json();
      if (!result.success) {
        return {
          success: false,
          error: result.message || 'Failed to retrieve user progress'
        };
      }

      console.log(`✅ User progress retrieved from modern-platform for user: ${userId}`);
      
      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error('❌ Failed to get user progress from modern-platform:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Sync assessment data to modern-platform via data bridge
   */
  async syncToModernPlatform(sessionId: string, userId: string): Promise<{ success: boolean; redirectUrl?: string; error?: string }> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      if (session.status !== 'completed') {
        return { success: false, error: 'Assessment not completed' };
      }

      // Get final results
      const results = await skillAssessmentEngine.generateFinalResults({
        sessionId: session.sessionId,
        responses: session.responses,
        insights: session.insights,
        userInfo: session.userInfo
      });

      // Prepare assessment data for bridge sync
      const assessmentData = {
        sessionId: session.sessionId,
        responses: session.responses,
        results: {
          overallScore: results.overallScore,
          buyerScore: results.skillLevels.customerAnalysis,
          techScore: results.skillLevels.revenueStrategy,
          qualification: results.performanceLevel
        },
        timestamp: new Date().toISOString(),
        userInfo: session.userInfo,
        insights: session.insights
      };

      // Sync to modern-platform via data bridge
      const bridgeResponse = await fetch('https://platform.andruai.com/api/bridge/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_both',
          assessmentData,
          userInfo: session.userInfo
        })
      });

      if (!bridgeResponse.ok) {
        throw new Error(`Bridge sync failed: ${bridgeResponse.statusText}`);
      }

      const bridgeResult = await bridgeResponse.json();
      
      if (!bridgeResult.success) {
        throw new Error(`Bridge sync failed: ${bridgeResult.error}`);
      }

      // Generate redirect URL to platform
      const redirectUrl = `https://platform.andruai.com/assessment?sessionId=${sessionId}&userId=${userId}&synced=true&source=andru-assessment&bridgeId=${bridgeResult.data.supabaseRecordId}`;

      console.log(`✅ Assessment results synced to modern-platform via data bridge for user: ${userId}`);
      
      return { success: true, redirectUrl };
    } catch (error) {
      console.error('❌ Failed to sync to modern-platform via data bridge:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Clean up completed sessions (optional maintenance)
   */
  cleanupCompletedSessions(): void {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.status === 'completed' && session.completedAt) {
        const completedAt = new Date(session.completedAt);
        if (completedAt < oneHourAgo) {
          this.activeSessions.delete(sessionId);
          console.log(`🧹 Cleaned up completed session: ${sessionId}`);
        }
      }
    }
  }
}

// Create singleton instance
const assessmentServiceLite = new AssessmentServiceLite();

export default assessmentServiceLite;
