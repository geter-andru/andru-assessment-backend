import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Environment variables
const BASE_URL = 'https://api.airtable.com/v0';
const BASE_ID = process.env.REACT_APP_AIRTABLE_BASE_ID;
const API_KEY = process.env.REACT_APP_AIRTABLE_API_KEY;

// Check if required environment variables are configured
if (!BASE_ID || !API_KEY) {
  throw new Error('REACT_APP_AIRTABLE_BASE_ID and REACT_APP_AIRTABLE_API_KEY environment variables are required');
}

// TypeScript Interfaces
interface WorkflowProgress {
  icp_completed: boolean;
  icp_score: number | null;
  cost_calculated: boolean;
  annual_cost: number | null;
  business_case_ready: boolean;
  selected_template: string | null;
  last_active_tool: string;
  completion_percentage: number;
  company_name: string;
  analysis_date: string | null;
}

interface UserPreferences {
  icp_framework_customized: boolean;
  preferred_export_format: string;
  methodology_transparency: boolean;
  custom_criteria: string[];
  export_history: string[];
}

interface UsageAnalytics {
  session_start: string | null;
  time_per_tool: Record<string, number>;
  export_count: number;
  share_count: number;
  tools_completed: string[];
  last_login: string | null;
}

interface CompetencyScores {
  customer_analysis: number;
  business_communication: number;
  revenue_strategy: number;
  value_articulation: number;
  strategic_thinking: number;
}

interface CompetencyProgress {
  overall_level: string;
  total_progress_points: number;
  competency_scores: CompetencyScores;
  level_history: string[];
  advancement_dates: Record<string, string>;
  consistency_streak: number;
  last_activity: string | null;
  competency_tier: string;
  development_points: number;
  next_tier_threshold: number;
}

interface UnlockProgress {
  analyses_needed?: number;
  score_needed?: number;
  current_analyses?: number;
  current_avg_score?: number;
  calculations_needed?: number;
  impact_threshold?: number;
  current_calculations?: number;
  current_max_impact?: number;
}

interface ToolAccess {
  access: boolean;
  unlock_progress?: UnlockProgress;
  completions: number;
  average_score?: number;
  total_time_spent?: number;
  best_score?: number;
  completion_history?: string[];
  average_impact?: number;
  completion_quality?: number;
}

interface ToolAccessStatus {
  icp_analysis: ToolAccess;
  cost_calculator: ToolAccess;
  business_case_builder: ToolAccess;
}

interface ProfessionalMilestones {
  milestones_achieved: string[];
  milestone_progress: Record<string, number>;
  total_milestone_points: number;
  recent_achievements: string[];
  next_milestone_targets: Record<string, string>;
  achievement_history: string[];
  categories_completed: string[];
}

interface DailyObjectives {
  current_date: string;
  objectives_completed: string[];
  completion_streak: number;
  daily_progress_earned: number;
  objectives_available: boolean;
  streak_multiplier: number;
  objectives_for_today: string[];
  last_generated: string | null;
}

interface ChallengeBreakdown {
  challenge: string;
  priority: string;
  impact: number;
}

interface AssessmentData {
  overall_score: number;
  performance_level: string;
  buyer_understanding_score: number;
  tech_to_value_score: number;
  percentile: number;
  total_challenges: number;
  critical_challenges: number;
  high_priority_challenges: number;
  challenge_breakdown: ChallengeBreakdown[];
  primary_recommendation: string;
  recommendation_type: string;
  focus_area: string;
  urgency_factors: string[];
  strategic_priorities: string[];
  revenue_opportunity: number;
  roi_multiplier: number;
  is_high_priority: boolean;
  lead_priority: string;
  impact_timeline: string;
  business_model: string;
  product_name: string;
  product_description: string;
  distinguishing_feature: string;
  competitive_positioning: string;
  completed_date: string | null;
  duration_minutes: number;
  conversion_stage: string;
  source: string;
  browser: string;
  user_agent: string;
  completion_context: Record<string, any>;
}

interface CustomerData {
  id: string;
  customerId: string;
  customerName: string;
  accessToken: string;
  icpContent: any;
  icpDescription: any;
  costCalculatorContent: any;
  businessCaseContent: any;
  workflowProgress: WorkflowProgress;
  userPreferences: UserPreferences;
  usageAnalytics: UsageAnalytics;
  competencyProgress: CompetencyProgress;
  toolAccessStatus: ToolAccessStatus;
  professionalMilestones: ProfessionalMilestones;
  dailyObjectives: DailyObjectives;
  detailedIcpAnalysis: any;
  targetBuyerPersonas: any;
  assessmentData: AssessmentData;
  createdAt: string;
  lastAccessed: string;
}

interface AirtableRecord {
  id: string;
  fields: Record<string, any>;
}

interface AirtableResponse {
  records: AirtableRecord[];
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface AssessmentResult {
  success: boolean;
  assessmentId?: string;
  sessionId?: string;
  error?: string;
}

interface SyncResult {
  success: boolean;
  updatedFields?: string[];
  error?: string;
}

// Cache for customer assets and user progress to avoid redundant API calls
const customerAssetsCache = new Map<string, CacheEntry<CustomerData>>();
const userProgressCache = new Map<string, CacheEntry<any>>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Default JSON structures for workflow tracking
const DEFAULT_WORKFLOW_PROGRESS: WorkflowProgress = {
  icp_completed: false,
  icp_score: null,
  cost_calculated: false,
  annual_cost: null,
  business_case_ready: false,
  selected_template: null,
  last_active_tool: "icp",
  completion_percentage: 0,
  company_name: "",
  analysis_date: null
};

const DEFAULT_USER_PREFERENCES: UserPreferences = {
  icp_framework_customized: false,
  preferred_export_format: "pdf",
  methodology_transparency: false,
  custom_criteria: [],
  export_history: []
};

const DEFAULT_USAGE_ANALYTICS: UsageAnalytics = {
  session_start: null,
  time_per_tool: {},
  export_count: 0,
  share_count: 0,
  tools_completed: [],
  last_login: null
};

// Enhanced professional development default structures
const DEFAULT_COMPETENCY_PROGRESS: CompetencyProgress = {
  overall_level: "Foundation",
  total_progress_points: 0,
  competency_scores: {
    customer_analysis: 0,
    business_communication: 0,
    revenue_strategy: 0,
    value_articulation: 0,
    strategic_thinking: 0
  },
  level_history: [],
  advancement_dates: {},
  consistency_streak: 0,
  last_activity: null,
  competency_tier: "Foundation",
  development_points: 0,
  next_tier_threshold: 500
};

const DEFAULT_TOOL_ACCESS_STATUS: ToolAccessStatus = {
  icp_analysis: {
    access: true,
    completions: 0,
    average_score: 0,
    total_time_spent: 0,
    best_score: 0,
    completion_history: []
  },
  cost_calculator: {
    access: false,
    unlock_progress: { 
      analyses_needed: 3, 
      score_needed: 70,
      current_analyses: 0,
      current_avg_score: 0
    },
    completions: 0,
    average_impact: 0,
    completion_history: []
  },
  business_case_builder: {
    access: false,
    unlock_progress: { 
      calculations_needed: 2, 
      impact_threshold: 100000,
      current_calculations: 0,
      current_max_impact: 0
    },
    completions: 0,
    completion_quality: 0,
    completion_history: []
  }
};

const DEFAULT_PROFESSIONAL_MILESTONES: ProfessionalMilestones = {
  milestones_achieved: [],
  milestone_progress: {},
  total_milestone_points: 0,
  recent_achievements: [],
  next_milestone_targets: {},
  achievement_history: [],
  categories_completed: []
};

const DEFAULT_DAILY_OBJECTIVES: DailyObjectives = {
  current_date: new Date().toISOString().split('T')[0],
  objectives_completed: [],
  completion_streak: 0,
  daily_progress_earned: 0,
  objectives_available: true,
  streak_multiplier: 1.0,
  objectives_for_today: [],
  last_generated: null
};

// Default Assessment data structure for comprehensive customer evaluation
const DEFAULT_ASSESSMENT_DATA: AssessmentData = {
  overall_score: 0,
  performance_level: "Foundation",
  buyer_understanding_score: 0,
  tech_to_value_score: 0,
  percentile: 0,
  total_challenges: 0,
  critical_challenges: 0,
  high_priority_challenges: 0,
  challenge_breakdown: [],
  primary_recommendation: "",
  recommendation_type: "foundation_building",
  focus_area: "customer_analysis",
  urgency_factors: [],
  strategic_priorities: [],
  revenue_opportunity: 0,
  roi_multiplier: 1.0,
  is_high_priority: false,
  lead_priority: "standard",
  impact_timeline: "medium_term",
  business_model: "",
  product_name: "",
  product_description: "",
  distinguishing_feature: "",
  competitive_positioning: "",
  completed_date: null,
  duration_minutes: 0,
  conversion_stage: "discovery",
  source: "direct_assessment",
  browser: "",
  user_agent: "",
  completion_context: {}
};

// Create axios instance with default config
const airtableClient: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/${BASE_ID}`,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  timeout: 30000  // Increased from 10000ms to 30000ms
});

// Add request interceptor for logging
airtableClient.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Airtable Request:', config.method?.toUpperCase(), config.url);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
airtableClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    console.error('Airtable Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.message || 'Failed to fetch data from Airtable');
  }
);

export const airtableService = {
  // Fetch customer assets data with caching
  async getCustomerAssets(customerId: string, accessToken: string): Promise<CustomerData> {
    try {
      const cacheKey = `${customerId}_${accessToken}`;
      
      // Check cache first
      const cachedData = customerAssetsCache.get(cacheKey);
      if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Using cached customer assets for: ${customerId}`);
        }
        return cachedData.data;
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Fetching customer assets for: ${customerId} with token: ${accessToken}`);
      }
      
      // Strategy 1: Try filtering by Access Token only (more reliable)
      // Sanitize accessToken to prevent injection attacks
      const sanitizedToken = accessToken.replace(/'/g, "''").replace(/\\/g, "\\\\");
      const response: AxiosResponse<AirtableResponse> = await airtableClient.get('/Customer Assets', {
        params: {
          filterByFormula: `{Access Token} = '${sanitizedToken}'`,
          maxRecords: 10  // Reduced from 100 to minimize timeout risk
        }
      });

      if (process.env.NODE_ENV === 'development') {
        console.log(`Found ${response.data.records.length} records with matching access token`);
      }

      // Find matching record by Customer ID in the filtered results
      const matchingRecord = response.data.records.find(record => {
        const recordCustomerId = record.fields['Customer ID'];
        if (process.env.NODE_ENV === 'development') {
          console.log(`Checking record with Customer ID: ${recordCustomerId}`);
        }
        return recordCustomerId === customerId;
      });

      if (!matchingRecord) {
        // Strategy 2: If no match found, try direct record lookup if customerId looks like record ID
        if (customerId.startsWith('rec')) {
          if (process.env.NODE_ENV === 'development') {
            console.log('Trying direct record lookup...');
          }
          const directResponse: AxiosResponse<AirtableRecord> = await airtableClient.get(`/Customer Assets/${customerId}`);
          const record = directResponse.data;
          
          // Verify access token matches
          if (record.fields['Access Token'] !== accessToken) {
            throw new Error('Invalid customer ID or access token');
          }
          
          const customerData: CustomerData = {
            id: record.id,
            customerId: record.fields['Customer ID'] || customerId,
            customerName: record.fields['Customer Name'],
            accessToken: record.fields['Access Token'],
            icpContent: this.parseJsonField(record.fields['ICP Content']),
            icpDescription: this.parseJsonField(record.fields['ICP Description']),
            costCalculatorContent: this.parseJsonField(record.fields['Cost Calculator Content']),
            businessCaseContent: this.parseJsonField(record.fields['Business Case Content']),
            workflowProgress: this.parseJsonField(record.fields['Workflow Progress']) || this.getDefaultWorkflowProgress(),
            userPreferences: this.parseJsonField(record.fields['User Preferences']) || this.getDefaultUserPreferences(),
            usageAnalytics: this.parseJsonField(record.fields['Usage Analytics']) || this.getDefaultUsageAnalytics(),
            // Enhanced gamification fields
            competencyProgress: this.parseJsonField(record.fields['Competency Progress']) || this.getDefaultCompetencyProgress(),
            toolAccessStatus: this.parseJsonField(record.fields['Tool Access Status']) || this.getDefaultToolAccessStatus(),
            professionalMilestones: this.parseJsonField(record.fields['Professional Milestones']) || this.getDefaultProfessionalMilestones(),
            dailyObjectives: this.parseJsonField(record.fields['Daily Objectives']) || this.getDefaultDailyObjectives(),
            // Enhanced ICP fields for personalized analysis
            detailedIcpAnalysis: this.parseJsonField(record.fields['Detailed ICP Analysis']),
            targetBuyerPersonas: this.parseJsonField(record.fields['Target Buyer Personas']),
            // Assessment fields - comprehensive customer evaluation data
            assessmentData: this.parseAssessmentFields(record.fields),
            createdAt: record.fields['Created At'],
            lastAccessed: record.fields['Last Accessed']
          };
          
          // Cache the result to avoid redundant API calls
          customerAssetsCache.set(cacheKey, {
            data: customerData,
            timestamp: Date.now()
          });
          
          return customerData;
        }
        
        throw new Error('Invalid customer ID or access token');
      }

      const record = matchingRecord;
      if (process.env.NODE_ENV === 'development') {
        console.log('Successfully found matching customer record');
      }
      
      const customerData: CustomerData = {
        id: record.id,
        customerId: record.fields['Customer ID'] || customerId,
        customerName: record.fields['Customer Name'],
        accessToken: record.fields['Access Token'],
        icpContent: this.parseJsonField(record.fields['ICP Content']),
        icpDescription: this.parseJsonField(record.fields['ICP Description']),
        costCalculatorContent: this.parseJsonField(record.fields['Cost Calculator Content']),
        businessCaseContent: this.parseJsonField(record.fields['Business Case Content']),
        workflowProgress: this.parseJsonField(record.fields['Workflow Progress']) || this.getDefaultWorkflowProgress(),
        userPreferences: this.parseJsonField(record.fields['User Preferences']) || this.getDefaultUserPreferences(),
        usageAnalytics: this.parseJsonField(record.fields['Usage Analytics']) || this.getDefaultUsageAnalytics(),
        // Enhanced gamification fields
        competencyProgress: this.parseJsonField(record.fields['Competency Progress']) || this.getDefaultCompetencyProgress(),
        toolAccessStatus: this.parseJsonField(record.fields['Tool Access Status']) || this.getDefaultToolAccessStatus(),
        professionalMilestones: this.parseJsonField(record.fields['Professional Milestones']) || this.getDefaultProfessionalMilestones(),
        dailyObjectives: this.parseJsonField(record.fields['Daily Objectives']) || this.getDefaultDailyObjectives(),
        // Enhanced ICP fields for personalized analysis
        detailedIcpAnalysis: this.parseJsonField(record.fields['Detailed ICP Analysis']),
        targetBuyerPersonas: this.parseJsonField(record.fields['Target Buyer Personas']),
        // Assessment fields - comprehensive customer evaluation data
        assessmentData: this.parseAssessmentFields(record.fields),
        createdAt: record.fields['Created At'],
        lastAccessed: record.fields['Last Accessed']
      };
      
      // Cache the result to avoid redundant API calls
      customerAssetsCache.set(cacheKey, {
        data: customerData,
        timestamp: Date.now()
      });
      
      return customerData;
    } catch (error) {
      console.error('Error fetching customer assets:', error);
      throw error;
    }
  },

  // Parse JSON field with error handling
  parseJsonField(field: any): any {
    if (!field) return null;
    
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch (error) {
        console.warn('Failed to parse JSON field:', error);
        return null;
      }
    }
    
    return field;
  },

  // Parse assessment fields from Airtable record
  parseAssessmentFields(fields: Record<string, any>): AssessmentData {
    const assessmentData = { ...DEFAULT_ASSESSMENT_DATA };
    
    // Map Airtable fields to assessment data structure
    if (fields['Assessment Overall Score']) assessmentData.overall_score = Number(fields['Assessment Overall Score']) || 0;
    if (fields['Assessment Performance Level']) assessmentData.performance_level = fields['Assessment Performance Level'];
    if (fields['Assessment Buyer Score']) assessmentData.buyer_understanding_score = Number(fields['Assessment Buyer Score']) || 0;
    if (fields['Assessment Tech Score']) assessmentData.tech_to_value_score = Number(fields['Assessment Tech Score']) || 0;
    if (fields['Assessment Percentile']) assessmentData.percentile = Number(fields['Assessment Percentile']) || 0;
    if (fields['Assessment Total Challenges']) assessmentData.total_challenges = Number(fields['Assessment Total Challenges']) || 0;
    if (fields['Assessment Critical Challenges']) assessmentData.critical_challenges = Number(fields['Assessment Critical Challenges']) || 0;
    if (fields['Assessment High Priority Challenges']) assessmentData.high_priority_challenges = Number(fields['Assessment High Priority Challenges']) || 0;
    if (fields['Assessment Primary Recommendation']) assessmentData.primary_recommendation = fields['Assessment Primary Recommendation'];
    if (fields['Assessment Recommendation Type']) assessmentData.recommendation_type = fields['Assessment Recommendation Type'];
    if (fields['Assessment Focus Area']) assessmentData.focus_area = fields['Assessment Focus Area'];
    if (fields['Assessment Revenue Opportunity']) assessmentData.revenue_opportunity = Number(fields['Assessment Revenue Opportunity']) || 0;
    if (fields['Assessment ROI Multiplier']) assessmentData.roi_multiplier = Number(fields['Assessment ROI Multiplier']) || 1.0;
    if (fields['Assessment Is High Priority']) assessmentData.is_high_priority = Boolean(fields['Assessment Is High Priority']);
    if (fields['Assessment Lead Priority']) assessmentData.lead_priority = fields['Assessment Lead Priority'];
    if (fields['Assessment Impact Timeline']) assessmentData.impact_timeline = fields['Assessment Impact Timeline'];
    if (fields['Assessment Business Model']) assessmentData.business_model = fields['Assessment Business Model'];
    if (fields['Assessment Product Name']) assessmentData.product_name = fields['Assessment Product Name'];
    if (fields['Assessment Product Description']) assessmentData.product_description = fields['Assessment Product Description'];
    if (fields['Assessment Distinguishing Feature']) assessmentData.distinguishing_feature = fields['Assessment Distinguishing Feature'];
    if (fields['Assessment Competitive Positioning']) assessmentData.competitive_positioning = fields['Assessment Competitive Positioning'];
    if (fields['Assessment Completed Date']) assessmentData.completed_date = fields['Assessment Completed Date'];
    if (fields['Assessment Duration Minutes']) assessmentData.duration_minutes = Number(fields['Assessment Duration Minutes']) || 0;
    if (fields['Assessment Conversion Stage']) assessmentData.conversion_stage = fields['Assessment Conversion Stage'];
    if (fields['Assessment Source']) assessmentData.source = fields['Assessment Source'];
    if (fields['Assessment Browser']) assessmentData.browser = fields['Assessment Browser'];
    if (fields['Assessment User Agent']) assessmentData.user_agent = fields['Assessment User Agent'];
    
    // Parse JSON fields
    if (fields['Assessment Challenge Breakdown']) {
      assessmentData.challenge_breakdown = this.parseJsonField(fields['Assessment Challenge Breakdown']) || [];
    }
    if (fields['Assessment Urgency Factors']) {
      assessmentData.urgency_factors = this.parseJsonField(fields['Assessment Urgency Factors']) || [];
    }
    if (fields['Assessment Strategic Priorities']) {
      assessmentData.strategic_priorities = this.parseJsonField(fields['Assessment Strategic Priorities']) || [];
    }
    if (fields['Assessment Completion Context']) {
      assessmentData.completion_context = this.parseJsonField(fields['Assessment Completion Context']) || {};
    }
    
    return assessmentData;
  },

  // Store assessment results in Airtable
  async storeAssessmentResults(assessmentData: any, userInfo: any): Promise<AssessmentResult> {
    try {
      const assessmentRecord = {
        fields: {
          'Customer ID': userInfo.customerId || 'ASSESSMENT_USER',
          'Customer Name': userInfo.company || 'Assessment User',
          'Access Token': userInfo.accessToken || this.generateAccessToken(),
          'Assessment Overall Score': assessmentData.results?.overallScore || 0,
          'Assessment Performance Level': assessmentData.results?.performanceLevel || 'Foundation',
          'Assessment Buyer Score': assessmentData.results?.buyerScore || 0,
          'Assessment Tech Score': assessmentData.results?.techScore || 0,
          'Assessment Percentile': assessmentData.results?.percentile || 0,
          'Assessment Total Challenges': assessmentData.results?.totalChallenges || 0,
          'Assessment Critical Challenges': assessmentData.results?.criticalChallenges || 0,
          'Assessment High Priority Challenges': assessmentData.results?.highPriorityChallenges || 0,
          'Assessment Challenge Breakdown': JSON.stringify(assessmentData.results?.challengeBreakdown || []),
          'Assessment Primary Recommendation': assessmentData.results?.primaryRecommendation || '',
          'Assessment Recommendation Type': assessmentData.results?.recommendationType || 'foundation_building',
          'Assessment Focus Area': assessmentData.results?.focusArea || 'customer_analysis',
          'Assessment Urgency Factors': JSON.stringify(assessmentData.results?.urgencyFactors || []),
          'Assessment Strategic Priorities': JSON.stringify(assessmentData.results?.strategicPriorities || []),
          'Assessment Revenue Opportunity': assessmentData.results?.revenueOpportunity || 0,
          'Assessment ROI Multiplier': assessmentData.results?.roiMultiplier || 1.0,
          'Assessment Is High Priority': assessmentData.results?.isHighPriority || false,
          'Assessment Lead Priority': assessmentData.results?.leadPriority || 'standard',
          'Assessment Impact Timeline': assessmentData.results?.impactTimeline || 'medium_term',
          'Assessment Business Model': userInfo.businessModel || '',
          'Assessment Product Name': userInfo.productName || '',
          'Assessment Product Description': userInfo.productDescription || '',
          'Assessment Distinguishing Feature': userInfo.distinguishingFeature || '',
          'Assessment Competitive Positioning': userInfo.competitivePositioning || '',
          'Assessment Completed Date': new Date().toISOString(),
          'Assessment Duration Minutes': assessmentData.duration || 0,
          'Assessment Conversion Stage': 'assessment_completed',
          'Assessment Source': 'direct_assessment',
          'Assessment Browser': typeof window !== 'undefined' ? window.navigator.userAgent : '',
          'Assessment User Agent': typeof window !== 'undefined' ? window.navigator.userAgent : '',
          'Assessment Completion Context': JSON.stringify(assessmentData.completionContext || {}),
          'Created At': new Date().toISOString(),
          'Last Accessed': new Date().toISOString()
        }
      };

      const response: AxiosResponse<AirtableRecord> = await airtableClient.post('/Customer Assets', assessmentRecord);

      return {
        success: true,
        assessmentId: response.data.id,
        sessionId: assessmentData.sessionId
      };
    } catch (error) {
      console.error('Failed to store assessment results:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  // Sync generated resources to Airtable
  async syncGeneratedResourcesToAirtable(customerId: string, resources: Record<string, any>): Promise<SyncResult> {
    try {
      const updatedFields: string[] = [];
      
      // Map resources to Airtable fields
      const fieldsToUpdate: Record<string, any> = {};
      
      if (resources.icp_analysis) {
        fieldsToUpdate['ICP Content'] = JSON.stringify(resources.icp_analysis);
        updatedFields.push('ICP Content');
      }
      
      if (resources.buyer_personas) {
        fieldsToUpdate['Target Buyer Personas'] = JSON.stringify(resources.buyer_personas);
        updatedFields.push('Target Buyer Personas');
      }
      
      if (resources.empathy_map) {
        fieldsToUpdate['Detailed ICP Analysis'] = JSON.stringify(resources.empathy_map);
        updatedFields.push('Detailed ICP Analysis');
      }
      
      if (resources.product_assessment) {
        fieldsToUpdate['Product Assessment'] = JSON.stringify(resources.product_assessment);
        updatedFields.push('Product Assessment');
      }
      
      // Update the record
      const updateRecord = {
        fields: fieldsToUpdate
      };
      
      await airtableClient.patch(`/Customer Assets/${customerId}`, updateRecord);
      
      return {
        success: true,
        updatedFields
      };
    } catch (error) {
      console.error('Failed to sync resources to Airtable:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  // Generate access token
  generateAccessToken(): string {
    return `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // Default getters
  getDefaultWorkflowProgress(): WorkflowProgress {
    return { ...DEFAULT_WORKFLOW_PROGRESS };
  },

  getDefaultUserPreferences(): UserPreferences {
    return { ...DEFAULT_USER_PREFERENCES };
  },

  getDefaultUsageAnalytics(): UsageAnalytics {
    return { ...DEFAULT_USAGE_ANALYTICS };
  },

  getDefaultCompetencyProgress(): CompetencyProgress {
    return { ...DEFAULT_COMPETENCY_PROGRESS };
  },

  getDefaultToolAccessStatus(): ToolAccessStatus {
    return { ...DEFAULT_TOOL_ACCESS_STATUS };
  },

  getDefaultProfessionalMilestones(): ProfessionalMilestones {
    return { ...DEFAULT_PROFESSIONAL_MILESTONES };
  },

  getDefaultDailyObjectives(): DailyObjectives {
    return { ...DEFAULT_DAILY_OBJECTIVES };
  },

  getDefaultAssessmentData(): AssessmentData {
    return { ...DEFAULT_ASSESSMENT_DATA };
  },

  // Assessment analysis methods
  analyzePerformanceFromData(icpAnalysis: any, customerData: any): { level: string; isHighPriority: boolean; score: number } {
    const hasContent = icpAnalysis && Object.keys(icpAnalysis).length > 0;
    const score = hasContent ? 55 : 45;
    const level = score >= 70 ? 'Good' : score >= 55 ? 'Average' : 'Developing';
    
    return { level, isHighPriority: score < 40, score };
  },

  identifyChallengesFromData(icpAnalysis: any, customerData: any): { list: string[]; total: number; critical: number; highPriority: number } {
    const challenges: string[] = [];
    
    // Default challenges based on customer type
    if (customerData.customer_id === 'dru78DR9789SDF862' || customerData.customer_id === 'CUST_4') {
      challenges.push('Competitive Positioning Challenge');
    } else {
      challenges.push('Buyer Conversations Challenge', 'Technical Translation Challenge');
    }
    
    return {
      list: challenges,
      total: challenges.length,
      critical: challenges.length > 2 ? 1 : 0,
      highPriority: challenges.length
    };
  },

  generateStrategyFromData(challenges: { list: string[] }, performance: { score: number }): { focusArea: string; primaryRecommendation: string; recommendationType: string } {
    const focusAreas: Record<string, string> = {
      'Buyer Conversations Challenge': 'Buyer Psychology',
      'Technical Translation Challenge': 'Technical Translation',
      'Competitive Positioning Challenge': 'Competitive Positioning'
    };
    
    const primaryChallenge = challenges.list[0];
    const focusArea = focusAreas[primaryChallenge] || 'Technical Translation';
    
    return {
      focusArea,
      primaryRecommendation: `Focus on ${focusArea.toLowerCase()} development and systematic improvement`,
      recommendationType: performance.score < 50 ? 'systematic_development' : 'advanced_optimization'
    };
  },

  calculateRevenueOpportunity(performance: { score: number }, customerData: any): { opportunity: number; roiMultiplier: number; impactTimeline: string } {
    const baseOpportunity = (customerData.customer_id === 'dru78DR9789SDF862' || customerData.customer_id === 'CUST_4') ? 1200000 : 750000;
    const multiplier = performance.score / 50; // Scale based on performance
    
    return {
      opportunity: Math.round(baseOpportunity * multiplier),
      roiMultiplier: 3.0 + (performance.score / 100),
      impactTimeline: performance.score > 60 ? '3-6 months' : '6-12 months'
    };
  },

  calculateBuyerScore(icpAnalysis: any): number {
    // Simple heuristic - could be enhanced with real ICP analysis
    return icpAnalysis?.segments?.length > 0 ? 60 : 40;
  },

  calculateTechValueScore(customerData: any): number {
    // Simple heuristic based on content availability
    return customerData.cost_calculator_content ? 65 : 45;
  }
};
