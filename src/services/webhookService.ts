import { airtableService } from './airtableService.js';

// TypeScript Interfaces
interface GenerationStatus {
  customerId: string;
  status: 'processing' | 'completed' | 'failed';
  startTime: number;
  progress: number;
  currentStep: string;
  completedAt?: number;
}

interface AssessmentOnePager {
  title: string;
  companyName: string;
  assessmentDate: string;
  overallScore: number;
  performanceLevel: string;
  topChallenges: string[];
  primaryRecommendation: string;
  focusArea: string;
  revenueOpportunity: number;
  nextSteps: string[];
  generated: boolean;
}

interface AssessmentData {
  sessionId: string;
  userInfo: {
    company: string;
    email: string;
    productName: string;
    productDescription: string;
  };
  results: {
    overallScore: number;
    performanceLevel: string;
    challenges: string[];
    primaryRecommendation: string;
    focusArea: string;
    revenueOpportunity: number;
  };
}

/**
 * Webhook Service for Assessment One-Pager Generation
 * Simplified service focused only on generating downloadable assessment results
 */
class WebhookService {
  private generationStatus: Record<string, GenerationStatus> = {};
  private completedOnePagers: Record<string, AssessmentOnePager> = {};

  /**
   * Start assessment one-pager generation
   */
  startGeneration(customerId: string, sessionId?: string): string {
    const id = sessionId || Date.now().toString();
    
    console.log(`🧹 Starting assessment one-pager generation for session: ${id}`);
    
    this.generationStatus[id] = {
      customerId,
      status: 'processing',
      startTime: Date.now(),
      progress: 0,
      currentStep: 'Preparing assessment results...'
    };
    
    // Store session ID in localStorage for persistence
    try {
      localStorage.setItem('current_assessment_session', id);
    } catch (e) {
      console.warn('localStorage quota exceeded, continuing without persistence:', e);
    }
    
    return id;
  }

  /**
   * Update generation progress
   */
  updateProgress(sessionId: string, progress: number, currentStep: string): void {
    if (this.generationStatus[sessionId]) {
      this.generationStatus[sessionId].progress = progress;
      this.generationStatus[sessionId].currentStep = currentStep;
    }
  }

  /**
   * Complete one-pager generation
   */
  async completeGeneration(sessionId: string, onePager?: AssessmentOnePager): Promise<boolean> {
    if (this.generationStatus[sessionId]) {
      this.generationStatus[sessionId].status = 'completed';
      this.generationStatus[sessionId].progress = 100;
      this.generationStatus[sessionId].completedAt = Date.now();
      
      // Store completed one-pager
      this.completedOnePagers[sessionId] = onePager || this.getMockOnePager();
      
      // Store in localStorage for persistence
      try {
        localStorage.setItem(`assessment_onepager_${sessionId}`, JSON.stringify(this.completedOnePagers[sessionId]));
      } catch (e) {
        console.warn('Could not persist one-pager to localStorage:', e);
      }

      // Sync to Airtable if needed
      try {
        const customerId = this.generationStatus[sessionId]?.customerId;
        if (customerId && customerId !== 'CUST_DOTUN_01') {
          console.log('🔄 Syncing assessment one-pager to Airtable for:', customerId);
          // Note: Airtable sync would be handled by airtableService if needed
        }
      } catch (error) {
        console.error('❌ Error during Airtable sync:', error);
      }
      
      return true;
    }
    return false;
  }

  /**
   * Get current generation status
   */
  getStatus(sessionId: string): GenerationStatus | null {
    return this.generationStatus[sessionId] || null;
  }

  /**
   * Get completed one-pager
   */
  async getOnePager(sessionId: string): Promise<AssessmentOnePager | null> {
    console.log(`🔍 Getting assessment one-pager for session: ${sessionId}`);
    
    // Check memory first (most recent)
    if (this.completedOnePagers[sessionId]) {
      console.log('📦 Found one-pager in memory');
      return this.completedOnePagers[sessionId];
    }
    
    // Check localStorage as fallback
    const stored = localStorage.getItem(`assessment_onepager_${sessionId}`);
    if (stored) {
      try {
        const storedData = JSON.parse(stored);
        // Cache in memory for faster access
        this.completedOnePagers[sessionId] = storedData;
        return storedData;
      } catch (parseError) {
        console.error('❌ Error parsing stored one-pager:', parseError);
        localStorage.removeItem(`assessment_onepager_${sessionId}`);
      }
    }
    
    console.log('❌ No one-pager found for session:', sessionId);
    return null;
  }

  /**
   * Generate assessment one-pager from assessment data
   */
  generateAssessmentOnePager(assessmentData: AssessmentData): AssessmentOnePager {
    const { userInfo, results } = assessmentData;
    
    // Generate next steps based on focus area
    const nextSteps = this.generateNextSteps(results.focusArea, results.performanceLevel);
    
    return {
      title: `Revenue Readiness Assessment - ${userInfo.company}`,
      companyName: userInfo.company,
      assessmentDate: new Date().toLocaleDateString(),
      overallScore: results.overallScore,
      performanceLevel: results.performanceLevel,
      topChallenges: results.challenges.slice(0, 3), // Top 3 challenges
      primaryRecommendation: results.primaryRecommendation,
      focusArea: results.focusArea,
      revenueOpportunity: results.revenueOpportunity,
      nextSteps,
      generated: true
    };
  }

  /**
   * Generate next steps based on focus area and performance level
   */
  private generateNextSteps(focusArea: string, performanceLevel: string): string[] {
    const baseSteps = [
      'Review detailed assessment results in your personalized dashboard',
      'Access your 3 revenue intelligence tools (ICP Analysis, Cost Calculator, Business Case Builder)',
      'Schedule a strategy session with our revenue experts'
    ];

    const focusAreaSteps: Record<string, string[]> = {
      'customer_analysis': [
        'Complete your Ideal Customer Profile (ICP) analysis',
        'Develop buyer persona frameworks for your target market',
        'Create customer journey mapping for your sales process'
      ],
      'technical_translation': [
        'Use our Technical Translation tools to convert features to business value',
        'Develop executive-level product positioning',
        'Create ROI calculators for your technical solutions'
      ],
      'competitive_positioning': [
        'Complete competitive analysis framework',
        'Develop unique value proposition statements',
        'Create competitive differentiation strategies'
      ]
    };

    const performanceSteps: Record<string, string[]> = {
      'Foundation': [
        'Start with basic revenue intelligence fundamentals',
        'Focus on customer understanding and market positioning',
        'Build systematic approach to revenue planning'
      ],
      'Developing': [
        'Enhance existing customer analysis capabilities',
        'Improve technical-to-business value translation',
        'Strengthen competitive positioning strategies'
      ],
      'Competent': [
        'Optimize advanced revenue intelligence processes',
        'Scale successful strategies across your organization',
        'Develop predictive revenue modeling capabilities'
      ]
    };

    return [
      ...(focusAreaSteps[focusArea] || focusAreaSteps['customer_analysis']),
      ...(performanceSteps[performanceLevel] || performanceSteps['Foundation']),
      ...baseSteps
    ];
  }

  /**
   * Get mock one-pager for testing
   */
  getMockOnePager(): AssessmentOnePager {
    return {
      title: "Revenue Readiness Assessment - Sample Company",
      companyName: "Sample Company",
      assessmentDate: new Date().toLocaleDateString(),
      overallScore: 65,
      performanceLevel: "Developing",
      topChallenges: [
        "Technical Translation Challenge",
        "Buyer Conversations Challenge",
        "Competitive Positioning Challenge"
      ],
      primaryRecommendation: "Focus on customer analysis development and systematic improvement",
      focusArea: "customer_analysis",
      revenueOpportunity: 750000,
      nextSteps: [
        "Complete your Ideal Customer Profile (ICP) analysis",
        "Develop buyer persona frameworks for your target market",
        "Create customer journey mapping for your sales process",
        "Review detailed assessment results in your personalized dashboard",
        "Access your 3 revenue intelligence tools",
        "Schedule a strategy session with our revenue experts"
      ],
      generated: true
    };
  }

  /**
   * Simulate one-pager generation (for development/testing)
   */
  simulateGeneration(sessionId: string, delay: number = 3000): void {
    setTimeout(async () => {
      this.updateProgress(sessionId, 50, 'Generating assessment insights...');
      
      setTimeout(async () => {
        this.updateProgress(sessionId, 100, 'Finalizing one-pager...');
        
        setTimeout(async () => {
          await this.completeGeneration(sessionId, this.getMockOnePager());
        }, 1000);
      }, 1000);
    }, delay);
  }

  /**
   * Generate one-pager from assessment data and complete generation
   */
  async generateAndComplete(sessionId: string, assessmentData: AssessmentData): Promise<AssessmentOnePager> {
    this.updateProgress(sessionId, 25, 'Analyzing assessment results...');
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.updateProgress(sessionId, 50, 'Generating personalized insights...');
    
    // Generate the one-pager
    const onePager = this.generateAssessmentOnePager(assessmentData);
    
    this.updateProgress(sessionId, 75, 'Finalizing one-pager...');
    
    // Complete generation
    await this.completeGeneration(sessionId, onePager);
    
    return onePager;
  }

  /**
   * Get webhook URL for one-pager generation (if needed for external services)
   */
  getWebhookUrl(): string {
    if (typeof window !== 'undefined' && window.location.hostname === 'platform.andru-ai.com') {
      return 'https://platform.andru-ai.com/.netlify/functions/assessment-onepager-webhook';
    }
    return 'http://localhost:3001/api/webhook/assessment-onepager';
  }

  /**
   * Check if one-pager generation is supported
   */
  isSupported(): boolean {
    return true; // Always supported for assessment one-pagers
  }
}

// Create singleton instance
const webhookService = new WebhookService();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).webhookService = webhookService;
}

export default webhookService;