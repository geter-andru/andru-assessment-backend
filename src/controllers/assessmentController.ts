import { validationService } from '../services/validation.js';
import { logger } from '../utils/logger.js';
import { ValidationError, ExternalServiceError } from '../middleware/errorHandler.js';
import { supabaseAssessmentService } from '../services/supabaseAssessmentService.js';

export class AssessmentController {
  // Start assessment endpoint
  static async startAssessment(req, res, next) {
    const startTime = Date.now();
    let sessionId;

    try {
      // Parse and validate request body
      const validatedData = validationService.validate(req.body, validationService.validateAssessmentStart.bind(validationService));
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
                'Assessment Started': validatedData.startTime
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

      const result = await airtableResponse.json() as { records: Array<{ id: string }> };

      // Also store in Supabase for notifications
      if (supabaseAssessmentService.isConfigured()) {
        try {
          logger.info('Storing started assessment in Supabase for notifications', {
            sessionId
          });

          const supabaseResult = await supabaseAssessmentService.storeStartedAssessment(
            validatedData.sessionId
          );

          if (supabaseResult.success) {
            logger.info('✅ Started assessment stored in Supabase', {
              sessionId,
              assessmentId: supabaseResult.assessmentId
            });
          } else {
            logger.warn('⚠️ Supabase storage for started assessment failed (non-fatal)', {
              sessionId,
              reason: supabaseResult.reason || supabaseResult.error
            });
          }
        } catch (supabaseError) {
          logger.error('⚠️ Supabase storage error for started assessment (non-fatal)', {
            sessionId,
            error: supabaseError instanceof Error ? supabaseError.message : 'Unknown error'
          });
        }
      }

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
      const validatedData = validationService.validate(req.body, validationService.validateAssessmentSubmission.bind(validationService));
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

      const result = await airtableResponse.json() as { records: Array<{ id: string }> };
      const duration = Date.now() - startTime;

      // Log successful completion
      logger.info('Assessment submitted successfully', {
        sessionId,
        recordId: result.records[0].id,
        duration,
        overallScore: validatedData.results.overallScore,
        qualification: validatedData.results.qualification
      });

      // ✅ DUAL STORAGE: Also store in Supabase for modern-platform integration
      // This is non-fatal - Airtable is primary source of truth
      if (supabaseAssessmentService.isConfigured()) {
        try {
          logger.info('Storing assessment in Supabase for platform integration', {
            sessionId,
            email: validatedData.userInfo?.email
          });

          const supabaseResult = await supabaseAssessmentService.storeCompletedAssessment(
            {
              sessionId: validatedData.sessionId,
              responses: validatedData.responses,
              results: validatedData.results,
              timestamp: validatedData.timestamp,
              productInfo: validatedData.productInfo,
              questionTimings: validatedData.questionTimings,
              generatedContent: validatedData.generatedContent
            },
            validatedData.userInfo || {}
          );

          if (supabaseResult.success) {
            logger.info('✅ Assessment stored in Supabase', {
              sessionId,
              assessmentId: supabaseResult.assessmentId,
              supabaseSessionId: supabaseResult.sessionId
            });
          } else {
            logger.warn('⚠️ Supabase storage failed (non-fatal)', {
              sessionId,
              reason: supabaseResult.reason || supabaseResult.error
            });
          }
        } catch (supabaseError) {
          // Non-fatal: Airtable is primary, Supabase is secondary
          logger.error('⚠️ Supabase storage error (non-fatal)', {
            sessionId,
            error: supabaseError instanceof Error ? supabaseError.message : 'Unknown error',
            stack: supabaseError instanceof Error ? supabaseError.stack : undefined
          });
        }
      } else {
        logger.info('Supabase not configured, skipping secondary storage', { sessionId });
      }

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

  // Generate assessment token for claiming
  static async generateToken(req, res, next) {
    const startTime = Date.now();
    let sessionId;

    try {
      // Validate request body
      const { sessionId: reqSessionId } = req.body;

      if (!reqSessionId) {
        throw new ValidationError('Session ID is required');
      }

      sessionId = reqSessionId;

      logger.info('Generating assessment token', {
        sessionId,
        clientIP: req.ip
      });

      // Generate token using supabase service
      const result = await supabaseAssessmentService.generateAssessmentToken(sessionId);

      if (!result.success) {
        if (result.error === 'assessment_not_found') {
          throw new ValidationError('Assessment not found');
        }
        if (result.error === 'already_claimed') {
          throw new ValidationError('Assessment already claimed');
        }
        throw new ExternalServiceError(result.error || 'Failed to generate token', 'supabase');
      }

      const duration = Date.now() - startTime;

      logger.info('Assessment token generated successfully', {
        sessionId,
        duration,
        service: 'assessment',
        operation: 'generate_token'
      });

      res.json({
        success: true,
        token: result.token,
        message: 'Assessment token generated successfully'
      });

    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Token generation failed', {
        sessionId,
        service: 'assessment',
        operation: 'generate_token',
        error: error.message,
        duration
      });

      next(error);
    }
  }

  // Claim assessment with token (requires authentication)
  static async claimAssessment(req, res, next) {
    const startTime = Date.now();
    let token;

    try {
      // User must be authenticated (req.user attached by auth middleware)
      if (!req.user) {
        throw new ValidationError('Authentication required');
      }

      // Validate request body
      const { token: reqToken } = req.body;

      if (!reqToken) {
        throw new ValidationError('Token is required');
      }

      token = reqToken;
      const userId = req.user.id;

      logger.info('Claiming assessment', {
        userId,
        userEmail: req.user.email,
        clientIP: req.ip
      });

      // Claim assessment using supabase service
      const result = await supabaseAssessmentService.claimAssessmentByToken(token, userId);

      if (!result.success) {
        if (result.error === 'invalid_or_expired_token') {
          throw new ValidationError('Invalid or expired token');
        }
        if (result.error === 'assessment_not_found') {
          throw new ValidationError('Assessment not found');
        }
        if (result.error === 'already_claimed') {
          throw new ValidationError('Assessment already claimed');
        }
        throw new ExternalServiceError(result.error || 'Failed to claim assessment', 'supabase');
      }

      const duration = Date.now() - startTime;

      logger.info('Assessment claimed successfully', {
        userId,
        userEmail: req.user.email,
        sessionId: result.assessment.session_id,
        duration,
        service: 'assessment',
        operation: 'claim'
      });

      res.json({
        success: true,
        assessment: result.assessment,
        message: 'Assessment claimed successfully'
      });

    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Assessment claim failed', {
        userId: req.user?.id,
        service: 'assessment',
        operation: 'claim',
        error: error.message,
        duration
      });

      next(error);
    }
  }
}
