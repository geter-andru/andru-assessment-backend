import express from 'express';
import { HealthController } from '../controllers/healthController.js';

const router = express.Router();

// GET /api/health - Health check endpoint
router.get('/', HealthController.getHealth);

export default router;
