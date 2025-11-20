/**
 * Real-Time Insight Service (JavaScript)
 * Generates AI-powered insights during assessment
 *
 * Purpose: Call ClaudeAI API to generate personalized insights
 * Agent: Agent 1
 * Date: October 25, 2025
 */

import dotenv from 'dotenv';
dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-3-opus-20240229';

/**
 * Real-Time Insight Service
 * Handles AI-powered insight generation for assessment batches
 */
class RealTimeInsightService {
  apiKey: string | undefined;

  constructor() {
    this.apiKey = ANTHROPIC_API_KEY;

    if (!this.apiKey || this.apiKey === 'sk-ant-api03-placeholder') {
      console.error('⚠️  ANTHROPIC_API_KEY not configured - AI insights will fail');
    }
  }

  /**
   * Check if AI is configured and ready
   */
  isAIConfigured() {
    return !!(this.apiKey && this.apiKey !== 'sk-ant-api03-placeholder');
  }

  /**
   * Build AI prompt for insight generation
   */
  buildPrompt(responses, batchNumber, userInfo, previousInsights) {
    const { company, productName, businessModel } = userInfo;

    let prompt = `You are an expert B2B sales strategist analyzing assessment responses to identify sales challenges and business impact.

Company: ${company}
Product: ${productName}
Business Model: ${businessModel}

Current Assessment Responses (Batch ${batchNumber}):
${responses.map((r, i) => `${i + 1}. ${r.questionText}\n   Response: ${r.response}`).join('\n')}`;

    // Add context from previous insights if available
    if (previousInsights && previousInsights.length > 0) {
      prompt += `\n\nPrevious Insights:`;
      previousInsights.forEach((insight, i) => {
        prompt += `\nBatch ${i + 1}: ${insight.challengeIdentified} - ${insight.insight}`;
      });
      prompt += `\n\nBuild on these previous insights to provide deeper, more specific analysis.`;
    }

    prompt += `\n\nBased on these responses${previousInsights && previousInsights.length > 0 ? ' and previous insights' : ''}, identify the primary sales challenge and provide a personalized insight.

Focus on:
1. Specific sales challenges (Technical Translation, Buyer Conversations, Competitive Positioning, Value Articulation)
2. Business impact and consequences (be specific about what this costs them)
3. Clear, actionable insights based on response patterns
4. Confidence level (70-95%) based on response quality and clarity

Respond with valid JSON only (no markdown, no code blocks):
{
  "challengeIdentified": "Specific challenge name",
  "insight": "Personalized insight message (2-3 sentences that connect their responses to business impact)",
  "businessImpact": "Specific business consequence they're experiencing",
  "confidence": 85,
  "reasoning": "Brief explanation of why you identified this challenge based on their specific responses"
}`;

    return prompt;
  }

  /**
   * Call Anthropic API to generate insight
   */
  async callClaudeAPI(prompt) {
    if (!this.isAIConfigured()) {
      throw new Error('ClaudeAI API key not configured');
    }

    // Add timeout using AbortController (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      console.log(`📡 Calling Anthropic API (model: ${MODEL})...`);

      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 800,
          temperature: 0.7,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log(`📡 Anthropic API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Anthropic API error (${response.status}):`, errorText);
        throw new Error(`ClaudeAI API error (${response.status}): ${errorText}`);
      }

      const result = await response.json() as { content: Array<{ text: string }> };

      if (!result.content || !result.content[0] || !result.content[0].text) {
        console.error('❌ Invalid response structure from Anthropic API:', result);
        throw new Error('Invalid response from ClaudeAI API');
      }

      console.log('✅ Anthropic API call successful');
      return result.content[0].text;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        console.error('❌ Anthropic API call timed out after 30 seconds');
        throw new Error('Anthropic API call timed out after 30 seconds');
      }

      console.error('❌ Anthropic API call failed:', error);
      throw error;
    }
  }

  /**
   * Parse JSON from AI response
   */
  parseAIResponse(aiText) {
    // Extract JSON from response (handles cases where AI adds markdown)
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!parsed.challengeIdentified || !parsed.insight || !parsed.businessImpact ||
        typeof parsed.confidence !== 'number' || !parsed.reasoning) {
      throw new Error('AI response missing required fields');
    }

    // Validate confidence range
    if (parsed.confidence < 70 || parsed.confidence > 95) {
      console.warn(`⚠️  Confidence ${parsed.confidence} outside expected range (70-95), clamping...`);
      parsed.confidence = Math.max(70, Math.min(95, parsed.confidence));
    }

    return parsed;
  }

  /**
   * Generate insight for batch 1 (questions 1-4)
   */
  async analyzeBatch1(batch) {
    console.log('🔍 Analyzing batch 1 (responses 1-4) with Claude AI...');

    const { responses, sessionId, userInfo } = batch;

    const prompt = this.buildPrompt(
      responses,
      1,
      userInfo || {
        company: 'Unknown Company',
        productName: 'Unknown Product',
        businessModel: 'Unknown Model'
      },
      null
    );

    const aiText = await this.callClaudeAPI(prompt);
    const aiInsight = this.parseAIResponse(aiText);

    const insightData = {
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

    console.log(`✅ Batch 1 insight generated (confidence: ${aiInsight.confidence}%)`);

    return insightData;
  }

  /**
   * Generate insight for batch 2 (questions 5-9)
   */
  async analyzeBatch2(batch) {
    console.log('🔍 Analyzing batch 2 (responses 5-9) with Claude AI...');

    const { responses, sessionId, userInfo, previousInsights } = batch;

    const prompt = this.buildPrompt(
      responses,
      2,
      userInfo || {
        company: 'Unknown Company',
        productName: 'Unknown Product',
        businessModel: 'Unknown Model'
      },
      previousInsights
    );

    const aiText = await this.callClaudeAPI(prompt);
    const aiInsight = this.parseAIResponse(aiText);

    const insightData = {
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

    console.log(`✅ Batch 2 insight generated (confidence: ${aiInsight.confidence}%)`);

    return insightData;
  }

  /**
   * Generate insight for batch 3 (questions 10-14)
   */
  async analyzeBatch3(batch) {
    console.log('🔍 Analyzing batch 3 (responses 10-14) with Claude AI...');

    const { responses, sessionId, userInfo, previousInsights } = batch;

    const prompt = this.buildPrompt(
      responses,
      3,
      userInfo || {
        company: 'Unknown Company',
        productName: 'Unknown Product',
        businessModel: 'Unknown Model'
      },
      previousInsights
    );

    const aiText = await this.callClaudeAPI(prompt);
    const aiInsight = this.parseAIResponse(aiText);

    const insightData = {
      id: `insight_${sessionId}_3`,
      sessionId,
      batchNumber: 3,
      questionRange: '10-14',
      insight: aiInsight.insight,
      challengeIdentified: aiInsight.challengeIdentified,
      businessImpact: aiInsight.businessImpact,
      confidence: aiInsight.confidence,
      generatedAt: new Date().toISOString()
    };

    console.log(`✅ Batch 3 insight generated (confidence: ${aiInsight.confidence}%)`);

    return insightData;
  }

  /**
   * Get all insights for a session
   * (Currently returns empty array - would need Supabase integration)
   */
  async getInsightsForSession(sessionId) {
    console.log(`📊 Retrieving insights for session: ${sessionId}`);
    // TODO: Implement Supabase retrieval when storage is added
    return [];
  }
}

// Create singleton instance
const realTimeInsightService = new RealTimeInsightService();

export default realTimeInsightService;
