import { AssessmentResponse, Insight } from './types';

// TypeScript Interfaces
interface ClaudeAPIOptions {
  model?: string;
  max_tokens?: number;
  temperature?: number;
}

interface ClaudeAPIResponse {
  content: Array<{
    text: string;
  }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AssessmentInsightRequest {
  responses: AssessmentResponse[];
  batchNumber: 1 | 2 | 3;
  previousInsights?: Insight[];
  userInfo: {
    company: string;
    productName: string;
    businessModel: string;
  };
}

interface FinalAssessmentRequest {
  responses: AssessmentResponse[];
  insights: Insight[];
  userInfo: {
    company: string;
    productName: string;
    businessModel: string;
    productDescription: string;
  };
}

interface AIInsightResponse {
  challengeIdentified: string;
  insight: string;
  businessImpact: string;
  confidence: number;
  reasoning: string;
}

interface AIAssessmentResponse {
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
}

/**
 * Claude AI Service for Assessment Analysis
 * Provides AI-powered insights and personalized assessment results
 */
class ClaudeAIService {
  private anthropicApiKey: string | undefined;
  private isConfigured: boolean;

  constructor() {
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    this.isConfigured = !!this.anthropicApiKey;
    
    if (!this.isConfigured) {
      console.warn('⚠️ Anthropic API key not configured. Assessment will use fallback analysis.');
    }
  }

  /**
   * Generate real-time insight using Claude AI
   */
  async generateInsight(request: AssessmentInsightRequest): Promise<AIInsightResponse> {
    if (!this.isConfigured) {
      return this.getFallbackInsight(request);
    }

    try {
      const prompt = this.buildInsightPrompt(request);
      
      const aiResponse = await this.callClaudeAPI(prompt, {
        model: 'claude-3-5-sonnet-20241022', // Most powerful model for real-time insights
        max_tokens: 800,
        temperature: 0.7
      });

      const insight = this.parseInsightResponse(aiResponse);
      
      console.log(`✅ Generated AI insight for batch ${request.batchNumber}`);
      
      return insight;
    } catch (error) {
      console.error(`❌ Failed to generate AI insight: ${error}`);
      return this.getFallbackInsight(request);
    }
  }

  /**
   * Generate final assessment results using Claude AI
   */
  async generateFinalAssessment(request: FinalAssessmentRequest): Promise<AIAssessmentResponse> {
    if (!this.isConfigured) {
      return this.getFallbackAssessment(request);
    }

    try {
      const prompt = this.buildFinalAssessmentPrompt(request);
      
      const aiResponse = await this.callClaudeAPI(prompt, {
        model: 'claude-3-5-sonnet-20241022', // Most powerful model for final analysis
        max_tokens: 2000,
        temperature: 0.6
      });

      const assessment = this.parseFinalAssessmentResponse(aiResponse);
      
      console.log(`✅ Generated AI final assessment`);
      
      return assessment;
    } catch (error) {
      console.error(`❌ Failed to generate AI final assessment: ${error}`);
      return this.getFallbackAssessment(request);
    }
  }

  /**
   * Build insight generation prompt
   */
  private buildInsightPrompt(request: AssessmentInsightRequest): string {
    const { responses, batchNumber, previousInsights, userInfo } = request;
    
    let contextPrompt = `You are an expert B2B sales strategist analyzing assessment responses to identify sales challenges and business impact.

Company: ${userInfo.company}
Product: ${userInfo.productName}
Business Model: ${userInfo.businessModel}

Current Assessment Responses (Batch ${batchNumber}):`;

    responses.forEach((response, index) => {
      contextPrompt += `\n${index + 1}. ${response.questionText}\n   Response: ${response.response}`;
    });

    if (previousInsights && previousInsights.length > 0) {
      contextPrompt += `\n\nPrevious Insights:`;
      previousInsights.forEach((insight, index) => {
        contextPrompt += `\n${index + 1}. ${insight.insight}`;
      });
    }

    contextPrompt += `\n\nBased on these responses, identify the primary sales challenge and provide a personalized insight.

Focus on:
1. Specific sales challenges (Technical Translation, Buyer Conversations, Competitive Positioning)
2. Business impact and consequences
3. Clear, actionable insights
4. Confidence level based on response quality

Respond with valid JSON:
{
  "challengeIdentified": "Specific challenge name",
  "insight": "Personalized insight message (2-3 sentences)",
  "businessImpact": "Specific business consequence",
  "confidence": 85,
  "reasoning": "Brief explanation of analysis"
}`;

    return contextPrompt;
  }

  /**
   * Build final assessment prompt
   */
  private buildFinalAssessmentPrompt(request: FinalAssessmentRequest): string {
    const { responses, insights, userInfo } = request;
    
    let contextPrompt = `You are an expert B2B sales strategist conducting a comprehensive revenue intelligence assessment.

Company: ${userInfo.company}
Product: ${userInfo.productName}
Business Model: ${userInfo.businessModel}
Product Description: ${userInfo.productDescription}

Complete Assessment Responses:`;

    responses.forEach((response, index) => {
      contextPrompt += `\n${index + 1}. ${response.questionText}\n   Response: ${response.response}`;
    });

    if (insights && insights.length > 0) {
      contextPrompt += `\n\nReal-time Insights Generated:`;
      insights.forEach((insight, index) => {
        contextPrompt += `\n${index + 1}. ${insight.insight} (Challenge: ${insight.challengeIdentified})`;
      });
    }

    contextPrompt += `\n\nProvide a comprehensive assessment with:

1. Overall competency score (0-100)
2. Performance level (Foundation, Developing, Competent, Proficient, Advanced, Strategic)
3. Skill levels across 5 areas (0-10 scale each)
4. Specific challenges identified from insights
5. Personalized recommendations with tools
6. Focus area for improvement
7. Revenue opportunity estimate
8. ROI multiplier
9. Next steps

Respond with valid JSON:
{
  "overallScore": 75,
  "performanceLevel": "Competent",
  "skillLevels": {
    "customerAnalysis": 7,
    "businessCommunication": 6,
    "revenueStrategy": 8,
    "valueArticulation": 7,
    "strategicThinking": 6
  },
  "challenges": [
    {
      "name": "Technical Translation Challenge",
      "description": "Specific description",
      "priority": "high",
      "impact": 8,
      "businessConsequence": "Specific consequence"
    }
  ],
  "recommendations": [
    {
      "category": "Technical Translation",
      "title": "Specific recommendation",
      "description": "Detailed description",
      "priority": "high",
      "expectedOutcome": "Specific outcome",
      "timeframe": "3-6 months",
      "tools": ["Tool 1", "Tool 2"]
    }
  ],
  "focusArea": "technical_translation",
  "revenueOpportunity": 750000,
  "roiMultiplier": 3.5,
  "nextSteps": ["Step 1", "Step 2"],
  "confidence": 88
}`;

    return contextPrompt;
  }

  /**
   * Call Claude API
   */
  private async callClaudeAPI(prompt: string, options: ClaudeAPIOptions = {}): Promise<string> {
    if (!this.anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.anthropicApiKey,
        'Anthropic-Version': '2023-06-01'
      },
      body: JSON.stringify({
        model: options.model || 'claude-3-5-sonnet-20241022',
        max_tokens: options.max_tokens || 2000,
        temperature: options.temperature || 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    const result: ClaudeAPIResponse = await response.json();
    return result.content[0].text;
  }

  /**
   * Parse insight response from Claude
   */
  private parseInsightResponse(response: string): AIInsightResponse {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsed.challengeIdentified || !parsed.insight) {
        throw new Error('Invalid insight response structure');
      }
      
      return {
        challengeIdentified: parsed.challengeIdentified,
        insight: parsed.insight,
        businessImpact: parsed.businessImpact || 'Revenue impact',
        confidence: Math.min(95, Math.max(60, parsed.confidence || 75)),
        reasoning: parsed.reasoning || 'AI analysis based on assessment responses'
      };
    } catch (error) {
      console.warn(`Failed to parse insight response: ${error}`);
      return this.getFallbackInsight({ responses: [], batchNumber: 1, userInfo: { company: '', productName: '', businessModel: '' } });
    }
  }

  /**
   * Parse final assessment response from Claude
   */
  private parseFinalAssessmentResponse(response: string): AIAssessmentResponse {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and set defaults
      return {
        overallScore: Math.min(100, Math.max(0, parsed.overallScore || 70)),
        performanceLevel: parsed.performanceLevel || 'Competent',
        skillLevels: {
          customerAnalysis: Math.min(10, Math.max(0, parsed.skillLevels?.customerAnalysis || 7)),
          businessCommunication: Math.min(10, Math.max(0, parsed.skillLevels?.businessCommunication || 6)),
          revenueStrategy: Math.min(10, Math.max(0, parsed.skillLevels?.revenueStrategy || 8)),
          valueArticulation: Math.min(10, Math.max(0, parsed.skillLevels?.valueArticulation || 7)),
          strategicThinking: Math.min(10, Math.max(0, parsed.skillLevels?.strategicThinking || 6))
        },
        challenges: parsed.challenges || [],
        recommendations: parsed.recommendations || [],
        focusArea: parsed.focusArea || 'customer_analysis',
        revenueOpportunity: parsed.revenueOpportunity || 500000,
        roiMultiplier: Math.max(2.0, parsed.roiMultiplier || 3.0),
        nextSteps: parsed.nextSteps || ['Review assessment results', 'Implement recommendations'],
        confidence: Math.min(95, Math.max(70, parsed.confidence || 80))
      };
    } catch (error) {
      console.warn(`Failed to parse final assessment response: ${error}`);
      return this.getFallbackAssessment({ responses: [], insights: [], userInfo: { company: '', productName: '', businessModel: '', productDescription: '' } });
    }
  }

  /**
   * Fallback insight when AI is not available
   */
  private getFallbackInsight(request: AssessmentInsightRequest): AIInsightResponse {
    const challenges = ['Technical Translation Challenge', 'Buyer Conversations Challenge', 'Competitive Positioning Challenge'];
    const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];
    
    return {
      challengeIdentified: randomChallenge,
      insight: `Based on your responses, you show strong technical understanding but may benefit from focusing on buyer-centric conversations to improve deal outcomes.`,
      businessImpact: 'Potential revenue impact from improved sales conversations',
      confidence: 70,
      reasoning: 'Fallback analysis based on standard assessment patterns'
    };
  }

  /**
   * Fallback assessment when AI is not available
   */
  private getFallbackAssessment(request: FinalAssessmentRequest): AIAssessmentResponse {
    return {
      overallScore: 70,
      performanceLevel: 'Competent',
      skillLevels: {
        customerAnalysis: 7,
        businessCommunication: 6,
        revenueStrategy: 8,
        valueArticulation: 7,
        strategicThinking: 6
      },
      challenges: [
        {
          name: 'Technical Translation Challenge',
          description: 'Difficulty translating technical capabilities into business value',
          priority: 'high',
          impact: 7,
          businessConsequence: 'Heavy discounting to win customers'
        }
      ],
      recommendations: [
        {
          category: 'Technical Translation',
          title: 'Develop Buyer-Specific Messaging',
          description: 'Create frameworks to translate technical features into business value propositions',
          priority: 'high',
          expectedOutcome: '40% higher close rates through value-focused presentations',
          timeframe: '3-6 months',
          tools: ['Technical Translation Framework', 'Value Proposition Builder', 'ROI Calculator']
        }
      ],
      focusArea: 'technical_translation',
      revenueOpportunity: 500000,
      roiMultiplier: 3.0,
      nextSteps: [
        'Review detailed assessment results',
        'Access your 3 revenue intelligence tools',
        'Implement systematic improvement approach'
      ],
      confidence: 75
    };
  }

  /**
   * Check if Claude AI is configured
   */
  isAIConfigured(): boolean {
    return this.isConfigured;
  }
}

// Create singleton instance
const claudeAIService = new ClaudeAIService();

export default claudeAIService;
