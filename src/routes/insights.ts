/**
 * Insight Routes
 * Handles real-time insight generation endpoints
 *
 * Purpose: Provide REST API endpoints for AI-powered insights
 * Agent: Agent 1
 * Date: October 25, 2025
 */

import express from 'express';
import InsightController from '../controllers/insightController.js';

const router = express.Router();

/**
 * POST /api/insights/batch1
 * Generate insight for batch 1 (questions 1-4) - 25% completion
 *
 * Request body:
 * {
 *   sessionId: string,
 *   responses: Array<{ questionId, questionText, response }>,
 *   userInfo?: { company, productName, businessModel }
 * }
 */
router.post('/batch1', InsightController.generateBatch1Insight);

/**
 * POST /api/insights/batch2
 * Generate insight for batch 2 (questions 5-9) - 50% completion
 *
 * Request body:
 * {
 *   sessionId: string,
 *   responses: Array<{ questionId, questionText, response }>,
 *   previousInsights?: Array<Insight>,
 *   userInfo?: { company, productName, businessModel }
 * }
 */
router.post('/batch2', InsightController.generateBatch2Insight);

/**
 * POST /api/insights/batch3
 * Generate insight for batch 3 (questions 10-14) - 75% completion
 *
 * Request body:
 * {
 *   sessionId: string,
 *   responses: Array<{ questionId, questionText, response }>,
 *   previousInsights?: Array<Insight>,
 *   userInfo?: { company, productName, businessModel }
 * }
 */
router.post('/batch3', InsightController.generateBatch3Insight);

/**
 * GET /api/insights/session/:sessionId
 * Get all insights for a specific session
 *
 * Params:
 *   sessionId: string
 */
router.get('/session/:sessionId', InsightController.getSessionInsights);

export default router;
