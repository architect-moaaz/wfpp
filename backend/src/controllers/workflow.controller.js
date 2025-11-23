const { v4: uuidv4 } = require('uuid');
const bpmnConverter = require('../utils/bpmn-converter');
const WorkflowValidator = require('../services/validation/WorkflowValidator');

// In-memory storage (replace with database later)
let workflows = [];

// Create a new workflow
const createWorkflow = (req, res) => {
  try {
    const { name, nodes, connections, metadata } = req.body;

    const workflow = {
      id: uuidv4(),
      name: name || 'Untitled Workflow',
      version: '1.0',
      nodes: nodes || [],
      connections: connections || [],
      metadata: {
        ...metadata,
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      }
    };

    workflows.push(workflow);

    res.status(201).json({
      success: true,
      data: workflow,
      message: 'Workflow created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get all workflows
const getAllWorkflows = (req, res) => {
  try {
    res.status(200).json({
      success: true,
      count: workflows.length,
      data: workflows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get workflow by ID
const getWorkflowById = (req, res) => {
  try {
    const { id } = req.params;
    const workflow = workflows.find(w => w.id === id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found'
      });
    }

    res.status(200).json({
      success: true,
      data: workflow
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update workflow
const updateWorkflow = (req, res) => {
  try {
    const { id } = req.params;
    const { name, nodes, connections, metadata } = req.body;

    const workflowIndex = workflows.findIndex(w => w.id === id);

    if (workflowIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found'
      });
    }

    workflows[workflowIndex] = {
      ...workflows[workflowIndex],
      name: name || workflows[workflowIndex].name,
      nodes: nodes || workflows[workflowIndex].nodes,
      connections: connections || workflows[workflowIndex].connections,
      metadata: {
        ...workflows[workflowIndex].metadata,
        ...metadata,
        modified: new Date().toISOString()
      }
    };

    res.status(200).json({
      success: true,
      data: workflows[workflowIndex],
      message: 'Workflow updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete workflow
const deleteWorkflow = (req, res) => {
  try {
    const { id } = req.params;
    const workflowIndex = workflows.findIndex(w => w.id === id);

    if (workflowIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found'
      });
    }

    workflows.splice(workflowIndex, 1);

    res.status(200).json({
      success: true,
      message: 'Workflow deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Export workflow
const exportWorkflow = (req, res) => {
  try {
    const { id } = req.params;
    const workflow = workflows.find(w => w.id === id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found'
      });
    }

    res.status(200).json({
      success: true,
      data: workflow
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Import workflow
const importWorkflow = (req, res) => {
  try {
    const workflowData = req.body;

    // Generate new ID for imported workflow
    const workflow = {
      ...workflowData,
      id: uuidv4(),
      metadata: {
        ...workflowData.metadata,
        imported: new Date().toISOString(),
        modified: new Date().toISOString()
      }
    };

    workflows.push(workflow);

    res.status(201).json({
      success: true,
      data: workflow,
      message: 'Workflow imported successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Convert workflow to BPMN XML
const convertToBPMN = (req, res) => {
  try {
    const { id } = req.params;
    const workflow = workflows.find(w => w.id === id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found'
      });
    }

    const bpmnXML = bpmnConverter.convertToBPMN(workflow);

    res.status(200).json({
      success: true,
      data: {
        xml: bpmnXML
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Validate workflow structure
const validateWorkflow = (req, res) => {
  try {
    const { id } = req.params;
    const workflow = workflows.find(w => w.id === id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found'
      });
    }

    console.log(`[Validation] Validating workflow: ${workflow.id} (${workflow.name})`);
    const validator = new WorkflowValidator();
    const validationResult = validator.validate(workflow);

    if (!validationResult.valid) {
      console.log('[Validation] FAILED:', validationResult.errors);
      return res.status(200).json({
        success: true,
        data: {
          valid: false,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          message: 'Workflow validation failed'
        }
      });
    }

    console.log('[Validation] PASSED');
    if (validationResult.warnings.length > 0) {
      console.log('[Validation] Warnings:', validationResult.warnings);
    }

    res.status(200).json({
      success: true,
      data: {
        valid: true,
        errors: [],
        warnings: validationResult.warnings,
        message: 'Workflow validation passed'
      }
    });
  } catch (error) {
    console.error('[Validation] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  createWorkflow,
  getAllWorkflows,
  getWorkflowById,
  updateWorkflow,
  deleteWorkflow,
  exportWorkflow,
  importWorkflow,
  convertToBPMN,
  validateWorkflow
};
