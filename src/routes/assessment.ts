import express from 'express';
import { AssessmentController } from '../controllers/assessmentController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// POST /api/assessment/start - Start a new assessment
router.post('/start', AssessmentController.startAssessment);

// POST /api/assessment/submit - Submit assessment results
router.post('/submit', AssessmentController.submitAssessment);

// POST /api/assessment/generate-token - Generate token for assessment claiming (no auth required)
router.post('/generate-token', AssessmentController.generateToken);

// POST /api/assessment/claim - Claim assessment with token (requires authentication)
router.post('/claim', requireAuth, AssessmentController.claimAssessment);

export default router;
