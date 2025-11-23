const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflow.controller');

// Workflow CRUD operations
router.post('/', workflowController.createWorkflow);
router.get('/', workflowController.getAllWorkflows);
router.get('/:id', workflowController.getWorkflowById);
router.put('/:id', workflowController.updateWorkflow);
router.delete('/:id', workflowController.deleteWorkflow);

// Workflow export/import
router.post('/:id/export', workflowController.exportWorkflow);
router.post('/import', workflowController.importWorkflow);

// BPMN conversion
router.post('/:id/convert-to-bpmn', workflowController.convertToBPMN);

// Workflow validation
router.post('/:id/validate', workflowController.validateWorkflow);

module.exports = router;
