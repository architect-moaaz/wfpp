/**
 * Authentication middleware
 * In production, this should verify JWT tokens or session cookies
 */

const authenticate = (req, res, next) => {
  // Mock authentication - in production, verify token/session
  req.user = {
    id: 'user-123',
    email: 'user@example.com',
    tier: 'free'
  };

  next();
};

module.exports = { authenticate };
