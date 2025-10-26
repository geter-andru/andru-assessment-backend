/**
 * Insight Controller
 * Handles real-time insight generation during assessment
 *
 * Purpose: Provide AI-powered insights at 25%, 50%, 75% completion
 * Agent: Agent 1
 * Date: October 25, 2025
 */

import realTimeInsightService from '../services/realTimeInsightService.js';
import { logger } from '../utils/logger.js';

class InsightController {
  /**
   * Generate insight for batch 1 (questions 1-4)
   * Triggered at 25% assessment completion
   */
  static async generateBatch1Insight(req, res, next) {
    try {
      logger.info('Generating batch 1 insight', { sessionId: req.body.sessionId });

      const { responses, sessionId, userInfo } = req.body;

      // Validate required fields
      if (!responses || !Array.isArray(responses) || responses.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request: responses array is required'
        });
      }

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request: sessionId is required'
        });
      }

      // Validate response structure
      const validResponses = responses.every(r =>
        r.questionId &&
        r.questionText &&
        (typeof r.response === 'number' || typeof r.response === 'string')
      );

      if (!validResponses) {
        return res.status(400).json({
          success: false,
          error: 'Invalid response structure: each response must have questionId, questionText, and response'
        });
      }

      // Generate insight using real-time insight engine
      const startTime = Date.now();

      const insight = await realTimeInsightService.analyzeBatch1({
        responses,
        sessionId,
        userInfo: userInfo || {
          company: 'Unknown Company',
          productName: 'Unknown Product',
          businessModel: 'Unknown Model'
        }
      });

      const duration = Date.now() - startTime;

      logger.info('Batch 1 insight generated successfully', {
        sessionId,
        duration,
        confidence: insight.confidence
      });

      res.json({
        success: true,
        insight,
        metadata: {
          batchNumber: 1,
          questionRange: '1-4',
          generatedAt: new Date().toISOString(),
          processingTime: duration
        }
      });

    } catch (error) {
      logger.error('Error generating batch 1 insight', {
        error: error.message,
        stack: error.stack,
        sessionId: req.body.sessionId
      });

      next(error);
    }
  }

  /**
   * Generate insight for batch 2 (questions 5-9)
   * Triggered at 50% assessment completion
   */
  static async generateBatch2Insight(req, res, next) {
    try {
      logger.info('Generating batch 2 insight', { sessionId: req.body.sessionId });

      const { responses, sessionId, userInfo, previousInsights } = req.body;

      // Validate required fields
      if (!responses || !Array.isArray(responses) || responses.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request: responses array is required'
        });
      }

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request: sessionId is required'
        });
      }

      // Validate response structure
      const validResponses = responses.every(r =>
        r.questionId &&
        r.questionText &&
        (typeof r.response === 'number' || typeof r.response === 'string')
      );

      if (!validResponses) {
        return res.status(400).json({
          success: false,
          error: 'Invalid response structure: each response must have questionId, questionText, and response'
        });
      }

      // Generate insight using real-time insight engine
      const startTime = Date.now();

      const insight = await realTimeInsightService.analyzeBatch2({
        responses,
        sessionId,
        previousInsights: previousInsights || [],
        userInfo: userInfo || {
          company: 'Unknown Company',
          productName: 'Unknown Product',
          businessModel: 'Unknown Model'
        }
      });

      const duration = Date.now() - startTime;

      logger.info('Batch 2 insight generated successfully', {
        sessionId,
        duration,
        confidence: insight.confidence,
        hasPreviousInsights: !!previousInsights && previousInsights.length > 0
      });

      res.json({
        success: true,
        insight,
        metadata: {
          batchNumber: 2,
          questionRange: '5-9',
          generatedAt: new Date().toISOString(),
          processingTime: duration,
          contextualContinuity: !!previousInsights && previousInsights.length > 0
        }
      });

    } catch (error) {
      logger.error('Error generating batch 2 insight', {
        error: error.message,
        stack: error.stack,
        sessionId: req.body.sessionId
      });

      next(error);
    }
  }

  /**
   * Generate insight for batch 3 (questions 10-14)
   * Triggered at 75% assessment completion
   */
  static async generateBatch3Insight(req, res, next) {
    try {
      logger.info('Generating batch 3 insight', { sessionId: req.body.sessionId });

      const { responses, sessionId, userInfo, previousInsights } = req.body;

      // Validate required fields
      if (!responses || !Array.isArray(responses) || responses.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request: responses array is required'
        });
      }

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request: sessionId is required'
        });
      }

      // Validate response structure
      const validResponses = responses.every(r =>
        r.questionId &&
        r.questionText &&
        (typeof r.response === 'number' || typeof r.response === 'string')
      );

      if (!validResponses) {
        return res.status(400).json({
          success: false,
          error: 'Invalid response structure: each response must have questionId, questionText, and response'
        });
      }

      // Generate insight using real-time insight engine
      const startTime = Date.now();

      const insight = await realTimeInsightService.analyzeBatch3({
        responses,
        sessionId,
        previousInsights: previousInsights || [],
        userInfo: userInfo || {
          company: 'Unknown Company',
          productName: 'Unknown Product',
          businessModel: 'Unknown Model'
        }
      });

      const duration = Date.now() - startTime;

      logger.info('Batch 3 insight generated successfully', {
        sessionId,
        duration,
        confidence: insight.confidence,
        hasPreviousInsights: !!previousInsights && previousInsights.length > 0
      });

      res.json({
        success: true,
        insight,
        metadata: {
          batchNumber: 3,
          questionRange: '10-14',
          generatedAt: new Date().toISOString(),
          processingTime: duration,
          contextualContinuity: !!previousInsights && previousInsights.length > 0
        }
      });

    } catch (error) {
      logger.error('Error generating batch 3 insight', {
        error: error.message,
        stack: error.stack,
        sessionId: req.body.sessionId
      });

      next(error);
    }
  }

  /**
   * Get all insights for a session
   * Used for displaying insight history
   */
  static async getSessionInsights(req, res, next) {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request: sessionId is required'
        });
      }

      logger.info('Retrieving session insights', { sessionId });

      const insights = await realTimeInsightService.getInsightsForSession(sessionId);

      res.json({
        success: true,
        insights,
        count: insights.length
      });

    } catch (error) {
      logger.error('Error retrieving session insights', {
        error: error.message,
        stack: error.stack,
        sessionId: req.params.sessionId
      });

      next(error);
    }
  }
}

export default InsightController;
