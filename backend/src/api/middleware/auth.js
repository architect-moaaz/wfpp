/**
 * Authentication and Authorization Middleware
 * JWT-based authentication with RBAC support
 */

const AuthService = require('../../services/AuthService');

/**
 * Authenticate request using JWT token
 * Extracts token from Authorization header (Bearer scheme)
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check for Authorization header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'No valid authorization token provided'
      });
    }

    // Extract token
    const token = authHeader.substring(7);

    // Verify token and get user
    const user = await AuthService.verifyToken(token);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Token verification failed'
      });
    }

    // Attach user to request
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    console.error('[Auth] Authentication error:', error.message);

    // Handle specific JWT errors
    if (error.message === 'Token has expired') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'Please login again or refresh your token'
      });
    }

    if (error.message === 'Invalid token' || error.message === 'Session has been revoked') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: error.message
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: error.message
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token present
 * Useful for routes that work for both authenticated and anonymous users
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = await AuthService.verifyToken(token);
      req.user = user;
      req.token = token;
    }

    next();
  } catch (error) {
    // Continue without authentication on error
    console.warn('[Auth] Optional auth failed:', error.message);
    next();
  }
};

/**
 * Authorization middleware factory
 * Checks if user has required permission(s)
 *
 * @param {...string} requiredPermissions - Permissions to check (OR logic - any one is sufficient)
 * @returns {Function} Express middleware
 *
 * Usage:
 *   authorize('app:read')
 *   authorize('app:read', 'app:write')  // User needs either permission
 */
const authorize = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'You must be logged in to access this resource'
        });
      }

      // Get application context from request
      const applicationId = req.params.appId || req.params.applicationId || req.body?.applicationId;

      // Get user permissions (including application-specific ones)
      const userPermissions = await AuthService.getUserPermissions(req.user.id, applicationId);

      // Check if user has any of the required permissions
      const hasPermission = requiredPermissions.some(required => {
        // Superuser wildcard
        if (userPermissions.includes('*')) return true;

        // Exact match
        if (userPermissions.includes(required)) return true;

        // Resource wildcard match (e.g., "workflow:*" matches "workflow:read")
        const [resource] = required.split(':');
        if (userPermissions.includes(`${resource}:*`)) return true;

        return false;
      });

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: `Required permissions: ${requiredPermissions.join(' or ')}`,
          requiredPermissions
        });
      }

      next();
    } catch (error) {
      console.error('[Auth] Authorization error:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Authorization check failed',
        message: error.message
      });
    }
  };
};

/**
 * Authorization middleware for multiple required permissions (AND logic)
 * User must have ALL specified permissions
 *
 * @param {...string} requiredPermissions - All permissions required
 * @returns {Function} Express middleware
 */
const authorizeAll = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const applicationId = req.params.appId || req.params.applicationId || req.body?.applicationId;
      const userPermissions = await AuthService.getUserPermissions(req.user.id, applicationId);

      // Superuser bypass
      if (userPermissions.includes('*')) {
        return next();
      }

      // Check all required permissions
      const missingPermissions = requiredPermissions.filter(required => {
        if (userPermissions.includes(required)) return false;
        const [resource] = required.split(':');
        if (userPermissions.includes(`${resource}:*`)) return false;
        return true;
      });

      if (missingPermissions.length > 0) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: `Missing permissions: ${missingPermissions.join(', ')}`,
          missingPermissions
        });
      }

      next();
    } catch (error) {
      console.error('[Auth] Authorization error:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Authorization check failed',
        message: error.message
      });
    }
  };
};

/**
 * Role-based authorization middleware
 * Checks if user has any of the specified roles
 *
 * @param {...string} requiredRoles - Role names to check
 * @returns {Function} Express middleware
 */
const requireRole = (...requiredRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userRoles = req.user.roles || [];
      const hasRole = requiredRoles.some(role => userRoles.includes(role));

      if (!hasRole) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient role',
          message: `Required role: ${requiredRoles.join(' or ')}`,
          requiredRoles
        });
      }

      next();
    } catch (error) {
      console.error('[Auth] Role check error:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Role check failed',
        message: error.message
      });
    }
  };
};

/**
 * Resource ownership check middleware factory
 * Verifies user owns the resource or has admin permissions
 *
 * @param {Function} getOwnerId - Async function to get resource owner ID from request
 * @returns {Function} Express middleware
 */
const requireOwnership = (getOwnerId) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Admins bypass ownership check
      if (req.user.roles?.includes('Administrator')) {
        return next();
      }

      const ownerId = await getOwnerId(req);

      if (ownerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You do not have permission to access this resource'
        });
      }

      next();
    } catch (error) {
      console.error('[Auth] Ownership check error:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Ownership check failed',
        message: error.message
      });
    }
  };
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  authorizeAll,
  requireRole,
  requireOwnership
};
