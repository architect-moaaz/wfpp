const { v4: uuidv4 } = require('uuid');
const bpmnConverter = require('../utils/bpmn-converter');
const WorkflowValidator = require('../services/validation/WorkflowValidator');
const WorkflowCodeGenerator = require('../services/WorkflowCodeGenerator');
const workflowDatabase = require('../database/WorkflowDatabase');
const fs = require('fs').promises;
const path = require('path');

// Validator instance for import validation
const validator = new WorkflowValidator();

// Helper function to generate and save workflow app code
const generateWorkflowApp = async (workflow) => {
  try {
    console.log(`[CodeGen] Generating app for workflow: ${workflow.name}`);

    // Transform workflow format from controller to code generator format
    const workflowForGen = {
      id: workflow.id,
      name: workflow.name,
      definition: {
        nodes: workflow.nodes || [],
        edges: workflow.connections || []
      }
    };

    // Generate code
    const codePackage = await WorkflowCodeGenerator.generate(workflowForGen);

    // Create app name from workflow name
    const appName = (workflow.name || 'workflow-app')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const baseDir = path.join(__dirname, '../../generated-apps', appName);

    // Create directory structure
    await fs.mkdir(baseDir, { recursive: true });
    await fs.mkdir(path.join(baseDir, 'frontend'), { recursive: true });
    await fs.mkdir(path.join(baseDir, 'backend'), { recursive: true });

    // Save frontend files
    for (const [filePath, content] of Object.entries(codePackage.frontend)) {
      const fullPath = path.join(baseDir, 'frontend', filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf8');
    }

    // Save backend files
    for (const [filePath, content] of Object.entries(codePackage.backend)) {
      const fullPath = path.join(baseDir, 'backend', filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf8');
    }

    // Save config files
    for (const [filePath, content] of Object.entries(codePackage.config)) {
      const fullPath = path.join(baseDir, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf8');
    }

    console.log(`[CodeGen] App generated and saved to: ${baseDir}`);
    return baseDir;
  } catch (error) {
    console.error(`[CodeGen] Error generating app for workflow ${workflow.id}:`, error);
    throw error;
  }
};

// Create a new workflow
const createWorkflow = async (req, res) => {
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

    // Persist to database
    await workflowDatabase.saveWorkflow(workflow);

    // Generate app code automatically
    try {
      const localPath = await generateWorkflowApp(workflow);
      workflow.localPath = localPath;
      // Update workflow with localPath
      await workflowDatabase.saveWorkflow(workflow);
      console.log(`[Workflow] Created workflow with generated app at: ${localPath}`);
    } catch (codeGenError) {
      console.error('[Workflow] Failed to generate app code:', codeGenError);
      // Don't fail workflow creation if code generation fails
    }

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
const getAllWorkflows = async (req, res) => {
  try {
    const workflows = await workflowDatabase.loadWorkflows();
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
const getWorkflowById = async (req, res) => {
  try {
    const { id } = req.params;
    const workflow = await workflowDatabase.getWorkflow(id);

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
const updateWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, nodes, connections, metadata } = req.body;

    const existingWorkflow = await workflowDatabase.getWorkflow(id);

    if (!existingWorkflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found'
      });
    }

    const updatedWorkflow = {
      ...existingWorkflow,
      name: name || existingWorkflow.name,
      nodes: nodes || existingWorkflow.nodes,
      connections: connections || existingWorkflow.connections,
      metadata: {
        ...existingWorkflow.metadata,
        ...metadata,
        modified: new Date().toISOString()
      }
    };

    // Persist to database
    await workflowDatabase.saveWorkflow(updatedWorkflow);

    // Regenerate app code automatically
    try {
      const localPath = await generateWorkflowApp(updatedWorkflow);
      updatedWorkflow.localPath = localPath;
      await workflowDatabase.saveWorkflow(updatedWorkflow);
      console.log(`[Workflow] Updated workflow with regenerated app at: ${localPath}`);
    } catch (codeGenError) {
      console.error('[Workflow] Failed to regenerate app code:', codeGenError);
      // Don't fail workflow update if code generation fails
    }

    res.status(200).json({
      success: true,
      data: updatedWorkflow,
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
const deleteWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const workflow = await workflowDatabase.getWorkflow(id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found'
      });
    }

    // Load all workflows, filter out the one to delete, and save
    const workflows = await workflowDatabase.loadWorkflows();
    const filtered = workflows.filter(w => w.id !== id);

    // Save the filtered list by overwriting with each remaining workflow
    // Clear and re-add (WorkflowDatabase doesn't have a direct delete for workflows)
    for (const wf of filtered) {
      await workflowDatabase.saveWorkflow(wf);
    }

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
const exportWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const workflow = await workflowDatabase.getWorkflow(id);

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

// Import workflow with validation
const importWorkflow = async (req, res) => {
  try {
    const workflowData = req.body;

    // Validate the imported workflow structure
    const validationResult = validator.validate(workflowData);
    if (!validationResult.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid workflow structure',
        errors: validationResult.errors,
        message: 'Workflow import failed validation'
      });
    }

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

    // Persist to database
    await workflowDatabase.saveWorkflow(workflow);

    res.status(201).json({
      success: true,
      data: workflow,
      message: 'Workflow imported successfully',
      warnings: validationResult.warnings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Convert workflow to BPMN XML
const convertToBPMN = async (req, res) => {
  try {
    const { id } = req.params;
    const workflow = await workflowDatabase.getWorkflow(id);

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
const validateWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const workflow = await workflowDatabase.getWorkflow(id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found'
      });
    }

    console.log(`[Validation] Validating workflow: ${workflow.id} (${workflow.name})`);
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
  validateWorkflow,
  // Helper to get workflows (now async)
  getWorkflows: () => workflowDatabase.loadWorkflows()
};
