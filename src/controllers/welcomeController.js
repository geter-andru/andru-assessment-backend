import { logger } from '../utils/logger.js';
import { NotFoundError, ExternalServiceError } from '../middleware/errorHandler.js';

export class WelcomeController {
  static async getWelcomeData(req, res, next) {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        throw new Error('Session ID is required');
      }
      
      // Find assessment record by session ID
      const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(process.env.AIRTABLE_TABLE_NAME || 'Assessment Results')}?filterByFormula={Session ID}="${sessionId}"`;
      
      const response = await fetch(airtableUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new ExternalServiceError('Failed to fetch assessment data from Airtable', 'airtable');
      }
      
      const data = await response.json();
      
      if (!data.records || data.records.length === 0) {
        throw new NotFoundError('Assessment not found');
      }
      
      const record = data.records[0];
      const fields = record.fields;
      
      // Parse stored data
      const userInfo = fields['User Info'] ? JSON.parse(fields['User Info']) : null;
      const productInfo = fields['Product Info'] ? JSON.parse(fields['Product Info']) : null;
      const generatedContent = fields['Generated Content'] ? JSON.parse(fields['Generated Content']) : null;
      
      // Extract top challenge from assessment logic
      const getTopChallenge = (buyerScore, techScore, qualification) => {
        if (buyerScore < 50) return "Customer Discovery & Buyer Understanding";
        if (techScore < 50) return "Technical Value Translation";
        if (qualification === 'Developing') return "Revenue Execution Fundamentals";
        return "Advanced Revenue Scaling";
      };
      
      const topChallenge = getTopChallenge(
        fields['Buyer Score'] || 0, 
        fields['Tech Score'] || 0, 
        fields['Qualification'] || ''
      );
      
      // Check if user has Customer Assets record (paid user)
      let accessToken = null;
      try {
        const customerAssetsUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Customer%20Assets?filterByFormula={Session ID}="${sessionId}"`;
        
        const customerResponse = await fetch(customerAssetsUrl, {
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (customerResponse.ok) {
          const customerData = await customerResponse.json();
          if (customerData.records && customerData.records.length > 0) {
            accessToken = customerData.records[0].fields['Access Token'];
          }
        }
      } catch (error) {
        logger.info('Customer Assets lookup failed - user may not have paid yet', {
          sessionId,
          error: error.message
        });
      }
      
      const welcomeData = {
        sessionId,
        company: productInfo?.productName || userInfo?.company || '',
        qualification: fields['Qualification'] || '',
        overallScore: fields['Overall Score'] || 0,
        topChallenge,
        icpContent: generatedContent?.icp || null,
        tbpContent: generatedContent?.tbp || null,
        accessToken
      };
      
      logger.info('Welcome data retrieved successfully', {
        sessionId,
        company: welcomeData.company,
        qualification: welcomeData.qualification
      });
      
      res.json(welcomeData);
      
    } catch (error) {
      logger.error('Welcome API error', {
        sessionId: req.params.sessionId,
        error: error.message
      });
      
      next(error);
    }
  }
}
