import { logger } from '../utils/logger.js';

export class HealthController {
  static async getHealth(req, res, next) {
    const startTime = Date.now();
    
    try {
      // Basic health check
      const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime(),
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          external: process.memoryUsage().external
        },
        environment: process.env.NODE_ENV || 'development'
      };

      const responseTime = Date.now() - startTime;
      healthStatus.responseTime = responseTime;
      
      // Log health check
      logger.info('Health check performed', {
        service: 'health-check',
        responseTime,
        status: healthStatus.status
      });
      
      res.json(healthStatus);
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      logger.error('Health check failed', {
        service: 'health-check',
        responseTime,
        error: error.message
      });
      
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime,
        error: error.message
      });
    }
  }
}
