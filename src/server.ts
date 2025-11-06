// Load environment variables FIRST - ES module compatible approach
import dotenv from 'dotenv';
dotenv.config();

// CRITICAL: All route imports must come AFTER dotenv.config()
// Dynamic imports prevent hoisting
const express = (await import('express')).default;
const cors = (await import('cors')).default;
const helmet = (await import('helmet')).default;
const compression = (await import('compression')).default;
const morgan = (await import('morgan')).default;
const rateLimit = (await import('express-rate-limit')).default;
await import('express-async-errors');

// Import routes AFTER dotenv is loaded
const assessmentRoutes = (await import('./routes/assessment.js')).default;
const healthRoutes = (await import('./routes/health.js')).default;
const welcomeRoutes = (await import('./routes/welcome.js')).default;
const insightRoutes = (await import('./routes/insights.js')).default;

// Import middleware
const errorHandler = (await import('./middleware/errorHandler.js')).default;
const { logger } = await import('./utils/logger.js');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration - Allow both www and non-www variants
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'https://andru-ai.com',
  'https://www.andru-ai.com',
  'http://localhost:3002'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list (with or without trailing slash)
    const originWithoutSlash = origin.replace(/\/$/, '');
    const isAllowed = allowedOrigins.some(allowed =>
      allowed.replace(/\/$/, '') === originWithoutSlash
    );

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/assessment', assessmentRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/welcome', welcomeRoutes);
app.use('/api/insights', insightRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Andru Assessment API',
    version: '1.0.0',
    status: 'running'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Andru Assessment API server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;
