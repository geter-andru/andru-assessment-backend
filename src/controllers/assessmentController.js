import { validationService } from '../services/validation.js';
import { logger } from '../utils/logger.js';
import { ValidationError, ExternalServiceError } from '../middleware/errorHandler.js';

export class AssessmentController {
  // Start assessment endpoint
  static async startAssessment(req, res, next) {
    const startTime = Date.now();
    let sessionId;

    try {
      // Parse and validate request body
      const validatedData = validationService.validate(req.body, validationService.validateAssessmentStart);
      sessionId = validatedData.sessionId;

      // Log assessment start
      logger.info('Assessment started', {
        sessionId,
        startTime: validatedData.startTime,
        clientIP: req.ip
      });

      // Create initial assessment record with session ID
      const airtableResponse = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [
            {
              fields: {
                'Session ID': validatedData.sessionId,
                'Assessment Started': validatedData.startTime,
                'Status': 'In Progress'
              },
            },
          ],
        }),
      });

      if (!airtableResponse.ok) {
        const error = await airtableResponse.text();
        logger.error('Airtable API error', {
          sessionId,
          service: 'airtable',
          operation: 'create_session',
          error
        });
        throw new ExternalServiceError('Failed to create session record', 'airtable');
      }

      const result = await airtableResponse.json();
      const duration = Date.now() - startTime;

      // Log successful completion
      logger.info('Assessment started successfully', {
        sessionId,
        recordId: result.records[0].id,
        duration
      });
      
      res.json({ 
        success: true, 
        sessionId: validatedData.sessionId,
        recordId: result.records[0].id 
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Assessment start failed', {
        sessionId,
        service: 'assessment',
        operation: 'start',
        error: error.message,
        duration
      });

      next(error);
    }
  }

  // Submit assessment endpoint
  static async submitAssessment(req, res, next) {
    const startTime = Date.now();
    let sessionId;

    try {
      // Parse and validate request body
      const validatedData = validationService.validate(req.body, validationService.validateAssessmentSubmission);
      sessionId = validatedData.sessionId;

      // Log assessment submission start
      logger.info('Assessment submission started', {
        sessionId,
        timestamp: validatedData.timestamp,
        clientIP: req.ip,
        hasUserInfo: !!validatedData.userInfo,
        hasProductInfo: !!validatedData.productInfo,
        overallScore: validatedData.results.overallScore
      });

      // Prepare Airtable submission data
      const airtableData = {
        records: [
          {
            fields: {
              'Session ID': validatedData.sessionId,
              'Overall Score': validatedData.results.overallScore,
              'Buyer Score': validatedData.results.buyerScore,
              'Tech Score': validatedData.results.techScore,
              'Qualification': validatedData.results.qualification,
              'Responses': JSON.stringify(validatedData.responses),
              'Timestamp': validatedData.timestamp,
              'User Info': validatedData.userInfo ? JSON.stringify(validatedData.userInfo) : null,
              'Product Info': validatedData.productInfo ? JSON.stringify(validatedData.productInfo) : null,
              'Question Timings': validatedData.questionTimings ? JSON.stringify(validatedData.questionTimings) : null,
              'Generated Content': validatedData.generatedContent ? JSON.stringify(validatedData.generatedContent) : null,
              'Status': 'Completed'
            },
          },
        ],
      };

      // Submit to Airtable
      const airtableResponse = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(airtableData),
      });

      if (!airtableResponse.ok) {
        const error = await airtableResponse.text();
        logger.error('Airtable API error', {
          sessionId,
          service: 'airtable',
          operation: 'submit_assessment',
          error
        });
        throw new ExternalServiceError('Failed to submit assessment to Airtable', 'airtable');
      }

      const result = await airtableResponse.json();
      const duration = Date.now() - startTime;

      // Log successful completion
      logger.info('Assessment submitted successfully', {
        sessionId,
        recordId: result.records[0].id,
        duration,
        overallScore: validatedData.results.overallScore,
        qualification: validatedData.results.qualification
      });
      
      res.json({ 
        success: true, 
        recordId: result.records[0].id,
        sessionId: validatedData.sessionId
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Assessment submission failed', {
        sessionId,
        service: 'assessment',
        operation: 'submit',
        error: error.message,
        duration
      });

      next(error);
    }
  }
}
