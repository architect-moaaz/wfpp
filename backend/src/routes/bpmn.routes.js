/**
 * BPMN Conversion Routes
 * API endpoints for workflow JSON to BPMN 2.0 conversion
 */

const express = require('express');
const router = express.Router();
const bpmnConversionService = require('../services/bpmn-conversion-service');

/**
 * POST /api/bpmn/convert
 * Convert workflow JSON to BPMN 2.0 XML
 */
router.post('/convert', async (req, res) => {
  try {
    const workflowJSON = req.body;

    console.log('[BPMN API] Received conversion request for:', workflowJSON.name || 'Untitled');

    // Convert using multi-agent system
    const result = await bpmnConversionService.convertToBPMN(workflowJSON);

    if (result.success) {
      res.status(200).json({
        success: true,
        bpmnXML: result.bpmnXML,
        validationResults: result.validationResults,
        stages: result.stages,
        executionLog: result.executionLog
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        executionLog: result.executionLog
      });
    }

  } catch (error) {
    console.error('[BPMN API] Conversion error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/bpmn/health
 * Health check for BPMN conversion service
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'BPMN Conversion Service is running',
    agents: [
      'WorkflowParser',
      'BPMNGenerator',
      'Validation',
      'KIECompatibility',
      'BPMNioCompatibility'
    ]
  });
});

module.exports = router;
