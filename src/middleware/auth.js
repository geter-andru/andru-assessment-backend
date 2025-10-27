/**
 * Authentication Middleware
 * ========================
 * Validates Supabase JWT tokens and attaches user to request
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

// Initialize Supabase client with service role
const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);

/**
 * Middleware to require authentication
 * Validates JWT token from Authorization header
 * Attaches user object to req.user
 */
export const requireAuth = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Missing or invalid Authorization header', {
        path: req.path,
        ip: req.ip
      });
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing or invalid authorization token'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Validate token with Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn('Invalid or expired token', {
        path: req.path,
        ip: req.ip,
        error: error?.message
      });
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      metadata: user.user_metadata
    };

    logger.info('User authenticated', {
      userId: user.id,
      email: user.email,
      path: req.path
    });

    next();
  } catch (error) {
    logger.error('Authentication error', {
      error: error.message,
      path: req.path
    });
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
};

/**
 * Middleware to optionally authenticate
 * Attaches user if valid token provided, otherwise continues
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No auth provided, continue without user
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        metadata: user.user_metadata
      };
    }

    next();
  } catch (error) {
    // Log but don't fail the request
    logger.warn('Optional auth failed', {
      error: error.message,
      path: req.path
    });
    next();
  }
};

/**
 * Middleware to check if user has specific role
 */
export const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (req.user.role !== role) {
      logger.warn('Insufficient permissions', {
        userId: req.user.id,
        requiredRole: role,
        userRole: req.user.role,
        path: req.path
      });
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

export default {
  requireAuth,
  optionalAuth,
  requireRole
};
