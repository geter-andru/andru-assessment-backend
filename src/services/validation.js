// Comprehensive input validation service
// =====================================

import { ValidationError } from '../middleware/errorHandler.js';

// Basic validation schemas without external dependencies
// =====================================================

export class ValidationService {
  constructor() {}

  // Session ID validation
  validateSessionId(sessionId) {
    if (!sessionId || typeof sessionId !== 'string') {
      return {
        success: false,
        errors: ['Session ID is required and must be a string']
      };
    }

    if (sessionId.length < 10 || sessionId.length > 100) {
      return {
        success: false,
        errors: ['Session ID must be between 10 and 100 characters']
      };
    }

    // Check for valid characters (alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
      return {
        success: false,
        errors: ['Session ID can only contain letters, numbers, hyphens, and underscores']
      };
    }

    return {
      success: true,
      data: sessionId
    };
  }

  // ISO Date validation
  validateISODate(dateString) {
    if (!dateString || typeof dateString !== 'string') {
      return {
        success: false,
        errors: ['Date is required and must be a string']
      };
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return {
        success: false,
        errors: ['Invalid date format. Expected ISO 8601 format']
      };
    }

    // Check if it's a valid ISO string
    if (date.toISOString() !== dateString) {
      return {
        success: false,
        errors: ['Date must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)']
      };
    }

    return {
      success: true,
      data: dateString
    };
  }

  // Email validation
  validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return {
        success: false,
        errors: ['Email is required and must be a string']
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        errors: ['Invalid email format']
      };
    }

    if (email.length > 254) {
      return {
        success: false,
        errors: ['Email must be less than 254 characters']
      };
    }

    return {
      success: true,
      data: email.toLowerCase().trim()
    };
  }

  // Score validation (0-100)
  validateScore(score, fieldName = 'Score') {
    if (typeof score !== 'number') {
      return {
        success: false,
        errors: [`${fieldName} must be a number`]
      };
    }

    if (score < 0 || score > 100) {
      return {
        success: false,
        errors: [`${fieldName} must be between 0 and 100`]
      };
    }

    if (!Number.isInteger(score)) {
      return {
        success: false,
        errors: [`${fieldName} must be an integer`]
      };
    }

    return {
      success: true,
      data: score
    };
  }

  // String validation with length limits
  validateString(value, fieldName, minLength = 1, maxLength = 1000) {
    if (!value || typeof value !== 'string') {
      return {
        success: false,
        errors: [`${fieldName} is required and must be a string`]
      };
    }

    const trimmed = value.trim();
    if (trimmed.length < minLength) {
      return {
        success: false,
        errors: [`${fieldName} must be at least ${minLength} characters long`]
      };
    }

    if (trimmed.length > maxLength) {
      return {
        success: false,
        errors: [`${fieldName} must be less than ${maxLength} characters long`]
      };
    }

    return {
      success: true,
      data: trimmed
    };
  }

  // Object validation
  validateObject(value, fieldName) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {
        success: false,
        errors: [`${fieldName} must be an object`]
      };
    }

    return {
      success: true,
      data: value
    };
  }

  // Assessment Start Request Validation
  validateAssessmentStart(data) {
    const errors = [];

    // Validate sessionId
    const sessionIdResult = this.validateSessionId(data?.sessionId);
    if (!sessionIdResult.success) {
      errors.push(...(sessionIdResult.errors || []));
    }

    // Validate startTime
    const startTimeResult = this.validateISODate(data?.startTime);
    if (!startTimeResult.success) {
      errors.push(...(startTimeResult.errors || []));
    }

    if (errors.length > 0) {
      return {
        success: false,
        errors
      };
    }

    return {
      success: true,
      data: {
        sessionId: sessionIdResult.data,
        startTime: startTimeResult.data
      }
    };
  }

  // User Info Validation
  validateUserInfo(userInfo) {
    if (!userInfo) {
      return {
        success: false,
        errors: ['User info is required']
      };
    }

    const errors = [];

    // Validate email (required)
    const emailResult = this.validateEmail(userInfo.email);
    if (!emailResult.success) {
      errors.push(...(emailResult.errors || []));
    }

    // Validate company (required)
    const companyResult = this.validateString(userInfo.company, 'Company', 1, 200);
    if (!companyResult.success) {
      errors.push(...(companyResult.errors || []));
    }

    // Validate name (optional)
    let name;
    if (userInfo.name) {
      const nameResult = this.validateString(userInfo.name, 'Name', 1, 100);
      if (!nameResult.success) {
        errors.push(...(nameResult.errors || []));
      } else {
        name = nameResult.data;
      }
    }

    // Validate role (optional)
    let role;
    if (userInfo.role) {
      const roleResult = this.validateString(userInfo.role, 'Role', 1, 100);
      if (!roleResult.success) {
        errors.push(...(roleResult.errors || []));
      } else {
        role = roleResult.data;
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        errors
      };
    }

    return {
      success: true,
      data: {
        name,
        email: emailResult.data,
        company: companyResult.data,
        role
      }
    };
  }

  // Product Info Validation
  validateProductInfo(productInfo) {
    if (!productInfo) {
      return {
        success: false,
        errors: ['Product info is required']
      };
    }

    const errors = [];

    // Validate all required fields
    const fields = [
      { key: 'productName', name: 'Product Name', maxLength: 200 },
      { key: 'productDescription', name: 'Product Description', maxLength: 1000 },
      { key: 'keyFeatures', name: 'Key Features', maxLength: 1000 },
      { key: 'idealCustomerDescription', name: 'Ideal Customer Description', maxLength: 1000 },
      { key: 'businessModel', name: 'Business Model', maxLength: 500 },
      { key: 'customerCount', name: 'Customer Count', maxLength: 100 },
      { key: 'distinguishingFeature', name: 'Distinguishing Feature', maxLength: 500 }
    ];

    const validatedData = {};

    for (const field of fields) {
      const result = this.validateString(productInfo[field.key], field.name, 1, field.maxLength);
      if (!result.success) {
        errors.push(...(result.errors || []));
      } else {
        validatedData[field.key] = result.data;
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        errors
      };
    }

    return {
      success: true,
      data: validatedData
    };
  }

  // Assessment Results Validation
  validateAssessmentResults(results) {
    if (!results) {
      return {
        success: false,
        errors: ['Assessment results are required']
      };
    }

    const errors = [];

    // Validate scores
    const buyerScoreResult = this.validateScore(results.buyerScore, 'Buyer Score');
    if (!buyerScoreResult.success) {
      errors.push(...(buyerScoreResult.errors || []));
    }

    const techScoreResult = this.validateScore(results.techScore, 'Tech Score');
    if (!techScoreResult.success) {
      errors.push(...(techScoreResult.errors || []));
    }

    const overallScoreResult = this.validateScore(results.overallScore, 'Overall Score');
    if (!overallScoreResult.success) {
      errors.push(...(overallScoreResult.errors || []));
    }

    // Validate qualification
    const qualificationResult = this.validateString(results.qualification, 'Qualification', 1, 100);
    if (!qualificationResult.success) {
      errors.push(...(qualificationResult.errors || []));
    }

    if (errors.length > 0) {
      return {
        success: false,
        errors
      };
    }

    return {
      success: true,
      data: {
        buyerScore: buyerScoreResult.data,
        techScore: techScoreResult.data,
        overallScore: overallScoreResult.data,
        qualification: qualificationResult.data
      }
    };
  }

  // Assessment Submission Validation
  validateAssessmentSubmission(data) {
    const errors = [];

    // Validate sessionId
    const sessionIdResult = this.validateSessionId(data?.sessionId);
    if (!sessionIdResult.success) {
      errors.push(...(sessionIdResult.errors || []));
    }

    // Validate timestamp
    const timestampResult = this.validateISODate(data?.timestamp);
    if (!timestampResult.success) {
      errors.push(...(timestampResult.errors || []));
    }

    // Validate responses
    const responsesResult = this.validateObject(data?.responses, 'Responses');
    if (!responsesResult.success) {
      errors.push(...(responsesResult.errors || []));
    }

    // Validate results
    const resultsResult = this.validateAssessmentResults(data?.results);
    if (!resultsResult.success) {
      errors.push(...(resultsResult.errors || []));
    }

    // Validate optional userInfo
    let userInfo;
    if (data?.userInfo) {
      const userInfoResult = this.validateUserInfo(data.userInfo);
      if (!userInfoResult.success) {
        errors.push(...(userInfoResult.errors || []));
      } else {
        userInfo = userInfoResult.data;
      }
    }

    // Validate optional productInfo
    let productInfo;
    if (data?.productInfo) {
      const productInfoResult = this.validateProductInfo(data.productInfo);
      if (!productInfoResult.success) {
        errors.push(...(productInfoResult.errors || []));
      } else {
        productInfo = productInfoResult.data;
      }
    }

    // Validate optional questionTimings
    let questionTimings;
    if (data?.questionTimings) {
      const questionTimingsResult = this.validateObject(data.questionTimings, 'Question Timings');
      if (!questionTimingsResult.success) {
        errors.push(...(questionTimingsResult.errors || []));
      } else {
        questionTimings = questionTimingsResult.data;
      }
    }

    // Validate optional generatedContent
    let generatedContent;
    if (data?.generatedContent) {
      const generatedContentResult = this.validateObject(data.generatedContent, 'Generated Content');
      if (!generatedContentResult.success) {
        errors.push(...(generatedContentResult.errors || []));
      } else {
        generatedContent = generatedContentResult.data;
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        errors
      };
    }

    return {
      success: true,
      data: {
        sessionId: sessionIdResult.data,
        responses: responsesResult.data,
        results: resultsResult.data,
        timestamp: timestampResult.data,
        userInfo,
        productInfo,
        questionTimings,
        generatedContent
      }
    };
  }

  // Generic validation wrapper
  validate(data, validator) {
    const result = validator(data);
    if (!result.success) {
      throw new ValidationError(
        `Validation failed: ${result.errors?.join(', ')}`
      );
    }
    return result.data;
  }
}

// Export singleton instance
export const validationService = new ValidationService();
