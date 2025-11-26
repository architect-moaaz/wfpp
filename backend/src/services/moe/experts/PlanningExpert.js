/**
 * Planning Expert - Creates comprehensive application blueprints
 *
 * This expert analyzes user requirements and creates a detailed plan that includes:
 * - Data models and entities
 * - Workflows and business processes
 * - Forms for data capture
 * - Pages and UI screens
 * - Business rules and validations
 * - Integration requirements
 * - Implementation priorities
 */

const Anthropic = require('@anthropic-ai/sdk');

class PlanningExpert {
  constructor() {
    this.name = 'PlanningExpert';
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  /**
   * Analyzes requirements and creates comprehensive application plan
   */
  async createPlan(userRequirements, context = {}) {
    console.log('[PlanningExpert] Creating comprehensive application plan...');

    try {
      const planningPrompt = this.buildPlanningPrompt(userRequirements, context);

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 16000, // Increased for complex applications
        temperature: 0.3, // Lower temperature for more consistent planning
        messages: [{
          role: 'user',
          content: planningPrompt
        }]
      });

      const planText = response.content[0].text;
      const plan = this.parsePlan(planText);

      console.log('[PlanningExpert] Plan created with:', {
        dataModels: plan.dataModels.length,
        workflows: plan.workflows.length,
        forms: plan.forms.length,
        pages: plan.pages.length
      });

      return plan;

    } catch (error) {
      console.error('[PlanningExpert] Error creating plan:', error);
      throw error;
    }
  }

  /**
   * Builds comprehensive planning prompt
   */
  buildPlanningPrompt(userRequirements, context) {
    return `You are an expert application architect. Analyze the following requirements and create a comprehensive, detailed application plan.

USER REQUIREMENTS:
${userRequirements}

${context.applicationDomain ? `APPLICATION DOMAIN: ${context.applicationDomain}` : ''}
${context.targetUsers ? `TARGET USERS: ${context.targetUsers}` : ''}
${context.complexity ? `COMPLEXITY LEVEL: ${context.complexity}` : ''}

Create a detailed application plan in the following JSON format:

{
  "overview": {
    "name": "Application name",
    "description": "Brief description",
    "category": "Application category (e.g., HR, Finance, CRM, etc.)",
    "complexity": "simple|moderate|complex",
    "estimatedComponents": {
      "dataModels": 0,
      "workflows": 0,
      "forms": 0,
      "pages": 0
    }
  },

  "dataModels": [
    {
      "name": "EntityName",
      "description": "Entity description",
      "type": "sql|nosql|graph|timeseries",
      "priority": "high|medium|low",
      "fields": [
        {
          "name": "fieldName",
          "type": "string|number|date|boolean|reference|array",
          "required": true|false,
          "description": "Field purpose"
        }
      ],
      "relationships": [
        {
          "relatedEntity": "OtherEntity",
          "type": "one-to-one|one-to-many|many-to-many",
          "description": "Relationship description"
        }
      ],
      "indexes": ["field1", "field2"],
      "businessRules": ["Rule description"]
    }
  ],

  "workflows": [
    {
      "name": "WorkflowName",
      "description": "Workflow description",
      "type": "simple|approval|complex|dataProcessing|sequential",
      "priority": "high|medium|low",
      "triggerType": "manual|automatic|scheduled|event",
      "steps": [
        {
          "name": "StepName",
          "type": "userTask|scriptTask|serviceTask|decision|notification|llmTask",
          "description": "Step description",
          "assignee": "role or user",
          "formRequired": true|false,
          "automation": "Description of automation logic (for scriptTask, must use only available helper functions: updateField, getField, mergeData, addToArray, filterArray, validateRequired, formatString, getCurrentDate, formatDate, log)"
        }
      ],
      "dataModelsUsed": ["ModelName"],
      "formsRequired": ["FormName"],
      "integrations": ["Integration description"],
      "businessRules": ["Rule description"]
    }
  ],

  "forms": [
    {
      "name": "FormName",
      "description": "Form description",
      "type": "simple|advanced|wizard|mobile",
      "priority": "high|medium|low",
      "usedIn": ["WorkflowName or standalone"],
      "sections": [
        {
          "title": "Section Title",
          "fields": [
            {
              "name": "fieldName",
              "label": "Field Label",
              "type": "text|number|date|dropdown|checkbox|radio|textarea|file",
              "required": true|false,
              "validation": "Validation rules",
              "description": "Field purpose"
            }
          ]
        }
      ],
      "dataModel": "AssociatedDataModel",
      "conditionalLogic": ["Logic description"],
      "calculations": ["Calculation description"]
    }
  ],

  "pages": [
    {
      "name": "PageName",
      "description": "Page description",
      "type": "dashboard|list|detail|form|report",
      "priority": "high|medium|low",
      "layout": "grid|sidebar|tabs|wizard",
      "components": [
        {
          "type": "table|chart|form|card|stats|timeline",
          "dataSource": "DataModel or API",
          "description": "Component purpose"
        }
      ],
      "dataModelsUsed": ["ModelName"],
      "userRoles": ["Role that can access"],
      "navigation": "How users navigate to this page"
    }
  ],

  "integrations": [
    {
      "name": "IntegrationName",
      "type": "api|webhook|email|sms|external-service",
      "description": "Integration purpose",
      "usedBy": ["Workflow or Page"],
      "configuration": "Configuration requirements"
    }
  ],

  "businessRules": [
    {
      "name": "RuleName",
      "description": "Rule description",
      "type": "validation|calculation|automation|notification",
      "appliesTo": "Entity or Workflow",
      "logic": "Business logic description"
    }
  ],

  "implementationPlan": {
    "phase1": {
      "description": "Core data models and basic workflows",
      "components": ["Component names"]
    },
    "phase2": {
      "description": "Forms and user interfaces",
      "components": ["Component names"]
    },
    "phase3": {
      "description": "Advanced features and integrations",
      "components": ["Component names"]
    }
  },

  "recommendations": [
    "Specific recommendation for implementation"
  ]
}

IMPORTANT:
1. Be thorough and specific - include all necessary components
2. Think about the complete user journey
3. Consider data flow between components
4. Identify all CRUD operations needed
5. Include appropriate validation and business rules
6. Prioritize components appropriately
7. Ensure relationships between data models are clear
8. Include all forms needed for workflows
9. Design pages that make sense for end users
10. Return ONLY the JSON, no additional text

Return the complete JSON plan now:`;
  }

  /**
   * Parses the plan from Claude's response
   */
  parsePlan(planText) {
    try {
      // Extract JSON from the response (handle code blocks if present)
      let jsonText = planText.trim();

      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
      }

      const plan = JSON.parse(jsonText);

      // Validate required fields
      if (!plan.overview || !plan.dataModels || !plan.workflows || !plan.forms || !plan.pages) {
        throw new Error('Plan missing required sections');
      }

      return plan;
    } catch (error) {
      console.error('[PlanningExpert] Error parsing plan:', error);
      console.error('Plan text:', planText);
      throw new Error(`Failed to parse application plan: ${error.message}`);
    }
  }

  /**
   * Generates expert routing recommendations based on the plan
   */
  recommendExperts(plan) {
    const recommendations = {
      dataModel: [],
      workflow: [],
      forms: [],
      pages: [],
      mobile: []
    };

    // Analyze data models
    plan.dataModels.forEach(model => {
      if (model.type === 'sql') {
        recommendations.dataModel.push('sql');
      } else if (model.type === 'nosql') {
        recommendations.dataModel.push('nosql');
      } else if (model.type === 'graph') {
        recommendations.dataModel.push('graph');
      } else if (model.type === 'timeseries') {
        recommendations.dataModel.push('timeSeries');
      }
    });

    // Analyze workflows
    plan.workflows.forEach(workflow => {
      if (workflow.type === 'simple') {
        recommendations.workflow.push('simple');
      } else if (workflow.type === 'approval') {
        recommendations.workflow.push('approval');
      } else if (workflow.type === 'complex') {
        recommendations.workflow.push('complex');
      } else if (workflow.type === 'dataProcessing') {
        recommendations.workflow.push('dataProcessing');
      } else if (workflow.type === 'sequential') {
        recommendations.workflow.push('sequential');
      }
    });

    // Analyze forms
    plan.forms.forEach(form => {
      if (form.type === 'simple') {
        recommendations.forms.push('simple');
      } else if (form.type === 'advanced') {
        recommendations.forms.push('advanced');
      } else if (form.type === 'wizard') {
        recommendations.forms.push('wizard');
      } else if (form.type === 'mobile') {
        recommendations.forms.push('mobile');
      }
    });

    // Analyze pages
    if (plan.pages && plan.pages.length > 0) {
      recommendations.pages.push('generic');
    }

    // Remove duplicates
    Object.keys(recommendations).forEach(key => {
      recommendations[key] = [...new Set(recommendations[key])];
    });

    return recommendations;
  }

  /**
   * Generates detailed specifications for each component
   */
  generateComponentSpecifications(plan) {
    return {
      dataModelSpecs: plan.dataModels.map(model => ({
        ...model,
        expertType: this.getDataModelExpertType(model.type),
        generationPrompt: this.buildDataModelPrompt(model, plan)
      })),

      workflowSpecs: plan.workflows.map(workflow => ({
        ...workflow,
        expertType: this.getWorkflowExpertType(workflow.type),
        generationPrompt: this.buildWorkflowPrompt(workflow, plan)
      })),

      formSpecs: plan.forms.map(form => ({
        ...form,
        expertType: this.getFormExpertType(form.type),
        generationPrompt: this.buildFormPrompt(form, plan)
      })),

      pageSpecs: plan.pages.map(page => ({
        ...page,
        expertType: 'generic',
        generationPrompt: this.buildPagePrompt(page, plan)
      }))
    };
  }

  getDataModelExpertType(type) {
    const mapping = {
      'sql': 'sql',
      'nosql': 'nosql',
      'graph': 'graph',
      'timeseries': 'timeSeries'
    };
    return mapping[type] || 'sql';
  }

  getWorkflowExpertType(type) {
    const mapping = {
      'simple': 'simple',
      'approval': 'approval',
      'complex': 'complex',
      'dataProcessing': 'dataProcessing',
      'sequential': 'sequential'
    };
    return mapping[type] || 'simple';
  }

  getFormExpertType(type) {
    const mapping = {
      'simple': 'simple',
      'advanced': 'advanced',
      'wizard': 'wizard',
      'mobile': 'mobile'
    };
    return mapping[type] || 'simple';
  }

  buildDataModelPrompt(model, plan) {
    return `Create a data model for: ${model.name}
Description: ${model.description}
Fields: ${JSON.stringify(model.fields, null, 2)}
Relationships: ${JSON.stringify(model.relationships, null, 2)}
Business Rules: ${model.businessRules.join('; ')}`;
  }

  buildWorkflowPrompt(workflow, plan) {
    return `Create a workflow for: ${workflow.name}
Description: ${workflow.description}
Steps: ${JSON.stringify(workflow.steps, null, 2)}
Trigger: ${workflow.triggerType}
Data Models Used: ${workflow.dataModelsUsed.join(', ')}
Forms Required: ${workflow.formsRequired.join(', ')}`;
  }

  buildFormPrompt(form, plan) {
    return `Create a form for: ${form.name}
Description: ${form.description}
Sections: ${JSON.stringify(form.sections, null, 2)}
Data Model: ${form.dataModel}
Used In: ${form.usedIn.join(', ')}`;
  }

  buildPagePrompt(page, plan) {
    return `Create a page for: ${page.name}
Description: ${page.description}
Layout: ${page.layout}
Components: ${JSON.stringify(page.components, null, 2)}
Data Models: ${page.dataModelsUsed.join(', ')}`;
  }
}

module.exports = PlanningExpert;
