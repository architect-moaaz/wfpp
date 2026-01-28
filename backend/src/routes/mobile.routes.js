/**
 * Mobile API Routes
 *
 * Endpoints for the mobile Expo app to fetch screen definitions,
 * submit forms, and interact with the application.
 */

const express = require('express');
const router = express.Router();
const ApplicationDatabase = require('../database/ApplicationDatabase');
const MobileDataService = require('../services/MobileDataService');
const workflowEngine = require('../runtime/WorkflowRuntimeEngine');
const dataModelEnforcer = require('../runtime/DataModelEnforcer');
const { optionalAuth } = require('../api/middleware/auth');

// Initialize singleton instance
const appDb = new ApplicationDatabase();

/**
 * GET /api/mobile/apps/:appId
 * Get application info for mobile
 */
router.get('/apps/:appId', optionalAuth, async (req, res) => {
  try {
    const { appId } = req.params;

    // Fetch application from database
    const app = await appDb.findById(appId);

    if (!app) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: app.id,
        name: app.name,
        description: app.description,
        status: app.status,
        version: app.version,
        createdAt: app.created_at,
      }
    });
  } catch (error) {
    console.error('[Mobile API] Error fetching app:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/mobile/apps/:appId/screens
 * Get all mobile screens for an application
 */
router.get('/apps/:appId/screens', optionalAuth, async (req, res) => {
  try {
    const { appId } = req.params;

    // Fetch application from database (includes all resources)
    const app = await appDb.findById(appId);

    if (!app) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Get mobile UI from resources
    let mobileUI = app.resources?.mobileUI;

    // If no mobile UI, try to extract from workflows
    if (!mobileUI || !mobileUI.screens || mobileUI.screens.length === 0) {
      // Workflows are already included in app.resources
      const workflows = app.resources?.workflows || [];

      // Combine mobile screens from all workflows
      const screens = [];
      const navigationScreens = [];

      for (const workflow of workflows) {
        // Check if workflow has mobileUI in metadata
        if (workflow.metadata?.mobileUI?.screens) {
          screens.push(...workflow.metadata.mobileUI.screens);
          navigationScreens.push(...(workflow.metadata.mobileUI.navigation?.screens || []));
        }
      }

      // Create default mobile UI from forms if still empty
      if (screens.length === 0) {
        // Forms are already included in app.resources
        const forms = app.resources?.forms || [];

        for (const form of forms) {
          screens.push(generateScreenFromForm(form));
        }
      }

      mobileUI = {
        screens,
        navigation: {
          type: screens.length > 3 ? 'tab' : 'stack',
          screens: navigationScreens.length > 0 ? navigationScreens : screens.map(s => s.name)
        }
      };
    }

    res.json({
      success: true,
      screens: mobileUI.screens || [],
      navigation: mobileUI.navigation || { type: 'stack', screens: [] }
    });
  } catch (error) {
    console.error('[Mobile API] Error fetching screens:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/mobile/apps/:appId/screens/:screenId
 * Get a single screen by ID
 */
router.get('/apps/:appId/screens/:screenId', optionalAuth, async (req, res) => {
  try {
    const { appId, screenId } = req.params;

    const app = await appDb.findById(appId);

    if (!app) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    const mobileUI = app.resources?.mobileUI;
    const screen = mobileUI?.screens?.find(s => s.id === screenId || s.name === screenId);

    if (!screen) {
      return res.status(404).json({
        success: false,
        error: 'Screen not found'
      });
    }

    res.json({
      success: true,
      screen
    });
  } catch (error) {
    console.error('[Mobile API] Error fetching screen:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/mobile/apps/:appId/forms/:formId/submit
 * Submit form data from mobile app
 */
router.post('/apps/:appId/forms/:formId/submit', optionalAuth, async (req, res) => {
  try {
    const { appId, formId } = req.params;
    const formData = req.body;
    const userId = req.user?.id || null;

    // Fetch application to get forms and data models
    const app = await appDb.findById(appId);

    if (!app) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Find form in application resources
    const forms = app.resources?.forms || [];
    const form = forms.find(f => f.id === formId || f.name === formId);

    if (!form) {
      return res.status(404).json({
        success: false,
        error: 'Form not found'
      });
    }

    // Find linked data model
    const dataModels = app.resources?.dataModels || [];
    let dataModel = null;

    if (form.data_model_id || form.dataModelId) {
      dataModel = dataModels.find(dm =>
        dm.id === form.data_model_id ||
        dm.id === form.dataModelId
      );
    }

    // If no linked data model, create a generic one based on form fields
    if (!dataModel) {
      dataModel = {
        id: `form_${formId}_model`,
        name: `${form.name || formId}_submissions`,
        fields: extractFieldsFromForm(form)
      };
    }

    // Validate form data against data model
    const validation = MobileDataService.validateData(dataModel, formData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: validation.errors
      });
    }

    // Save submission to database
    const record = await MobileDataService.createRecord(appId, dataModel, formData, userId);

    // Trigger workflow if configured
    if (form.metadata?.triggerWorkflow || form.workflowId) {
      const workflowId = form.metadata?.triggerWorkflow || form.workflowId;
      try {
        // Find the workflow definition
        const workflows = app.resources?.workflows || [];
        const workflowDef = workflows.find(w => w.id === workflowId);

        if (workflowDef) {
          console.log(`[Mobile API] Triggering workflow ${workflowId} for form submission`);

          // Prepare workflow input with form data
          const workflowInput = {
            formId,
            formName: form.name,
            submissionId: record.id,
            submittedBy: userId,
            submittedAt: record.createdAt,
            applicationId: appId,
            formData: formData,
            record: record
          };

          // Start workflow asynchronously
          const instance = await workflowEngine.startWorkflow(
            workflowDef,
            workflowInput,
            userId || 'mobile-app'
          );

          console.log(`[Mobile API] Workflow instance started: ${instance.id}`);

          // Include workflow instance in response
          res.json({
            success: true,
            message: 'Form submitted and workflow triggered successfully',
            data: {
              id: record.id,
              formId,
              submittedAt: record.createdAt,
              record,
              workflowInstance: {
                id: instance.id,
                status: instance.status,
                workflowId: workflowId,
                workflowName: workflowDef.name
              }
            }
          });
          return;
        } else {
          console.warn(`[Mobile API] Workflow ${workflowId} not found in application resources`);
        }
      } catch (workflowError) {
        console.error('[Mobile API] Workflow trigger failed:', workflowError.message);
        // Don't fail the submission, just log the error and continue with normal response
      }
    }

    res.json({
      success: true,
      message: 'Form submitted successfully',
      data: {
        id: record.id,
        formId,
        submittedAt: record.createdAt,
        record
      }
    });
  } catch (error) {
    console.error('[Mobile API] Error submitting form:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/mobile/apps/:appId/data/:modelId
 * Fetch data from a data model
 */
router.get('/apps/:appId/data/:modelId', optionalAuth, async (req, res) => {
  try {
    const { appId, modelId } = req.params;
    const { page = 1, limit = 20, sortBy, sortOrder, ...filters } = req.query;

    // Fetch application to get data models
    const app = await appDb.findById(appId);

    if (!app) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Find data model in application resources
    const dataModels = app.resources?.dataModels || [];
    const dataModel = dataModels.find(dm => dm.id === modelId || dm.name === modelId);

    if (!dataModel) {
      return res.status(404).json({
        success: false,
        error: 'Data model not found'
      });
    }

    // Parse filter values (they come as strings from query params)
    const parsedFilters = parseQueryFilters(filters);

    // Fetch records from database
    const result = await MobileDataService.getRecords(appId, dataModel, parsedFilters, {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy: sortBy || 'created_at',
      sortOrder: sortOrder || 'DESC'
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('[Mobile API] Error fetching data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/mobile/apps/:appId/data/:modelId/:recordId
 * Get a single record by ID
 */
router.get('/apps/:appId/data/:modelId/:recordId', optionalAuth, async (req, res) => {
  try {
    const { appId, modelId, recordId } = req.params;

    const app = await appDb.findById(appId);
    if (!app) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    const dataModels = app.resources?.dataModels || [];
    const dataModel = dataModels.find(dm => dm.id === modelId || dm.name === modelId);

    if (!dataModel) {
      return res.status(404).json({ success: false, error: 'Data model not found' });
    }

    const record = await MobileDataService.getRecordById(appId, dataModel, recordId);

    if (!record) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }

    res.json({ success: true, data: record });
  } catch (error) {
    console.error('[Mobile API] Error fetching record:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mobile/apps/:appId/data/:modelId
 * Create a new record in a data model
 */
router.post('/apps/:appId/data/:modelId', optionalAuth, async (req, res) => {
  try {
    const { appId, modelId } = req.params;
    const data = req.body;
    const userId = req.user?.id || null;

    const app = await appDb.findById(appId);
    if (!app) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    const dataModels = app.resources?.dataModels || [];
    const dataModel = dataModels.find(dm => dm.id === modelId || dm.name === modelId);

    if (!dataModel) {
      return res.status(404).json({ success: false, error: 'Data model not found' });
    }

    // Validate data
    const validation = MobileDataService.validateData(dataModel, data);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: validation.errors
      });
    }

    // Create record
    const record = await MobileDataService.createRecord(appId, dataModel, data, userId);

    res.status(201).json({
      success: true,
      data: record
    });
  } catch (error) {
    console.error('[Mobile API] Error creating record:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/mobile/apps/:appId/data/:modelId/:recordId
 * Update a record in a data model
 */
router.put('/apps/:appId/data/:modelId/:recordId', optionalAuth, async (req, res) => {
  try {
    const { appId, modelId, recordId } = req.params;
    const data = req.body;
    const userId = req.user?.id || null;

    const app = await appDb.findById(appId);
    if (!app) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    const dataModels = app.resources?.dataModels || [];
    const dataModel = dataModels.find(dm => dm.id === modelId || dm.name === modelId);

    if (!dataModel) {
      return res.status(404).json({ success: false, error: 'Data model not found' });
    }

    // Validate data (partial validation for updates)
    const validation = MobileDataService.validateData(dataModel, data);
    if (!validation.valid) {
      // For updates, only fail on type errors, not missing required fields
      const typeErrors = validation.errors.filter(e => !e.message.includes('required'));
      if (typeErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          errors: typeErrors
        });
      }
    }

    // Update record
    const record = await MobileDataService.updateRecord(appId, dataModel, recordId, data, userId);

    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    console.error('[Mobile API] Error updating record:', error);

    if (error.message === 'Record not found') {
      return res.status(404).json({ success: false, error: error.message });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/mobile/apps/:appId/data/:modelId/:recordId
 * Delete a record from a data model
 */
router.delete('/apps/:appId/data/:modelId/:recordId', optionalAuth, async (req, res) => {
  try {
    const { appId, modelId, recordId } = req.params;

    const app = await appDb.findById(appId);
    if (!app) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    const dataModels = app.resources?.dataModels || [];
    const dataModel = dataModels.find(dm => dm.id === modelId || dm.name === modelId);

    if (!dataModel) {
      return res.status(404).json({ success: false, error: 'Data model not found' });
    }

    // Check cascade delete rules via DataModelEnforcer
    dataModelEnforcer.setApplicationContext(appId);

    const deleteValidation = await dataModelEnforcer.validateDelete(modelId, recordId);

    if (!deleteValidation.canDelete) {
      // Check if force delete is requested
      const forceDelete = req.query.force === 'true';

      if (!forceDelete) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete record due to referential integrity constraints',
          referencedBy: deleteValidation.referencedBy,
          cascadeActions: deleteValidation.cascadeActions,
          message: deleteValidation.referencedBy?.length > 0
            ? `This record is referenced by ${deleteValidation.referencedBy.length} other record(s). Use ?force=true to cascade delete.`
            : 'Deletion blocked by data model constraints.'
        });
      }

      // Force delete - execute cascade
      console.log(`[Mobile API] Executing cascade delete for ${modelId}/${recordId}`);

      const cascadeResult = await dataModelEnforcer.executeCascadeDelete(modelId, recordId, {
        dryRun: false,
        force: true
      });

      if (!cascadeResult.success) {
        return res.status(500).json({
          success: false,
          error: 'Cascade delete failed',
          details: cascadeResult.error
        });
      }

      return res.json({
        success: true,
        message: 'Record and related records deleted successfully (cascade)',
        cascadeResult: {
          deletedCount: cascadeResult.deleted?.length || 1,
          deleted: cascadeResult.deleted
        }
      });
    }

    // No cascade needed - delete record directly
    await MobileDataService.deleteRecord(appId, dataModel, recordId);

    res.json({
      success: true,
      message: 'Record deleted successfully'
    });
  } catch (error) {
    console.error('[Mobile API] Error deleting record:', error);

    if (error.message === 'Record not found') {
      return res.status(404).json({ success: false, error: error.message });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/mobile/apps/:appId/workflows/:workflowId/actions/:actionId
 * Execute a workflow action
 */
router.post('/apps/:appId/workflows/:workflowId/actions/:actionId', optionalAuth, async (req, res) => {
  try {
    const { appId, workflowId, actionId } = req.params;
    const data = req.body;
    const userId = req.user?.id || null;

    const app = await appDb.findById(appId);
    if (!app) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    const workflows = app.resources?.workflows || [];
    const workflow = workflows.find(w => w.id === workflowId);

    if (!workflow) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }

    // Find the action node in the workflow
    const actionNode = workflow.nodes?.find(n => n.id === actionId);

    if (!actionNode) {
      return res.status(404).json({
        success: false,
        error: 'Action not found in workflow'
      });
    }

    console.log(`[Mobile API] Execute action ${actionId} (${actionNode.type}) in workflow ${workflowId}`);

    try {
      // Check if this is a user task that needs completion
      if (actionNode.type === 'userTask') {
        // Look for an active instance waiting at this node
        const { instanceId } = data;

        if (instanceId) {
          // Resume existing workflow instance with the action data
          const resumeResult = await workflowEngine.completeUserTask(
            instanceId,
            actionId,
            data,
            userId
          );

          return res.json({
            success: true,
            message: 'User task completed successfully',
            result: {
              actionId,
              actionType: actionNode.type,
              workflowId,
              instanceId,
              instanceStatus: resumeResult.status,
              executedAt: new Date().toISOString(),
              executedBy: userId
            }
          });
        } else {
          // Start new workflow instance with the user task data as input
          const instance = await workflowEngine.startWorkflow(
            workflow,
            {
              actionId,
              actionType: actionNode.type,
              actionData: data,
              triggeredBy: userId,
              applicationId: appId
            },
            userId || 'mobile-app'
          );

          return res.json({
            success: true,
            message: 'Workflow started from action',
            result: {
              actionId,
              actionType: actionNode.type,
              workflowId,
              instanceId: instance.id,
              instanceStatus: instance.status,
              executedAt: new Date().toISOString(),
              executedBy: userId
            }
          });
        }
      }

      // For service tasks or other action types, start a new workflow targeting that node
      const instance = await workflowEngine.startWorkflow(
        workflow,
        {
          targetActionId: actionId,
          actionData: data,
          triggeredBy: userId,
          applicationId: appId
        },
        userId || 'mobile-app'
      );

      res.json({
        success: true,
        message: 'Action executed successfully',
        result: {
          actionId,
          actionType: actionNode.type,
          workflowId,
          instanceId: instance.id,
          instanceStatus: instance.status,
          executedAt: new Date().toISOString(),
          executedBy: userId
        }
      });
    } catch (executionError) {
      console.error(`[Mobile API] Action execution failed:`, executionError.message);

      res.status(500).json({
        success: false,
        error: 'Action execution failed',
        details: executionError.message
      });
    }
  } catch (error) {
    console.error('[Mobile API] Error executing action:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract field definitions from a form
 */
function extractFieldsFromForm(form) {
  const fields = form.fields || form.definition?.fields || [];

  return fields.map(field => ({
    id: field.id || field.name,
    name: field.name || field.id,
    label: field.label,
    type: mapFormFieldToDataType(field.type),
    required: field.required || false,
    constraints: field.validation || {}
  }));
}

/**
 * Map form field type to data model type
 */
function mapFormFieldToDataType(fieldType) {
  const mapping = {
    'text': 'string',
    'textarea': 'string',
    'email': 'email',
    'password': 'string',
    'number': 'number',
    'phone': 'phone',
    'tel': 'phone',
    'date': 'date',
    'datetime': 'datetime',
    'time': 'time',
    'select': 'string',
    'dropdown': 'string',
    'checkbox': 'boolean',
    'radio': 'string',
    'switch': 'boolean',
    'boolean': 'boolean',
    'file': 'string',
    'image': 'string',
    'currency': 'decimal',
    'percentage': 'decimal'
  };

  return mapping[fieldType?.toLowerCase()] || 'string';
}

/**
 * Parse query string filters into typed values
 */
function parseQueryFilters(filters) {
  const parsed = {};

  for (const [key, value] of Object.entries(filters)) {
    if (value === 'true') {
      parsed[key] = true;
    } else if (value === 'false') {
      parsed[key] = false;
    } else if (value === 'null') {
      parsed[key] = null;
    } else if (!isNaN(Number(value)) && value !== '') {
      parsed[key] = Number(value);
    } else if (value.startsWith('{') || value.startsWith('[')) {
      try {
        parsed[key] = JSON.parse(value);
      } catch {
        parsed[key] = value;
      }
    } else {
      parsed[key] = value;
    }
  }

  return parsed;
}

/**
 * Helper: Generate a mobile screen from a form definition
 */
function generateScreenFromForm(form) {
  const components = [];

  // Add header
  components.push({
    type: 'heading',
    props: {
      text: form.title || form.name,
      level: 2
    }
  });

  // Add form description if exists
  if (form.description) {
    components.push({
      type: 'text',
      props: {
        text: form.description,
        color: '#6b7280'
      }
    });
  }

  // Convert form fields to mobile components
  const fields = form.definition?.fields || form.fields || [];

  for (const field of fields) {
    const componentType = mapFieldTypeToMobile(field.type);

    components.push({
      type: componentType,
      props: {
        label: field.label || field.name,
        placeholder: field.placeholder || `Enter ${field.label || field.name}`,
        name: field.name || field.id,
        required: field.required,
        ...field.props
      }
    });
  }

  // Add submit button
  components.push({
    type: 'button',
    props: {
      title: 'Submit',
      primary: true,
      action: {
        type: 'submit',
        formId: form.id
      }
    }
  });

  return {
    id: `screen_${form.id}`,
    name: form.name || 'Form',
    type: 'form',
    formId: form.id,
    navigation: {
      showHeader: true,
      headerTitle: form.title || form.name
    },
    components
  };
}

/**
 * Helper: Map form field types to mobile component types
 */
function mapFieldTypeToMobile(fieldType) {
  const mapping = {
    'text': 'textinput',
    'email': 'textinput',
    'password': 'textinput',
    'number': 'textinput',
    'phone': 'textinput',
    'tel': 'textinput',
    'textarea': 'textarea',
    'date': 'textinput',
    'time': 'textinput',
    'select': 'picker',
    'dropdown': 'picker',
    'checkbox': 'checkbox',
    'radio': 'picker',
    'switch': 'switch',
    'boolean': 'switch',
    'file': 'button',
    'image': 'button',
  };

  return mapping[fieldType?.toLowerCase()] || 'textinput';
}

module.exports = router;
