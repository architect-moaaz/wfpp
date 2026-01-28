/**
 * Application Server
 * Main entry point for the generated application
 * Supports SSR hybrid rendering for optimal initial load
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const config = require('./config');
const runtimeEngine = require('./runtime/engine');
const apiRoutes = require('./routes/api');
const executionLogsRoutes = require('./routes/execution-logs');
const database = require('./database');
const logger = require('./utils/logger');

// SSR modules
const pageDataService = require('./ssr/PageDataService');
const htmlRenderer = require('./ssr/HtmlRenderer');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// API Routes (must come before static/SSR routes)
app.use('/api', apiRoutes);
app.use('/api/execution-logs', executionLogsRoutes);

// Serve static files from frontend build
const frontendBuildPath = path.join(__dirname, '../frontend/build');
app.use(express.static(frontendBuildPath, {
  // Don't serve index.html for static - we'll handle it with SSR
  index: false
}));

// SSR middleware for page routes
const ssrHandler = async (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api')) {
    return next();
  }

  // Skip static assets
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)$/)) {
    return next();
  }

  try {
    logger.info(`SSR rendering: ${req.path}`);

    // Get initial state for this route
    const db = config.database.enabled ? database : null;
    const initialState = await pageDataService.getInitialState(req.path, db);

    // Render HTML with initial state
    const html = htmlRenderer.render(initialState);

    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('SSR Error:', error);
    // Fall back to serving static index.html
    res.sendFile(path.join(frontendBuildPath, 'index.html'), (err) => {
      if (err) {
        res.status(500).send('Error loading application');
      }
    });
  }
};

// Apply SSR to all page routes
app.get('*', ssrHandler);

// Error handling
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message
  });
});

// Initialize and start server
async function start() {
  try {
    logger.info('Starting application...');

    // Initialize database
    if (config.database.enabled) {
      await database.initialize();
      logger.info('Database initialized');
    }

    // Initialize runtime engine
    await runtimeEngine.initialize();
    logger.info('Runtime engine initialized');

    // Start server
    const PORT = config.server.port;
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/api/health`);
      logger.info(`API docs: http://localhost:${PORT}/api/workflows`);
      logger.info(`Execution logs: http://localhost:${PORT}/api/execution-logs/statistics`);
    });
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the application
start();
