import express from 'express';
import { WelcomeController } from '../controllers/welcomeController.js';

const router = express.Router();

// GET /api/welcome/:sessionId - Get welcome data by session ID
router.get('/:sessionId', WelcomeController.getWelcomeData);

export default router;
