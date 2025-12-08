/**
 * Validation middleware for publish requests
 */

const validatePublishRequest = (req, res, next) => {
  const { platform, environmentVars } = req.body;

  const errors = [];

  // Validate platform
  const validPlatforms = ['vercel', 'railway', 'render'];
  if (platform && !validPlatforms.includes(platform)) {
    errors.push(`Invalid platform. Must be one of: ${validPlatforms.join(', ')}`);
  }

  // Validate environment variables
  if (environmentVars && typeof environmentVars !== 'object') {
    errors.push('Environment variables must be an object');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

module.exports = { validatePublishRequest };
