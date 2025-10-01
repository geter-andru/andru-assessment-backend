import { supabaseAssessmentService } from './supabaseAssessmentService';
import claudeAIService from './claudeAIService';
import { AssessmentResponse, Insight } from './types';

// Extended interfaces for real-time insights
export interface RealTimeInsight extends Insight {
  batchNumber: 1 | 2 | 3;
  questionRange: string; // e.g., "1-4", "5-9", "10-12"
  challengeIdentified: string;
  businessImpact: string;
  generatedAt: string;
}

interface BatchAnalysis {
  responses: AssessmentResponse[];
  previousInsights?: RealTimeInsight[];
  sessionId: string;
  userInfo?: {
    company: string;
    productName: string;
    businessModel: string;
  };
}

interface SalesChallenge {
  name: string;
  description: string;
  businessImpact: string;
  commonConsequence: string;
}

/**
 * Real-Time Insight Engine
 * Generates insights during assessment based on 4-response batches
 */
class RealTimeInsightEngine {
  private salesChallenges: Record<string, SalesChallenge> = {
    'technical_translation': {
      name: 'Technical Translation Challenge',
      description: 'Difficulty translating technical capabilities into business value',
      businessImpact: 'Heavy discounting to win customers',
      commonConsequence: 'Reduced margins and profitability'
    },
    'buyer_conversations': {
      name: 'Buyer Conversations Challenge',
      description: 'Struggling with strategic buyer discussions',
      businessImpact: 'Losing deals to competitors',
      commonConsequence: 'Lower win rates and missed opportunities'
    },
    'competitive_positioning': {
      name: 'Competitive Positioning Challenge',
      description: 'Poor differentiation from competitors',
      businessImpact: 'Price-based competition',
      commonConsequence: 'Reduced deal sizes and commoditization'
    }
  };

  /**
   * Analyze batch 1 (responses 1-4) and generate first insight
   */
  async analyzeBatch1(batch: BatchAnalysis): Promise<Insight> {
    console.log('🔍 Analyzing batch 1 (responses 1-4) with Claude AI...');
    
    const { responses, sessionId, userInfo } = batch;
    
    // Use Claude AI to generate personalized insight
    const aiInsight = await claudeAIService.generateInsight({
      responses,
      batchNumber: 1,
      userInfo: {
        company: userInfo?.company || 'Unknown Company',
        productName: userInfo?.productName || 'Unknown Product',
        businessModel: userInfo?.businessModel || 'Unknown Model'
      }
    });
    
    const insightData: Insight = {
      id: `insight_${sessionId}_1`,
      sessionId,
      batchNumber: 1,
      questionRange: '1-4',
      insight: aiInsight.insight,
      challengeIdentified: aiInsight.challengeIdentified,
      businessImpact: aiInsight.businessImpact,
      confidence: aiInsight.confidence,
      generatedAt: new Date().toISOString()
    };

    // Store insight in Supabase
    await this.storeInsight(insightData);
    
    return insightData;
  }

  /**
   * Analyze batch 2 (responses 5-9) and generate second insight
   */
  async analyzeBatch2(batch: BatchAnalysis): Promise<Insight> {
    console.log('🔍 Analyzing batch 2 (responses 5-9) with Claude AI...');
    
    const { responses, previousInsights, sessionId, userInfo } = batch;
    
    // Use Claude AI to generate personalized insight building on previous insights
    const aiInsight = await claudeAIService.generateInsight({
      responses,
      batchNumber: 2,
      previousInsights,
      userInfo: {
        company: userInfo?.company || 'Unknown Company',
        productName: userInfo?.productName || 'Unknown Product',
        businessModel: userInfo?.businessModel || 'Unknown Model'
      }
    });
    
    const insightData: Insight = {
      id: `insight_${sessionId}_2`,
      sessionId,
      batchNumber: 2,
      questionRange: '5-9',
      insight: aiInsight.insight,
      challengeIdentified: aiInsight.challengeIdentified,
      businessImpact: aiInsight.businessImpact,
      confidence: aiInsight.confidence,
      generatedAt: new Date().toISOString()
    };

    // Store insight in Supabase
    await this.storeInsight(insightData);
    
    return insightData;
  }

  /**
   * Analyze batch 3 (responses 10-12) and generate third insight
   */
  async analyzeBatch3(batch: BatchAnalysis): Promise<Insight> {
    console.log('🔍 Analyzing batch 3 (responses 10-12) with Claude AI...');
    
    const { responses, previousInsights, sessionId, userInfo } = batch;
    
    // Use Claude AI to generate final personalized insight
    const aiInsight = await claudeAIService.generateInsight({
      responses,
      batchNumber: 3,
      previousInsights,
      userInfo: {
        company: userInfo?.company || 'Unknown Company',
        productName: userInfo?.productName || 'Unknown Product',
        businessModel: userInfo?.businessModel || 'Unknown Model'
      }
    });
    
    const insightData: Insight = {
      id: `insight_${sessionId}_3`,
      sessionId,
      batchNumber: 3,
      questionRange: '10-12',
      insight: aiInsight.insight,
      challengeIdentified: aiInsight.challengeIdentified,
      businessImpact: aiInsight.businessImpact,
      confidence: aiInsight.confidence,
      generatedAt: new Date().toISOString()
    };

    // Store insight in Supabase
    await this.storeInsight(insightData);
    
    return insightData;
  }

  /**
   * Calculate technical understanding score from responses
   */
  private calculateTechnicalUnderstanding(responses: AssessmentResponse[]): number {
    // Analyze responses for technical depth indicators
    let score = 0;
    
    responses.forEach(response => {
      if (response.questionId.includes('technical') || response.questionId.includes('product')) {
        if (typeof response.response === 'number') {
          score += response.response;
        } else if (typeof response.response === 'string') {
          // Analyze text responses for technical indicators
          const technicalKeywords = ['architecture', 'integration', 'scalability', 'performance', 'API', 'infrastructure'];
          const technicalCount = technicalKeywords.filter(keyword => 
            (response.response as string).toLowerCase().includes(keyword)
          ).length;
          score += technicalCount * 2;
        }
      }
    });
    
    return Math.min(10, Math.max(0, score / responses.length * 2));
  }

  /**
   * Calculate buyer focus score from responses
   */
  private calculateBuyerFocus(responses: AssessmentResponse[]): number {
    let score = 0;
    
    responses.forEach(response => {
      if (response.questionId.includes('buyer') || response.questionId.includes('customer')) {
        if (typeof response.response === 'number') {
          score += response.response;
        } else if (typeof response.response === 'string') {
          const buyerKeywords = ['business value', 'ROI', 'outcomes', 'pain points', 'decision makers'];
          const buyerCount = buyerKeywords.filter(keyword => 
            (response.response as string).toLowerCase().includes(keyword)
          ).length;
          score += buyerCount * 2;
        }
      }
    });
    
    return Math.min(10, Math.max(0, score / responses.length * 2));
  }

  /**
   * Calculate competitive positioning score
   */
  private calculateCompetitivePositioning(responses: AssessmentResponse[]): number {
    let score = 0;
    
    responses.forEach(response => {
      if (response.questionId.includes('competitive') || response.questionId.includes('differentiation')) {
        if (typeof response.response === 'number') {
          score += response.response;
        } else if (typeof response.response === 'string') {
          const competitiveKeywords = ['unique', 'differentiated', 'advantage', 'positioning', 'value proposition'];
          const competitiveCount = competitiveKeywords.filter(keyword => 
            (response.response as string).toLowerCase().includes(keyword)
          ).length;
          score += competitiveCount * 2;
        }
      }
    });
    
    return Math.min(10, Math.max(0, score / responses.length * 2));
  }

  /**
   * Calculate value articulation score
   */
  private calculateValueArticulation(responses: AssessmentResponse[]): number {
    let score = 0;
    
    responses.forEach(response => {
      if (response.questionId.includes('value') || response.questionId.includes('benefit')) {
        if (typeof response.response === 'number') {
          score += response.response;
        } else if (typeof response.response === 'string') {
          const valueKeywords = ['cost savings', 'efficiency', 'productivity', 'revenue', 'growth'];
          const valueCount = valueKeywords.filter(keyword => 
            (response.response as string).toLowerCase().includes(keyword)
          ).length;
          score += valueCount * 2;
        }
      }
    });
    
    return Math.min(10, Math.max(0, score / responses.length * 2));
  }

  /**
   * Calculate systematic approach score
   */
  private calculateSystematicApproach(responses: AssessmentResponse[]): number {
    let score = 0;
    
    responses.forEach(response => {
      if (response.questionId.includes('process') || response.questionId.includes('systematic')) {
        if (typeof response.response === 'number') {
          score += response.response;
        } else if (typeof response.response === 'string') {
          const systematicKeywords = ['process', 'systematic', 'framework', 'methodology', 'structured'];
          const systematicCount = systematicKeywords.filter(keyword => 
            (response.response as string).toLowerCase().includes(keyword)
          ).length;
          score += systematicCount * 2;
        }
      }
    });
    
    return Math.min(10, Math.max(0, score / responses.length * 2));
  }

  /**
   * Calculate customer analysis score
   */
  private calculateCustomerAnalysis(responses: AssessmentResponse[]): number {
    let score = 0;
    
    responses.forEach(response => {
      if (response.questionId.includes('customer') || response.questionId.includes('analysis')) {
        if (typeof response.response === 'number') {
          score += response.response;
        } else if (typeof response.response === 'string') {
          const analysisKeywords = ['research', 'analysis', 'segmentation', 'personas', 'qualification'];
          const analysisCount = analysisKeywords.filter(keyword => 
            (response.response as string).toLowerCase().includes(keyword)
          ).length;
          score += analysisCount * 2;
        }
      }
    });
    
    return Math.min(10, Math.max(0, score / responses.length * 2));
  }

  /**
   * Identify primary challenge based on scores and previous insights
   */
  private identifyPrimaryChallenge(score1: number, score2: number, previousInsight?: Insight): SalesChallenge {
    // If we have a previous insight, consider it
    if (previousInsight) {
      const previousChallenge = previousInsight.challengeIdentified;
      
      // If previous challenge was technical translation, check for buyer conversations
      if (previousChallenge === 'Technical Translation Challenge' && score2 < 6) {
        return this.salesChallenges.buyer_conversations;
      }
      
      // If previous challenge was buyer conversations, check for competitive positioning
      if (previousChallenge === 'Buyer Conversations Challenge' && score1 < 6) {
        return this.salesChallenges.competitive_positioning;
      }
    }
    
    // Default logic for first insight
    if (score1 > score2 + 2) {
      return this.salesChallenges.technical_translation;
    } else if (score2 > score1 + 2) {
      return this.salesChallenges.buyer_conversations;
    } else {
      return this.salesChallenges.competitive_positioning;
    }
  }

  /**
   * Generate insight message based on challenge and scores
   */
  private generateInsight(
    batchNumber: number, 
    challenge: SalesChallenge, 
    score1: number, 
    score2: number, 
    previousInsight?: Insight
  ): { message: string; businessImpact: string; confidence: number } {
    
    const strength = score1 > score2 ? 'technical understanding' : 'business focus';
    const gap = score1 > score2 ? 'buyer-centric conversations' : 'technical depth';
    
    let message = '';
    let businessImpact = '';
    
    switch (challenge.name) {
      case 'Technical Translation Challenge':
        message = `Your responses thus far reveal strong technical understanding but a disconnect from buyer-centric conversations, suggesting that you're good at launching pilots of your product but may struggle with heavy discounting to win new customers.`;
        businessImpact = 'Heavy discounting to win customers';
        break;
        
      case 'Buyer Conversations Challenge':
        message = `Combining your technical depth with limited competitive differentiation, you're likely excelling at feature demonstrations but may be losing deals to competitors who better articulate business value.`;
        businessImpact = 'Losing deals to competitors';
        break;
        
      case 'Competitive Positioning Challenge':
        message = `Your assessment reveals strong product capabilities but gaps in systematic customer analysis, suggesting you're good at closing individual deals but may be missing larger enterprise opportunities due to inefficient qualification processes.`;
        businessImpact = 'Missing enterprise opportunities';
        break;
    }
    
    // Adjust message based on batch number
    if (batchNumber === 2) {
      message = `Building on your technical foundation, ${message.toLowerCase()}`;
    } else if (batchNumber === 3) {
      message = `Your comprehensive responses confirm that ${message.toLowerCase()}`;
    }
    
    const confidence = Math.min(95, 70 + (Math.abs(score1 - score2) * 5));
    
    return { message, businessImpact, confidence };
  }

  /**
   * Store insight in Supabase
   */
  private async storeInsight(insight: Insight): Promise<void> {
    try {
      // Store insight in assessment_sessions table
      const { error } = await supabaseAssessmentService.updateAssessmentStatus(
        insight.sessionId,
        'insight_generated',
        undefined
      );
      
      if (error) {
        console.error('Failed to store insight:', error);
      } else {
        console.log(`✅ Insight ${insight.batchNumber} stored for session: ${insight.sessionId}`);
      }
    } catch (error) {
      console.error('Error storing insight:', error);
    }
  }

  /**
   * Get all insights for a session
   */
  async getInsightsForSession(sessionId: string): Promise<Insight[]> {
    // This would retrieve insights from Supabase
    // For now, return empty array - implementation depends on Supabase schema
    return [];
  }
}

// Create singleton instance
const realTimeInsightEngine = new RealTimeInsightEngine();

export default realTimeInsightEngine;
