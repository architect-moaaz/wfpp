const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const { Server } = require('socket.io');
require('dotenv').config();

const workflowRoutes = require('./routes/workflow.routes');
const aiRoutes = require('./routes/ai.routes');
const bpmnRoutes = require('./routes/bpmn.routes');
const runtimeRoutes = require('./routes/runtime.routes');
const formRoutes = require('./routes/form.routes');
const dataModelRoutes = require('./routes/datamodel.routes');
const pageRoutes = require('./routes/page.routes');
const productionRoutes = require('./routes/production.routes');
const versionRoutes = require('./routes/version.routes');
const applicationRoutes = require('./routes/applications');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"],
    methods: ["GET", "POST"],
    credentials: true
  },
  maxHttpBufferSize: 200 * 1024 * 1024, // 200 MB to support large design files
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000 // 25 seconds
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // Increase limit for large workflows
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Workflow API is running' });
});

// API Routes
app.use('/api/workflows', workflowRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/bpmn', bpmnRoutes);
app.use('/api/runtime', runtimeRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/datamodels', dataModelRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/versions', versionRoutes);
app.use('/api/applications', applicationRoutes);

// Initialize Event Manager for real-time workflow monitoring
const eventManager = require('./runtime/EventManager');
eventManager.setSocketIO(io);

// WebSocket connection handling
const aiWorkflowGenerator = require('./services/ai-workflow-generator');

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Subscribe to workflow instance
  socket.on('subscribe:instance', (instanceId) => {
    socket.join(`instance:${instanceId}`);
    console.log(`Client ${socket.id} subscribed to instance: ${instanceId}`);

    // Send event history
    const history = eventManager.getHistory(instanceId, { limit: 50 });
    socket.emit('event.history', history);
  });

  // Unsubscribe from workflow instance
  socket.on('unsubscribe:instance', (instanceId) => {
    socket.leave(`instance:${instanceId}`);
    console.log(`Client ${socket.id} unsubscribed from instance: ${instanceId}`);
  });

  // Subscribe to specific event types
  socket.on('subscribe:eventType', (eventType) => {
    socket.join(`event:${eventType}`);
    console.log(`Client ${socket.id} subscribed to event type: ${eventType}`);
  });

  // Get event statistics
  socket.on('get:stats', () => {
    const stats = eventManager.getStats();
    socket.emit('event.stats', stats);
  });

  // Replay events
  socket.on('replay:events', ({ instanceId, options }) => {
    const count = eventManager.replayEvents(instanceId, options);
    socket.emit('replay.complete', { instanceId, count });
  });

  socket.on('generate-workflow', async (data) => {
    const { requirements, applicationId, existingWorkflow, conversationHistory, designInput } = data;

    console.log('[WebSocket] generate-workflow received:', {
      requirements: requirements?.substring(0, 50) + '...',
      applicationId: applicationId || 'none',
      hasExistingWorkflow: !!existingWorkflow,
      hasDesignInput: !!designInput,
      designType: designInput?.type,
      designName: designInput?.name
    });

    try {
      // Generate workflow with real-time updates
      await aiWorkflowGenerator.generateWorkflowStream(requirements, (event) => {
        socket.emit(event.type, event.data);
      }, existingWorkflow, conversationHistory, designInput, applicationId);
    } catch (error) {
      console.error('[WebSocket] generate-workflow error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Generate complete application with all components
  socket.on('generate-application', async (data) => {
    const { requirements, conversationHistory, designInput } = data;

    console.log('[WebSocket] generate-application received:', {
      requirements: requirements?.substring(0, 50) + '...',
      hasDesignInput: !!designInput,
      designType: designInput?.type,
      designName: designInput?.name
    });

    try {
      const aiApplicationGenerator = require('./services/ai-application-generator');

      // Generate application with real-time progress updates
      await aiApplicationGenerator.generateApplicationStream(requirements, (event) => {
        socket.emit(event.type, event.data);
      }, conversationHistory, designInput);
    } catch (error) {
      console.error('[WebSocket] generate-application error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`WebSocket server ready`);
});

module.exports = { app, server, io };
