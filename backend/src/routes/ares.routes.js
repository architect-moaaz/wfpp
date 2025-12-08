const express = require('express');
const router = express.Router();
const aresService = require('../services/AresService');
const formDatabase = require('../database/FormDatabase');

/**
 * ARES Conversational AI Routes
 */

/**
 * POST /api/ares/chat
 * Generate conversational response from ARES
 *
 * Body:
 * {
 *   conversationHistory: Array<{role: string, content: string, timestamp: number}>,
 *   context: {
 *     currentApplication?: Object,
 *     activeView?: string
 *   }
 * }
 */
router.post('/chat', async (req, res) => {
  try {
    const { conversationHistory, context } = req.body;

    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return res.status(400).json({
        success: false,
        error: 'conversationHistory is required and must be an array'
      });
    }

    // Generate response using ARES service
    const response = await aresService.generateResponse(conversationHistory, context || {});

    res.json({
      success: true,
      response: {
        content: response.content,
        suggestions: response.suggestions,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('Error in ARES chat endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate response',
      message: error.message
    });
  }
});

/**
 * POST /api/ares/stream
 * Stream conversational response from ARES (for real-time responses)
 */
router.post('/stream', async (req, res) => {
  try {
    const { conversationHistory, context } = req.body;

    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return res.status(400).json({
        success: false,
        error: 'conversationHistory is required and must be an array'
      });
    }

    // Set up SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream response
    await aresService.streamResponse(conversationHistory, context || {}, (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    res.end();
  } catch (error) {
    console.error('Error in ARES stream endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stream response',
      message: error.message
    });
  }
});

/**
 * POST /api/ares/generate
 * Trigger MoE system to generate workflow/app from gathered requirements
 * Supports real-time progress updates via Socket.io
 */
router.post('/generate', async (req, res) => {
  try {
    const { requirements, context, socketId, conversationHistory } = req.body;

    if (!requirements && !conversationHistory) {
      return res.status(400).json({
        success: false,
        error: 'requirements or conversationHistory are required'
      });
    }

    if (!context.applicationId) {
      return res.status(400).json({
        success: false,
        error: 'applicationId is required in context'
      });
    }

    console.log('[ARES] Generation request received:', {
      requirements,
      hasConversationHistory: !!conversationHistory,
      context,
      socketId
    });

    // Get Socket.io instance for progress updates
    const io = req.app.get('io');

    // Create progress emitter function
    const emitProgress = (event) => {
      if (io && socketId) {
        console.log('[ARES] Emitting progress:', event.type);
        io.to(socketId).emit('ares:progress', event);
      }
    };

    // Send initial progress
    emitProgress({
      type: 'started',
      message: 'Starting MoE generation...',
      timestamp: Date.now()
    });

    // Respond immediately - generation will continue in background
    // Client will receive completion via WebSocket
    res.json({
      success: true,
      message: 'Generation started. Progress will be sent via WebSocket.',
      socketId: socketId
    });

    // Run generation in background (don't await the response to client)
    runGenerationInBackground(aresService, requirements, context, emitProgress, io, socketId);

  } catch (error) {
    console.error('Error in ARES generate endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start generation',
      message: error.message
    });
  }
});

/**
 * Background generation function
 * Runs after HTTP response is sent, emits completion via WebSocket
 */
async function runGenerationInBackground(aresService, requirements, context, emitProgress, io, socketId) {
  try {
    // Trigger MoE generation with progress callback
    const moeResult = await aresService.generateWithMoE(requirements, context || {}, emitProgress);

    console.log('[ARES] MoE result:', moeResult);

    // Get the application
    const ApplicationDatabase = require('../database/ApplicationDatabase');
    const appDb = new ApplicationDatabase();
    await appDb.initialize();

    const application = await appDb.findById(context.applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Extract generated resources from MoE result
    // Support both multiple workflows (new) and single workflow (backward compat)
    const resultWorkflow = moeResult.result.workflow;
    const generatedWorkflows = resultWorkflow.workflows || [resultWorkflow];

    // Get shared resources from the first workflow or the result object
    const generatedForms = resultWorkflow.forms || [];
    const generatedDataModels = resultWorkflow.dataModels || [];
    const generatedPages = resultWorkflow.pages || [];
    const generatedRules = resultWorkflow.rules || [];

    console.log('[ARES] Extracted resources:', {
      workflows: generatedWorkflows.length,
      workflowIds: generatedWorkflows.map(wf => wf.id || wf.name),
      forms: generatedForms.length,
      dataModels: generatedDataModels.length,
      pages: generatedPages.length,
      rules: generatedRules.length
    });

    // Add workflowId to all resources for filtering (use first workflow as primary)
    const primaryWorkflowId = generatedWorkflows[0]?.id;
    generatedForms.forEach(form => { form.workflowId = form.workflowId || primaryWorkflowId; });
    generatedDataModels.forEach(model => { model.workflowId = model.workflowId || primaryWorkflowId; });
    generatedPages.forEach(page => { page.workflowId = page.workflowId || primaryWorkflowId; });
    generatedRules.forEach(rule => { rule.workflowId = rule.workflowId || primaryWorkflowId; });

    // Initialize application resources if not exists
    if (!application.resources) {
      application.resources = {
        workflows: [],
        forms: [],
        dataModels: [],
        pages: [],
        rules: []
      };
    }

    // Add all workflows to application
    if (generatedWorkflows.length > 0) {
      application.resources.workflows = application.resources.workflows || [];
      generatedWorkflows.forEach(workflow => {
        // Clean up internal properties before saving
        const cleanWorkflow = { ...workflow };
        delete cleanWorkflow.workflows; // Remove nested workflows array
        delete cleanWorkflow._isMultiWorkflow;
        delete cleanWorkflow._workflowCount;
        application.resources.workflows.push(cleanWorkflow);
      });
      console.log('[ARES] Added workflows to application:', generatedWorkflows.map(wf => wf.id || wf.name));
    }

    // Add forms to application
    if (generatedForms.length > 0) {
      application.resources.forms = application.resources.forms || [];
      application.resources.forms.push(...generatedForms);
      console.log('[ARES] Added forms to application.resources:', generatedForms.map(f => f.id || f.name));

      // Also save forms to FormDatabase (for /api/forms/:id endpoint)
      try {
        await formDatabase.saveForms(generatedForms);
        console.log('[ARES] Saved forms to FormDatabase:', generatedForms.map(f => f.id));
      } catch (formDbError) {
        console.error('[ARES] Failed to save forms to FormDatabase:', formDbError);
      }
    }

    // Add data models to application
    if (generatedDataModels.length > 0) {
      application.resources.dataModels = application.resources.dataModels || [];
      application.resources.dataModels.push(...generatedDataModels);
      console.log('[ARES] Added data models to application.resources:', generatedDataModels.map(dm => dm.id || dm.name));
    }

    // Add pages to application
    if (generatedPages.length > 0) {
      application.resources.pages = application.resources.pages || [];
      application.resources.pages.push(...generatedPages);
      console.log('[ARES] Added pages to application.resources:', generatedPages.map(p => p.id || p.name));
    }

    // Add rules to application
    if (generatedRules.length > 0) {
      application.resources.rules = application.resources.rules || [];
      application.resources.rules.push(...generatedRules);
      console.log('[ARES] Added rules to application.resources:', generatedRules.map(r => r.id || r.name));

      // Also save each rule individually to k1.rules table
      const ApplicationService = require('../services/ApplicationService');
      for (const rule of generatedRules) {
        try {
          // Add application_id to rule
          rule.application_id = context.applicationId;
          await ApplicationService.addRule(context.applicationId, rule);
          console.log('[ARES] Saved rule to database:', rule.id || rule.name);
        } catch (ruleError) {
          console.error('[ARES] Failed to save rule:', ruleError);
        }
      }
    }

    console.log('[ARES] About to save to database...');
    console.log('[ARES] Application resources counts before save:', {
      workflows: application.resources.workflows.length,
      forms: application.resources.forms.length,
      dataModels: application.resources.dataModels.length,
      pages: application.resources.pages.length,
      rules: application.resources.rules.length
    });

    // Update application in database
    try {
      await appDb.update(context.applicationId, application);
      console.log('[ARES] Successfully saved application to database!');
    } catch (dbError) {
      console.error('[ARES] DATABASE SAVE FAILED:', dbError);
      throw new Error(`Failed to save application to database: ${dbError.message}`);
    }

    // Update resource files in generated app folder
    const ApplicationService = require('../services/ApplicationService');
    try {
      await ApplicationService.saveResourceToFolder(
        application.name,
        'workflows',
        application.resources.workflows || []
      );
      await ApplicationService.saveResourceToFolder(
        application.name,
        'forms',
        application.resources.forms || []
      );
      await ApplicationService.saveResourceToFolder(
        application.name,
        'dataModels',
        application.resources.dataModels || []
      );
      await ApplicationService.saveResourceToFolder(
        application.name,
        'pages',
        application.resources.pages || []
      );
      await ApplicationService.saveResourceToFolder(
        application.name,
        'rules',
        application.resources.rules || []
      );
      console.log('[ARES] Updated resource files in generated app folder');
    } catch (fileError) {
      console.warn('[ARES] Failed to update resource files:', fileError);
      // Don't fail the whole operation if file update fails
    }

    console.log('[ARES] Successfully added resources to application:', {
      workflows: application.resources.workflows.length,
      forms: application.resources.forms.length,
      dataModels: application.resources.dataModels.length,
      pages: application.resources.pages.length,
      rules: application.resources.rules.length
    });

    // Send completion event with stats and generated resources via WebSocket
    emitProgress({
      type: 'completed',
      message: generatedWorkflows.length > 1
        ? `Generation complete! Created ${generatedWorkflows.length} workflows.`
        : 'Generation complete!',
      stats: {
        workflowsAdded: generatedWorkflows.length,
        formsAdded: generatedForms.length,
        dataModelsAdded: generatedDataModels.length,
        pagesAdded: generatedPages.length,
        rulesAdded: generatedRules.length
      },
      resources: {
        workflows: generatedWorkflows,
        forms: generatedForms,
        dataModels: generatedDataModels,
        pages: generatedPages,
        rules: generatedRules
      },
      applicationId: context.applicationId,
      timestamp: Date.now()
    });

    console.log('[ARES] Background generation completed successfully!');
  } catch (error) {
    console.error('[ARES] Error in background generation:', error);
    // Send error via WebSocket
    if (emitProgress) {
      emitProgress({
        type: 'error',
        message: error.message || 'Generation failed',
        timestamp: Date.now()
      });
    }
  }
}

/**
 * GET /api/ares/status
 * Check ARES service status
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    status: 'online',
    llmEnabled: aresService.useLLM,
    model: aresService.modelName
  });
});

/**
 * POST /api/ares/clear-state
 * Clear conversation state
 */
router.post('/clear-state', (req, res) => {
  try {
    const { conversationId } = req.body;
    aresService.clearConversationState(conversationId || 'default');
    res.json({
      success: true,
      message: 'Conversation state cleared'
    });
  } catch (error) {
    console.error('Error clearing conversation state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear state',
      message: error.message
    });
  }
});

module.exports = router;
