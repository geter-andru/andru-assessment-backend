import { supabaseAssessmentService } from './supabaseAssessmentService';
import realTimeInsightEngine from './realTimeInsightEngine';
import claudeAIService from './claudeAIService';
import { AssessmentResponse, Insight } from './types';

interface AssessmentData {
  sessionId: string;
  responses: AssessmentResponse[];
  insights: Insight[];
  userInfo: {
    email: string;
    company: string;
    productName: string;
    productDescription: string;
    businessModel: string;
  };
}

interface SkillLevels {
  customerAnalysis: number;
  businessCommunication: number;
  revenueStrategy: number;
  valueArticulation: number;
  strategicThinking: number;
}

interface CompetencyLevel {
  level: 'Foundation' | 'Developing' | 'Competent' | 'Proficient' | 'Advanced' | 'Strategic';
  score: number;
  description: string;
}

interface Challenge {
  name: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  impact: number; // 1-10 scale
  businessConsequence: string;
}

interface Recommendation {
  category: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  expectedOutcome: string;
  timeframe: string;
  tools: string[];
}

interface AssessmentResults {
  overallScore: number;
  performanceLevel: CompetencyLevel;
  skillLevels: SkillLevels;
  challenges: Challenge[];
  recommendations: Recommendation[];
  focusArea: string;
  revenueOpportunity: number;
  roiMultiplier: number;
  isHighPriority: boolean;
  leadPriority: 'high' | 'medium' | 'low';
  impactTimeline: 'short_term' | 'medium_term' | 'long_term';
  nextSteps: string[];
  confidence: number;
}

/**
 * Skill Assessment Engine
 * Generates final personalized results using user responses + real-time insights
 */
class SkillAssessmentEngine {
  private skillWeights = {
    customerAnalysis: 0.25,
    businessCommunication: 0.20,
    revenueStrategy: 0.20,
    valueArticulation: 0.20,
    strategicThinking: 0.15
  };

  /**
   * Generate final assessment results using responses + insights
   */
  async generateFinalResults(assessmentData: AssessmentData): Promise<AssessmentResults> {
    console.log('🎯 Generating final assessment results with Claude AI...');
    
    const { responses, insights, userInfo, sessionId } = assessmentData;
    
    // Use Claude AI to generate comprehensive assessment results
    const aiAssessment = await claudeAIService.generateFinalAssessment({
      responses,
      insights,
      userInfo: {
        company: userInfo.company,
        productName: userInfo.productName,
        businessModel: userInfo.businessModel,
        productDescription: userInfo.productDescription
      }
    });
    
    // Transform AI results to our interface
    const competencyLevel: CompetencyLevel = {
      level: aiAssessment.performanceLevel as any,
      score: aiAssessment.overallScore,
      description: `${aiAssessment.performanceLevel} level with ${aiAssessment.overallScore}% competency score`
    };
    
    const skillLevels: SkillLevels = {
      customerAnalysis: aiAssessment.skillLevels.customerAnalysis,
      businessCommunication: aiAssessment.skillLevels.businessCommunication,
      revenueStrategy: aiAssessment.skillLevels.revenueStrategy,
      valueArticulation: aiAssessment.skillLevels.valueArticulation,
      strategicThinking: aiAssessment.skillLevels.strategicThinking
    };
    
    const results: AssessmentResults = {
      overallScore: aiAssessment.overallScore,
      performanceLevel: competencyLevel,
      skillLevels,
      challenges: aiAssessment.challenges,
      recommendations: aiAssessment.recommendations,
      focusArea: aiAssessment.focusArea,
      revenueOpportunity: aiAssessment.revenueOpportunity,
      roiMultiplier: aiAssessment.roiMultiplier,
      isHighPriority: aiAssessment.overallScore < 60,
      leadPriority: this.determineLeadPriority(competencyLevel, aiAssessment.challenges),
      impactTimeline: this.determineImpactTimeline(competencyLevel),
      nextSteps: aiAssessment.nextSteps,
      confidence: aiAssessment.confidence
    };

    // Store results in Supabase
    await this.storeResults(sessionId, results, userInfo);
    
    return results;
  }

  /**
   * Assess all skills from responses
   */
  private assessAllSkills(responses: AssessmentResponse[]): SkillLevels {
    return {
      customerAnalysis: this.assessCustomerAnalysisSkill(responses),
      businessCommunication: this.assessBusinessCommunicationSkill(responses),
      revenueStrategy: this.assessRevenueStrategySkill(responses),
      valueArticulation: this.assessValueArticulationSkill(responses),
      strategicThinking: this.assessStrategicThinkingSkill(responses)
    };
  }

  /**
   * Assess customer analysis skill
   */
  private assessCustomerAnalysisSkill(responses: AssessmentResponse[]): number {
    let score = 0;
    let count = 0;
    
    responses.forEach(response => {
      if (response.questionId.includes('customer') || response.questionId.includes('analysis')) {
        if (typeof response.response === 'number') {
          score += response.response;
          count++;
        } else if (typeof response.response === 'string') {
          const analysisKeywords = ['research', 'segmentation', 'personas', 'qualification', 'targeting'];
          const keywordCount = analysisKeywords.filter(keyword => 
            (response.response as string).toLowerCase().includes(keyword)
          ).length;
          score += keywordCount * 2;
          count++;
        }
      }
    });
    
    return count > 0 ? Math.min(10, score / count) : 5;
  }

  /**
   * Assess business communication skill
   */
  private assessBusinessCommunicationSkill(responses: AssessmentResponse[]): number {
    let score = 0;
    let count = 0;
    
    responses.forEach(response => {
      if (response.questionId.includes('communication') || response.questionId.includes('presentation')) {
        if (typeof response.response === 'number') {
          score += response.response;
          count++;
        } else if (typeof response.response === 'string') {
          const communicationKeywords = ['executive', 'business case', 'ROI', 'value proposition', 'stakeholder'];
          const keywordCount = communicationKeywords.filter(keyword => 
            (response.response as string).toLowerCase().includes(keyword)
          ).length;
          score += keywordCount * 2;
          count++;
        }
      }
    });
    
    return count > 0 ? Math.min(10, score / count) : 5;
  }

  /**
   * Assess revenue strategy skill
   */
  private assessRevenueStrategySkill(responses: AssessmentResponse[]): number {
    let score = 0;
    let count = 0;
    
    responses.forEach(response => {
      if (response.questionId.includes('revenue') || response.questionId.includes('strategy')) {
        if (typeof response.response === 'number') {
          score += response.response;
          count++;
        } else if (typeof response.response === 'string') {
          const strategyKeywords = ['pricing', 'positioning', 'market', 'growth', 'scaling'];
          const keywordCount = strategyKeywords.filter(keyword => 
            (response.response as string).toLowerCase().includes(keyword)
          ).length;
          score += keywordCount * 2;
          count++;
        }
      }
    });
    
    return count > 0 ? Math.min(10, score / count) : 5;
  }

  /**
   * Assess value articulation skill
   */
  private assessValueArticulationSkill(responses: AssessmentResponse[]): number {
    let score = 0;
    let count = 0;
    
    responses.forEach(response => {
      if (response.questionId.includes('value') || response.questionId.includes('benefit')) {
        if (typeof response.response === 'number') {
          score += response.response;
          count++;
        } else if (typeof response.response === 'string') {
          const valueKeywords = ['cost savings', 'efficiency', 'productivity', 'ROI', 'outcomes'];
          const keywordCount = valueKeywords.filter(keyword => 
            (response.response as string).toLowerCase().includes(keyword)
          ).length;
          score += keywordCount * 2;
          count++;
        }
      }
    });
    
    return count > 0 ? Math.min(10, score / count) : 5;
  }

  /**
   * Assess strategic thinking skill
   */
  private assessStrategicThinkingSkill(responses: AssessmentResponse[]): number {
    let score = 0;
    let count = 0;
    
    responses.forEach(response => {
      if (response.questionId.includes('strategic') || response.questionId.includes('planning')) {
        if (typeof response.response === 'number') {
          score += response.response;
          count++;
        } else if (typeof response.response === 'string') {
          const strategicKeywords = ['long-term', 'vision', 'roadmap', 'objectives', 'goals'];
          const keywordCount = strategicKeywords.filter(keyword => 
            (response.response as string).toLowerCase().includes(keyword)
          ).length;
          score += keywordCount * 2;
          count++;
        }
      }
    });
    
    return count > 0 ? Math.min(10, score / count) : 5;
  }

  /**
   * Determine competency level from skill levels
   */
  private determineCompetencyLevel(skillLevels: SkillLevels): CompetencyLevel {
    const weightedScore = 
      skillLevels.customerAnalysis * this.skillWeights.customerAnalysis +
      skillLevels.businessCommunication * this.skillWeights.businessCommunication +
      skillLevels.revenueStrategy * this.skillWeights.revenueStrategy +
      skillLevels.valueArticulation * this.skillWeights.valueArticulation +
      skillLevels.strategicThinking * this.skillWeights.strategicThinking;

    const score = Math.round(weightedScore * 10); // Convert to 0-100 scale

    if (score >= 90) {
      return { level: 'Strategic', score, description: 'Exceptional strategic thinking and execution' };
    } else if (score >= 80) {
      return { level: 'Advanced', score, description: 'Advanced skills with strong strategic focus' };
    } else if (score >= 70) {
      return { level: 'Proficient', score, description: 'Proficient across all key areas' };
    } else if (score >= 60) {
      return { level: 'Competent', score, description: 'Competent with room for growth' };
    } else if (score >= 40) {
      return { level: 'Developing', score, description: 'Developing skills with clear growth path' };
    } else {
      return { level: 'Foundation', score, description: 'Foundation level with significant growth opportunity' };
    }
  }

  /**
   * Identify challenges from insights and responses
   */
  private identifyChallengesFromInsights(insights: Insight[], responses: AssessmentResponse[]): Challenge[] {
    const challenges: Challenge[] = [];
    
    // Extract challenges from insights
    insights.forEach(insight => {
      const challengeName = insight.challengeIdentified;
      const businessImpact = insight.businessImpact;
      
      // Determine priority based on confidence and impact
      let priority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
      if (insight.confidence > 85) priority = 'critical';
      else if (insight.confidence > 70) priority = 'high';
      else if (insight.confidence < 50) priority = 'low';
      
      challenges.push({
        name: challengeName || 'Unknown Challenge',
        description: insight.insight,
        priority,
        impact: Math.round(insight.confidence / 10),
        businessConsequence: businessImpact || 'Unknown Impact'
      });
    });
    
    // Remove duplicates and sort by priority
    const uniqueChallenges = challenges.filter((challenge, index, self) => 
      index === self.findIndex(c => c.name === challenge.name)
    );
    
    return uniqueChallenges.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate recommendations based on skills, competency, and challenges
   */
  private generateRecommendations(
    skillLevels: SkillLevels, 
    competencyLevel: CompetencyLevel, 
    challenges: Challenge[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Generate recommendations for each challenge
    challenges.forEach(challenge => {
      switch (challenge.name) {
        case 'Technical Translation Challenge':
          recommendations.push({
            category: 'Technical Translation',
            title: 'Develop Buyer-Specific Messaging',
            description: 'Create frameworks to translate technical features into business value propositions',
            priority: challenge.priority,
            expectedOutcome: '40% higher close rates through value-focused presentations',
            timeframe: '3-6 months',
            tools: ['Technical Translation Framework', 'Value Proposition Builder', 'ROI Calculator']
          });
          break;
          
        case 'Buyer Conversations Challenge':
          recommendations.push({
            category: 'Buyer Conversations',
            title: 'Implement Systematic Customer Analysis',
            description: 'Develop structured approaches to understand and engage with different buyer personas',
            priority: challenge.priority,
            expectedOutcome: '35% higher win rates through targeted prospect qualification',
            timeframe: '2-4 months',
            tools: ['ICP Analysis Tool', 'Buyer Persona Framework', 'Customer Journey Mapping']
          });
          break;
          
        case 'Competitive Positioning Challenge':
          recommendations.push({
            category: 'Competitive Positioning',
            title: 'Create Differentiated Value Messaging',
            description: 'Develop unique positioning strategies that highlight competitive advantages',
            priority: challenge.priority,
            expectedOutcome: '3x larger deal sizes through strategic positioning',
            timeframe: '4-8 months',
            tools: ['Competitive Analysis Framework', 'Value Differentiation Tool', 'Positioning Strategy Builder']
          });
          break;
      }
    });
    
    return recommendations;
  }

  /**
   * Calculate revenue opportunity
   */
  private calculateRevenueOpportunity(
    competencyLevel: CompetencyLevel, 
    challenges: Challenge[], 
    userInfo: any
  ): number {
    const baseOpportunity = 500000; // Base $500K opportunity
    const competencyMultiplier = competencyLevel.score / 100;
    const challengeMultiplier = Math.max(0.5, 1 - (challenges.length * 0.1));
    
    return Math.round(baseOpportunity * competencyMultiplier * challengeMultiplier);
  }

  /**
   * Calculate ROI multiplier
   */
  private calculateROIMultiplier(competencyLevel: CompetencyLevel): number {
    return Math.max(2.0, 5.0 - (competencyLevel.score / 100) * 3);
  }

  /**
   * Determine focus area
   */
  private determineFocusArea(challenges: Challenge[], skillLevels: SkillLevels): string {
    if (challenges.length === 0) return 'customer_analysis';
    
    const primaryChallenge = challenges[0];
    switch (primaryChallenge.name) {
      case 'Technical Translation Challenge':
        return 'technical_translation';
      case 'Buyer Conversations Challenge':
        return 'customer_analysis';
      case 'Competitive Positioning Challenge':
        return 'competitive_positioning';
      default:
        return 'customer_analysis';
    }
  }

  /**
   * Determine lead priority
   */
  private determineLeadPriority(competencyLevel: CompetencyLevel, challenges: Challenge[]): 'high' | 'medium' | 'low' {
    if (competencyLevel.score < 40 || challenges.some(c => c.priority === 'critical')) {
      return 'high';
    } else if (competencyLevel.score < 60 || challenges.some(c => c.priority === 'high')) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Determine impact timeline
   */
  private determineImpactTimeline(competencyLevel: CompetencyLevel): 'short_term' | 'medium_term' | 'long_term' {
    if (competencyLevel.score < 40) {
      return 'long_term';
    } else if (competencyLevel.score < 70) {
      return 'medium_term';
    } else {
      return 'short_term';
    }
  }

  /**
   * Generate next steps
   */
  private generateNextSteps(recommendations: Recommendation[], challenges: Challenge[]): string[] {
    const nextSteps: string[] = [];
    
    // Add immediate next steps
    nextSteps.push('Review detailed assessment results in your personalized dashboard');
    nextSteps.push('Access your 3 revenue intelligence tools (ICP Analysis, Cost Calculator, Business Case Builder)');
    
    // Add challenge-specific next steps
    challenges.slice(0, 2).forEach(challenge => {
      nextSteps.push(`Address ${challenge.name.toLowerCase()} through systematic improvement`);
    });
    
    // Add recommendation-specific next steps
    recommendations.slice(0, 2).forEach(rec => {
      nextSteps.push(`Implement ${rec.title} to achieve ${rec.expectedOutcome}`);
    });
    
    nextSteps.push('Schedule a strategy session with our revenue experts');
    
    return nextSteps;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(insights: Insight[], responses: AssessmentResponse[]): number {
    const insightConfidence = insights.reduce((sum, insight) => sum + insight.confidence, 0) / insights.length;
    const responseConfidence = Math.min(90, 70 + (responses.length * 2));
    
    return Math.round((insightConfidence + responseConfidence) / 2);
  }

  /**
   * Store results in Supabase
   */
  private async storeResults(sessionId: string, results: AssessmentResults, userInfo: any): Promise<void> {
    try {
      // Transform results to match supabaseAssessmentService interface
      const transformedResults = {
        overallScore: results.overallScore,
        performanceLevel: results.performanceLevel.level,
        buyerScore: results.skillLevels.businessCommunication * 10, // Convert to 0-100 scale
        techScore: results.skillLevels.valueArticulation * 10, // Convert to 0-100 scale
        challenges: results.challenges.map(c => c.name),
        primaryRecommendation: results.recommendations[0]?.title || 'Focus on systematic improvement',
        focusArea: results.focusArea,
        revenueOpportunity: results.revenueOpportunity,
        roiMultiplier: results.roiMultiplier,
        isHighPriority: results.isHighPriority,
        leadPriority: results.leadPriority,
        impactTimeline: results.impactTimeline
      };

      const assessmentData = {
        sessionId,
        results: transformedResults,
        userInfo: {
          email: userInfo.email,
          company: userInfo.company,
          productName: userInfo.productName,
          productDescription: userInfo.productDescription,
          businessModel: userInfo.businessModel,
          distinguishingFeature: userInfo.distinguishingFeature || '',
          competitivePositioning: userInfo.competitivePositioning || ''
        },
        duration: 0, // This would be calculated from timestamps
        completionContext: {
          insightsUsed: true,
          realTimeAnalysis: true,
          confidence: results.confidence
        }
      };
      
      await supabaseAssessmentService.storeCompletedAssessment(assessmentData, userInfo);
      console.log('✅ Final assessment results stored in Supabase');
    } catch (error) {
      console.error('Failed to store final results:', error);
    }
  }
}

// Create singleton instance
const skillAssessmentEngine = new SkillAssessmentEngine();

export default skillAssessmentEngine;
