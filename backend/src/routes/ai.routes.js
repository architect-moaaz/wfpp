const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');

// AI workflow generation
router.post('/generate-workflow', aiController.generateWorkflow);

// Get workflow components info (for RAG)
router.get('/components', aiController.getComponents);

// Get workflow patterns
router.get('/patterns', aiController.getPatterns);

module.exports = router;
