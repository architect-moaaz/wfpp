/**
 * Application Server
 * Main entry point for the generated application
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config');
const runtimeEngine = require('./runtime/engine');
const apiRoutes = require('./routes/api');
const uiRoutes = require('./routes/ui');

const executionLogsRoutes = require('./routes/execution-logs');
const database = require('./database');
const logger = require('./utils/logger');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '../public')));

app.use(bodyParser.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// API Routes
// UI Routes (must come before API routes to handle root path)
app.use('/', uiRoutes);

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
