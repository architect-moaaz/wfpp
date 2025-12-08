/**
 * Rule API Routes
 * Endpoints for managing business rules
 */

const express = require('express');
const router = express.Router();
const RuleService = require('../services/RuleService');
const TextToRulesService = require('../services/TextToRulesService');
const RulesEvaluator = require('../services/RulesEvaluator');
const ComputationalGraphEngine = require('../services/ComputationalGraphEngine');

const ruleService = new RuleService();
const textToRulesService = new TextToRulesService();
const rulesEvaluator = new RulesEvaluator();
const graphEngine = new ComputationalGraphEngine();

/**
 * POST /api/rules
 * Create a new rule
 */
router.post('/', async (req, res) => {
  try {
    const result = await ruleService.createRule(req.body);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('[Rule API] Create rule error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/rules/:id
 * Get rule by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await ruleService.getRuleById(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('[Rule API] Get rule error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/applications/:applicationId/rules
 * Get all rules for an application
 */
router.get('/application/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;
    const filters = {
      workflow_id: req.query.workflow_id,
      node_id: req.query.node_id,
      type: req.query.type,
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined
    };

    const result = await ruleService.getRulesByApplication(applicationId, filters);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('[Rule API] Get application rules error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/workflows/:workflowId/rules
 * Get all rules for a workflow
 */
router.get('/workflow/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const result = await ruleService.getRulesByWorkflow(workflowId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('[Rule API] Get workflow rules error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/nodes/:nodeId/rules
 * Get all rules for a workflow node
 */
router.get('/node/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const result = await ruleService.getRulesByNode(nodeId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('[Rule API] Get node rules error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/rules/:id
 * Update a rule
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await ruleService.updateRule(id, req.body);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('[Rule API] Update rule error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/rules/:id
 * Delete a rule
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await ruleService.deleteRule(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('[Rule API] Delete rule error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/rules/:id/attach-node
 * Attach rule to a workflow node
 */
router.post('/:id/attach-node', async (req, res) => {
  try {
    const { id } = req.params;
    const { node_id } = req.body;

    if (!node_id) {
      return res.status(400).json({
        success: false,
        error: 'node_id is required'
      });
    }

    const result = await ruleService.attachRuleToNode(id, node_id);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('[Rule API] Attach rule to node error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/rules/:id/detach-node
 * Detach rule from workflow node
 */
router.post('/:id/detach-node', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await ruleService.detachRuleFromNode(id);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('[Rule API] Detach rule from node error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/rules/:id/evaluate
 * Evaluate a rule against provided context
 */
router.post('/:id/evaluate', async (req, res) => {
  try {
    const { id } = req.params;
    const context = req.body;

    const result = await ruleService.evaluateRule(id, context);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('[Rule API] Evaluate rule error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/rules/text-to-rule
 * Convert natural language description to structured rule
 */
router.post('/text-to-rule', async (req, res) => {
  try {
    const { text, context } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Text description is required'
      });
    }

    const result = await textToRulesService.convertTextToRule(text, context || {});

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('[Rule API] Text to rule error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/rules/text-to-rule/suggest
 * Get suggestions for improving a rule description
 */
router.post('/text-to-rule/suggest', async (req, res) => {
  try {
    const { text, context } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Text description is required'
      });
    }

    const result = await textToRulesService.suggestImprovements(text, context || {});

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('[Rule API] Suggest improvements error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/rules/evaluate/application/:applicationId
 * Evaluate all rules for an application with computational graph
 */
router.post('/evaluate/application/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;
    const context = req.body;

    const result = await rulesEvaluator.evaluateApplicationRules(applicationId, context);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('[Rule API] Evaluate application rules error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/rules/evaluate/node/:nodeId
 * Evaluate all rules for a workflow node
 */
router.post('/evaluate/node/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const context = req.body;

    const result = await rulesEvaluator.evaluateNodeRules(nodeId, context);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('[Rule API] Evaluate node rules error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/rules/graph/build
 * Build computational graph for a set of rules
 */
router.post('/graph/build', async (req, res) => {
  try {
    const { rules } = req.body;

    if (!Array.isArray(rules)) {
      return res.status(400).json({
        success: false,
        error: 'Rules array is required'
      });
    }

    const graphResult = graphEngine.buildGraph(rules);
    const cycles = graphEngine.detectCircularDependencies();
    const criticalPath = graphEngine.getCriticalPath();
    const statistics = graphEngine.getStatistics();

    res.status(200).json({
      success: true,
      graph: graphResult.graph,
      executionOrder: graphResult.executionOrder,
      levels: graphResult.levels,
      cycles,
      criticalPath,
      statistics
    });
  } catch (error) {
    console.error('[Rule API] Build graph error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/rules/graph/application/:applicationId
 * Get computational graph for all rules in an application
 */
router.get('/graph/application/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;

    // Get all rules for the application
    const rulesResult = await ruleService.getRulesByApplication(applicationId, {
      is_active: true
    });

    if (!rulesResult.success) {
      return res.status(400).json(rulesResult);
    }

    const rules = rulesResult.rules || [];

    if (rules.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No active rules found',
        graph: { nodes: [], edges: [] },
        executionOrder: [],
        levels: []
      });
    }

    // Build graph
    const graphResult = graphEngine.buildGraph(rules);
    const cycles = graphEngine.detectCircularDependencies();
    const criticalPath = graphEngine.getCriticalPath();
    const statistics = graphEngine.getStatistics();

    res.status(200).json({
      success: true,
      graph: graphResult.graph,
      executionOrder: graphResult.executionOrder,
      levels: graphResult.levels,
      cycles,
      criticalPath,
      statistics
    });
  } catch (error) {
    console.error('[Rule API] Get application graph error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
