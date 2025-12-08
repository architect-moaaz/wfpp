/**
 * TextToRulesService
 *
 * Converts natural language descriptions into structured business rules using AI
 * Integrates with ARES for intelligent rule generation
 */

const Anthropic = require('@anthropic-ai/sdk');

class TextToRulesService {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  /**
   * Convert natural language text to structured rule
   */
  async convertTextToRule(text, context = {}) {
    try {
      const prompt = this.buildPrompt(text, context);

      const message = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const response = message.content[0].text;
      const rule = this.parseRuleFromResponse(response);

      return {
        success: true,
        rule,
        confidence: this.calculateConfidence(rule),
        explanation: this.extractExplanation(response)
      };
    } catch (error) {
      console.error('[TextToRulesService] Error converting text to rule:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Build prompt for AI rule generation
   */
  buildPrompt(text, context) {
    const { dataModels = [], existingRules = [], applicationDomain = '' } = context;

    let prompt = `You are an expert business rules analyst. Convert the following natural language description into a structured business rule.

**User Description:**
"${text}"
`;

    if (applicationDomain) {
      prompt += `\n**Application Domain:** ${applicationDomain}\n`;
    }

    if (dataModels.length > 0) {
      prompt += `\n**Available Data Models:**\n`;
      dataModels.forEach(model => {
        prompt += `- ${model.name}: ${model.fields.map(f => f.name).join(', ')}\n`;
      });
    }

    prompt += `\n**Task:**
Generate a structured business rule with the following components:

1. **Rule Metadata:**
   - name: A clear, descriptive name for the rule
   - description: What the rule does
   - type: One of [validation, decision, transformation, notification, automation]
   - priority: Integer 0-100 (higher = more important)

2. **Conditions:**
   Format as either:
   - { "all": [conditions] } for AND logic
   - { "any": [conditions] } for OR logic

   Each condition should have:
   - field: The data field to check
   - operator: One of [equals, notEquals, greaterThan, lessThan, greaterThanOrEqual, lessThanOrEqual, contains, notContains, startsWith, endsWith, isEmpty, isNotEmpty, in, notIn]
   - value: The value to compare against

3. **Actions:**
   Format as { "actions": [actions] }

   Each action should have:
   - type: One of [setVariable, sendEmail, sendNotification, callWebhook, updateRecord, createRecord, log, stopWorkflow, throwError]
   - params: Object with action-specific parameters

**Example Output:**
\`\`\`json
{
  "name": "High Value Order Notification",
  "description": "Send notification when order value exceeds $1000",
  "type": "notification",
  "priority": 80,
  "conditions": {
    "all": [
      {
        "field": "order.total",
        "operator": "greaterThan",
        "value": "1000"
      },
      {
        "field": "order.status",
        "operator": "equals",
        "value": "pending"
      }
    ]
  },
  "actions": {
    "actions": [
      {
        "type": "sendNotification",
        "params": {
          "message": "High value order received",
          "notificationType": "info"
        }
      }
    ]
  }
}
\`\`\`

**Instructions:**
1. Analyze the user description carefully
2. Identify the conditions that trigger the rule
3. Determine what actions should occur
4. Choose appropriate operators and action types
5. Return ONLY valid JSON matching the structure above
6. Do not include any explanation outside the JSON

Generate the rule now:`;

    return prompt;
  }

  /**
   * Parse rule from AI response
   */
  parseRuleFromResponse(response) {
    try {
      // Extract JSON from response (handle code blocks)
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) ||
                        response.match(/```\n([\s\S]*?)\n```/) ||
                        [null, response];

      const jsonStr = jsonMatch[1] || response;
      const rule = JSON.parse(jsonStr.trim());

      // Validate structure
      if (!rule.name || !rule.conditions || !rule.actions) {
        throw new Error('Invalid rule structure');
      }

      // Set defaults
      rule.type = rule.type || 'validation';
      rule.priority = rule.priority || 0;
      rule.is_active = true;

      return rule;
    } catch (error) {
      console.error('[TextToRulesService] Error parsing rule:', error);
      throw new Error('Failed to parse rule from AI response: ' + error.message);
    }
  }

  /**
   * Calculate confidence score for generated rule
   */
  calculateConfidence(rule) {
    let score = 0;

    // Name present and descriptive
    if (rule.name && rule.name.length > 10) score += 20;

    // Description present
    if (rule.description && rule.description.length > 20) score += 20;

    // Valid conditions
    const hasConditions = (rule.conditions?.all && rule.conditions.all.length > 0) ||
                          (rule.conditions?.any && rule.conditions.any.length > 0);
    if (hasConditions) score += 30;

    // Valid actions
    if (rule.actions?.actions && rule.actions.actions.length > 0) score += 30;

    return Math.min(100, score);
  }

  /**
   * Extract explanation from response
   */
  extractExplanation(response) {
    // Extract text before JSON block as explanation
    const beforeJson = response.split('```')[0].trim();
    if (beforeJson && beforeJson.length > 10 && !beforeJson.includes('{')) {
      return beforeJson;
    }
    return 'Rule generated successfully from natural language description.';
  }

  /**
   * Suggest improvements for a rule description
   */
  async suggestImprovements(ruleDescription, context = {}) {
    try {
      const prompt = `Analyze this business rule description and suggest improvements to make it more precise and complete:

"${ruleDescription}"

Provide:
1. Missing information that should be clarified
2. Ambiguous terms that need definition
3. Edge cases that should be considered
4. Suggested rephrasing for clarity

Keep suggestions concise and actionable.`;

      const message = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return {
        success: true,
        suggestions: message.content[0].text
      };
    } catch (error) {
      console.error('[TextToRulesService] Error suggesting improvements:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Batch convert multiple rule descriptions
   */
  async batchConvert(descriptions, context = {}) {
    const results = [];

    for (const desc of descriptions) {
      const result = await this.convertTextToRule(desc, context);
      results.push({
        description: desc,
        ...result
      });
    }

    return {
      success: true,
      results,
      totalProcessed: descriptions.length,
      successful: results.filter(r => r.success).length
    };
  }

  /**
   * Validate a generated rule
   */
  validateRule(rule) {
    const errors = [];

    if (!rule.name || rule.name.trim().length === 0) {
      errors.push('Rule name is required');
    }

    if (!rule.conditions) {
      errors.push('Conditions are required');
    } else {
      const hasConditions = (rule.conditions.all && rule.conditions.all.length > 0) ||
                           (rule.conditions.any && rule.conditions.any.length > 0);
      if (!hasConditions) {
        errors.push('At least one condition is required');
      }
    }

    if (!rule.actions || !rule.actions.actions || rule.actions.actions.length === 0) {
      errors.push('At least one action is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = TextToRulesService;
