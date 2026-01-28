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
    const { requirements, context, socketId, sessionId, conversationHistory, themeConfig } = req.body;

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
      socketId,
      sessionId,
      themeConfig: themeConfig ? { theme: themeConfig.theme, hasCustomCss: !!themeConfig.customCss } : null
    });

    // Get Socket.io instance and session manager for progress updates
    const io = req.app.get('io');
    const socketSessionManager = req.app.get('socketSessionManager');

    // Create progress emitter function that uses sessionId for reconnection support
    const emitProgress = (event) => {
      if (!io) return;

      console.log('[ARES] Emitting progress:', event.type, { sessionId, socketId });

      // Prefer session-based emitting for reconnection support
      if (sessionId && socketSessionManager) {
        const emitted = socketSessionManager.emitToSession(io, sessionId, 'ares:progress', event);
        if (emitted) {
          console.log('[ARES] Emitted via session:', sessionId);
          return;
        }
        console.log('[ARES] Session emit failed, falling back to socketId');
      }

      // Fallback to direct socketId if no session
      if (socketId) {
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
      socketId: socketId,
      sessionId: sessionId
    });

    // Run generation in background (don't await the response to client)
    runGenerationInBackground(aresService, requirements, context, emitProgress, io, socketId, themeConfig);

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
async function runGenerationInBackground(aresService, requirements, context, emitProgress, io, socketId, themeConfig = null) {
  try {
    // Add themeConfig to context for generation
    const enrichedContext = {
      ...context,
      themeConfig: themeConfig
    };

    // Trigger MoE generation with progress callback
    const moeResult = await aresService.generateWithMoE(requirements, enrichedContext, emitProgress);

    console.log('[ARES] MoE result:', moeResult);

    // Get the application
    const ApplicationDatabase = require('../database/ApplicationDatabase');
    const appDb = new ApplicationDatabase();
    await appDb.initialize();

    const application = await appDb.findById(context.applicationId);
    if (!application) {
      console.error('[ARES] Application not found:', context.applicationId);
      if (emitProgress) {
        emitProgress({
          type: 'error',
          message: `Application not found: ${context.applicationId}`,
          timestamp: Date.now()
        });
      }
      return;
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
    const designAnalysis = resultWorkflow.designAnalysis || null;

    console.log('[ARES] Extracted resources:', {
      workflows: generatedWorkflows.length,
      workflowIds: generatedWorkflows.map(wf => wf.id || wf.name),
      forms: generatedForms.length,
      dataModels: generatedDataModels.length,
      pages: generatedPages.length,
      rules: generatedRules.length,
      hasDesignAnalysis: !!designAnalysis,
      designSource: designAnalysis?.source || 'none'
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
        rules: [],
        designAnalysis: null
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
      // DEBUG: Log navigation state of pages before save
      generatedPages.forEach(p => {
        console.log('[ARES] Page', p.name, 'navigation status:', {
          hasNavigation: !!p.navigation,
          navigationKeys: p.navigation ? Object.keys(p.navigation) : [],
          hasSections: !!p.sections,
          sectionsCount: p.sections?.length || 0
        });
      });
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

    // Add designAnalysis to application (contains theme/CSS from DesignExpert)
    if (designAnalysis) {
      application.resources.designAnalysis = designAnalysis;
      application.designAnalysis = designAnalysis; // Also add at root level for ApplicationGenerator

      // Also save designAnalysis in metadata so it persists to database
      // (the database update only saves specific fields including metadata)
      if (!application.metadata) {
        application.metadata = {};
      }
      application.metadata.designAnalysis = designAnalysis;

      console.log('[ARES] Added designAnalysis to application:', {
        source: designAnalysis.source || 'unknown',
        hasGeneratedCSS: !!designAnalysis.generatedCSS,
        themeName: designAnalysis.themeName || 'default'
      });
    }

    console.log('[ARES] About to save to database...');

    // Deduplicate resources to prevent unique constraint violations
    // MoE can sometimes generate duplicate IDs from different experts
    const deduplicateResources = (resources) => {
      const dedupe = (arr, name) => {
        if (!arr || !Array.isArray(arr)) return [];
        const seen = new Set();
        const deduped = [];
        let duplicateCount = 0;

        for (const item of arr) {
          const id = item.id;
          if (!id) {
            deduped.push(item);
            continue;
          }
          if (seen.has(id)) {
            duplicateCount++;
            console.warn(`[ARES] Removing duplicate ${name} with id: ${id}`);
          } else {
            seen.add(id);
            deduped.push(item);
          }
        }

        if (duplicateCount > 0) {
          console.log(`[ARES] Removed ${duplicateCount} duplicate ${name}(s)`);
        }
        return deduped;
      };

      return {
        ...resources,
        dataModels: dedupe(resources.dataModels, 'dataModel'),
        forms: dedupe(resources.forms, 'form'),
        workflows: dedupe(resources.workflows, 'workflow'),
        pages: dedupe(resources.pages, 'page'),
        rules: dedupe(resources.rules, 'rule')
      };
    };

    application.resources = deduplicateResources(application.resources);

    console.log('[ARES] Application resources counts before save:', {
      workflows: application.resources.workflows.length,
      forms: application.resources.forms.length,
      dataModels: application.resources.dataModels.length,
      pages: application.resources.pages.length,
      rules: application.resources.rules.length
    });

    // Update application in database with intelligent error handling
    const saveWithRetry = async (app, maxRetries = 3) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await appDb.update(context.applicationId, app);
          console.log('[ARES] Successfully saved application to database!');
          return true;
        } catch (dbError) {
          console.error(`[ARES] DATABASE SAVE FAILED (attempt ${attempt}/${maxRetries}):`, dbError.message);

          // Check for foreign key constraint violations
          if (dbError.code === '23503' && dbError.constraint) {
            console.log('[ARES] Detected foreign key violation, attempting auto-fix...');

            // Handle forms.data_model_id_fkey - invalid data model references
            if (dbError.constraint === 'forms_data_model_id_fkey') {
              const invalidId = dbError.detail?.match(/Key \(data_model_id\)=\(([^)]+)\)/)?.[1];
              console.log(`[ARES] Fixing invalid data_model_id: "${invalidId}"`);

              // Get valid data model IDs
              const validDataModelIds = new Set(
                (app.resources.dataModels || []).map(dm => dm.id)
              );

              // Fix forms with invalid data_model_id
              let fixedCount = 0;
              (app.resources.forms || []).forEach(form => {
                if (form.dataModelId && !validDataModelIds.has(form.dataModelId)) {
                  // Try to find matching data model by name
                  const matchingDm = (app.resources.dataModels || []).find(dm =>
                    dm.name?.toLowerCase() === form.dataModelId?.toLowerCase() ||
                    dm.name?.toLowerCase().replace(/[^a-z0-9]/g, '') === form.dataModelId?.toLowerCase().replace(/[^a-z0-9]/g, '')
                  );

                  if (matchingDm) {
                    console.log(`[ARES] Fixed form "${form.name}": "${form.dataModelId}" -> "${matchingDm.id}"`);
                    form.dataModelId = matchingDm.id;
                    form.dataModelName = matchingDm.name;
                  } else {
                    console.log(`[ARES] Cleared invalid dataModelId "${form.dataModelId}" from form "${form.name}"`);
                    delete form.dataModelId;
                    delete form.dataModelName;
                    delete form.data_model_id;
                  }
                  fixedCount++;
                }
              });

              if (fixedCount > 0) {
                console.log(`[ARES] Fixed ${fixedCount} forms with invalid data model references`);
                continue; // Retry with fixed data
              }
            }

            // Handle workflows.form_id_fkey or similar - invalid form references in workflows
            if (dbError.constraint.includes('form') && dbError.constraint.includes('fkey')) {
              const validFormIds = new Set((app.resources.forms || []).map(f => f.id));

              let fixedCount = 0;
              (app.resources.workflows || []).forEach(workflow => {
                (workflow.nodes || []).forEach(node => {
                  if (node.data?.formId && !validFormIds.has(node.data.formId)) {
                    console.log(`[ARES] Cleared invalid formId "${node.data.formId}" from workflow node "${node.data?.label}"`);
                    delete node.data.formId;
                    delete node.data.formName;
                    fixedCount++;
                  }
                });
              });

              if (fixedCount > 0) {
                console.log(`[ARES] Fixed ${fixedCount} workflow nodes with invalid form references`);
                continue; // Retry with fixed data
              }
            }
          }

          // Handle unique constraint violations (duplicate IDs)
          if (dbError.code === '23505') {
            console.log('[ARES] Detected unique constraint violation (duplicate IDs), attempting deduplication...');

            // Extract table name from error detail
            const tableMatch = dbError.detail?.match(/Key \(id\)=\(([^)]+)\) already exists/);
            const duplicateId = tableMatch?.[1];

            if (duplicateId) {
              console.log(`[ARES] Duplicate ID detected: ${duplicateId}`);
            }

            // Re-run deduplication with more aggressive approach
            const aggressiveDedupe = (arr) => {
              if (!arr || !Array.isArray(arr)) return arr;
              const seen = new Map();
              for (const item of arr) {
                if (item.id) {
                  // Keep the most complete version (most keys)
                  const existing = seen.get(item.id);
                  if (!existing || Object.keys(item).length > Object.keys(existing).length) {
                    seen.set(item.id, item);
                  }
                }
              }
              return Array.from(seen.values());
            };

            app.resources.dataModels = aggressiveDedupe(app.resources.dataModels);
            app.resources.forms = aggressiveDedupe(app.resources.forms);
            app.resources.workflows = aggressiveDedupe(app.resources.workflows);
            app.resources.pages = aggressiveDedupe(app.resources.pages);
            app.resources.rules = aggressiveDedupe(app.resources.rules);

            console.log('[ARES] Aggressive deduplication complete, retrying...');
            continue; // Retry with deduplicated data
          }

          // If this is the last attempt or we couldn't fix the error, throw
          if (attempt >= maxRetries) {
            console.error('[ARES] All retry attempts failed, proceeding without database save');
            // Don't throw - allow the process to continue so files are still saved
            return false;
          }
        }
      }
      return false;
    };

    const dbSaveSuccess = await saveWithRetry(application);
    if (!dbSaveSuccess) {
      console.warn('[ARES] Database save failed, but continuing with file-based save...');
      emitProgress({
        type: 'warning',
        message: 'Application saved to files but database save had issues. You may need to refresh.',
        data: { partialSave: true }
      });
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
