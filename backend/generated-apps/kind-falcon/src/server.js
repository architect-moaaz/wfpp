/**
 * Application Server
 * Main entry point for the generated application
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config');
const runtimeEngine = require('./runtime/engine');
const apiRoutes = require('./routes/api');
const executionLogsRoutes = require('./routes/execution-logs');
const database = require('./database');
const logger = require('./utils/logger');

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

// Root route - Application info
app.get('/', (req, res) => {
  res.json({
    name: 'kind_falcon',
    description: 'AI-generated application via ARES',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      workflows: '/api/workflows',
      forms: '/api/forms',
      data: '/api/data'
    },
    documentation: 'Access the API endpoints above for full functionality'
  });
});

// API Routes
app.use('/api', apiRoutes);
app.use('/api/execution-logs', executionLogsRoutes);

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
