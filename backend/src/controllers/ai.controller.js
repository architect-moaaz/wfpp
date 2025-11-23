const aiWorkflowGenerator = require('../services/ai-workflow-generator');
const { workflowKnowledgeBase } = require('../utils/workflow-knowledge-base');

/**
 * Generate workflow from natural language requirements
 */
const generateWorkflow = async (req, res) => {
  try {
    const { requirements, conversationHistory } = req.body;

    if (!requirements || requirements.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Requirements are required'
      });
    }

    // Generate workflow using AI service
    const result = await aiWorkflowGenerator.generateWorkflow(requirements);

    res.status(200).json({
      success: true,
      data: {
        thinking: result.thinking,
        workflow: result.workflow,
        summary: result.summary,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('AI Generation Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get available workflow components
 */
const getComponents = (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: workflowKnowledgeBase.components
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get workflow patterns
 */
const getPatterns = (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: workflowKnowledgeBase.workflowPatterns
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  generateWorkflow,
  getComponents,
  getPatterns
};
