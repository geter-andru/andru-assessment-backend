import express from 'express';
import { AssessmentController } from '../controllers/assessmentController.js';

const router = express.Router();

// POST /api/assessment/start - Start a new assessment
router.post('/start', AssessmentController.startAssessment);

// POST /api/assessment/submit - Submit assessment results
router.post('/submit', AssessmentController.submitAssessment);

export default router;
