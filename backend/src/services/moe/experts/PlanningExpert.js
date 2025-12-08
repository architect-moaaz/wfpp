/**
 * Planning Expert - Master Application Strategist
 *
 * This expert combines three critical roles:
 *
 * 1. SOFTWARE DEVELOPMENT MANAGER
 *    - Project decomposition and task prioritization
 *    - Risk assessment and mitigation strategies
 *    - Resource estimation and team skill requirements
 *    - Sprint/iteration planning with quality gates
 *    - Dependency management and critical path analysis
 *
 * 2. MASTER TECHNICAL ARCHITECT
 *    - System design and technology stack selection
 *    - Scalability, performance, and security architecture
 *    - API design principles and integration patterns
 *    - Database optimization and data flow design
 *    - Infrastructure and deployment architecture
 *    - Design patterns and best practices
 *
 * 3. AI ARCHITECT
 *    - AI/ML feature recommendations and integration points
 *    - Automation opportunities and intelligent workflows
 *    - Predictive analytics and smart decision-making
 *    - NLP/chatbot integration possibilities
 *    - Self-healing and adaptive system capabilities
 *    - LLM task orchestration and prompt engineering
 *
 * Output includes:
 * - Data models and entities with optimization strategies
 * - Workflows with AI-enhanced automation
 * - Forms with intelligent validation
 * - Pages with smart UX patterns
 * - Technical architecture decisions
 * - Implementation roadmap with risk mitigation
 */

const Anthropic = require('@anthropic-ai/sdk');

class PlanningExpert {
  constructor() {
    this.name = 'PlanningExpert';
    this.role = 'Master Application Strategist';
    this.expertise = [
      'Software Development Management',
      'Master Technical Architecture',
      'AI/ML Architecture'
    ];
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    // Expert knowledge bases for each role
    this.sdmKnowledge = this.initSDMKnowledge();
    this.architectKnowledge = this.initArchitectKnowledge();
    this.aiArchitectKnowledge = this.initAIArchitectKnowledge();
  }

  /**
   * Initialize Software Development Manager knowledge base
   */
  initSDMKnowledge() {
    return {
      riskCategories: [
        'technical_complexity',
        'integration_risk',
        'data_migration',
        'security_vulnerabilities',
        'performance_bottlenecks',
        'scalability_limits',
        'third_party_dependencies',
        'skill_gaps'
      ],
      prioritizationFrameworks: [
        'MoSCoW', // Must, Should, Could, Won't
        'RICE',   // Reach, Impact, Confidence, Effort
        'WSJF'    // Weighted Shortest Job First
      ],
      qualityGates: [
        'code_review',
        'unit_tests',
        'integration_tests',
        'security_scan',
        'performance_test',
        'accessibility_audit',
        'documentation_review'
      ],
      estimationTechniques: [
        'story_points',
        'ideal_days',
        't_shirt_sizing',
        'three_point_estimation'
      ]
    };
  }

  /**
   * Initialize Master Technical Architect knowledge base
   */
  initArchitectKnowledge() {
    return {
      architecturePatterns: [
        'layered',
        'microservices',
        'event_driven',
        'hexagonal',
        'clean_architecture',
        'CQRS',
        'saga_pattern'
      ],
      scalabilityStrategies: [
        'horizontal_scaling',
        'vertical_scaling',
        'caching_layers',
        'database_sharding',
        'read_replicas',
        'async_processing',
        'cdn_distribution'
      ],
      securityPatterns: [
        'authentication',
        'authorization',
        'encryption_at_rest',
        'encryption_in_transit',
        'input_validation',
        'rate_limiting',
        'audit_logging',
        'secret_management'
      ],
      apiDesignPrinciples: [
        'RESTful',
        'GraphQL',
        'versioning',
        'pagination',
        'filtering',
        'error_handling',
        'idempotency'
      ],
      databaseStrategies: [
        'normalization',
        'denormalization',
        'indexing',
        'partitioning',
        'connection_pooling',
        'query_optimization'
      ]
    };
  }

  /**
   * Initialize AI Architect knowledge base
   */
  initAIArchitectKnowledge() {
    return {
      aiCapabilities: [
        'natural_language_processing',
        'document_extraction',
        'sentiment_analysis',
        'classification',
        'anomaly_detection',
        'recommendation_engine',
        'predictive_analytics',
        'conversational_ai'
      ],
      automationOpportunities: [
        'data_validation',
        'content_generation',
        'decision_support',
        'workflow_optimization',
        'smart_routing',
        'auto_categorization',
        'intelligent_search'
      ],
      llmIntegrationPatterns: [
        'prompt_chaining',
        'retrieval_augmented_generation',
        'few_shot_learning',
        'function_calling',
        'streaming_responses',
        'context_management'
      ],
      selfHealingCapabilities: [
        'error_detection',
        'auto_retry',
        'fallback_strategies',
        'circuit_breaker',
        'graceful_degradation',
        'self_correction'
      ]
    };
  }

  /**
   * Analyzes requirements and creates comprehensive application plan
   */
  async createPlan(userRequirements, context = {}, eventEmitter = null) {
    console.log('[PlanningExpert] Creating comprehensive application plan...');

    try {
      // Try comprehensive plan first
      const planningPrompt = this.buildPlanningPrompt(userRequirements, context);

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8000, // Reduced from 16000 to prevent truncation
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: planningPrompt
        }]
      });

      const planText = response.content[0].text;

      // Check if response was truncated
      const wasTruncated = response.stop_reason === 'max_tokens';
      if (wasTruncated) {
        console.warn('[PlanningExpert] Response hit max_tokens limit, response may be truncated');
      }

      try {
        const plan = this.parsePlan(planText);

        console.log('[PlanningExpert] Plan created with:', {
          dataModels: plan.dataModels.length,
          workflows: plan.workflows.length,
          forms: plan.forms.length,
          pages: plan.pages.length
        });

        return plan;

      } catch (parseError) {
        console.error('[PlanningExpert] JSON parsing failed:', parseError.message);
        console.error('[PlanningExpert] Response length:', planText.length);
        console.error('[PlanningExpert] Was truncated:', wasTruncated);

        // If parsing failed and response was truncated, retry with simplified prompt
        if (wasTruncated || planText.length > 50000) {
          if (eventEmitter) {
            eventEmitter({
              type: 'thinking-step',
              data: {
                agent: 'Planning Expert',
                step: 'retry',
                content: 'Requirements too complex, generating simplified plan...'
              }
            });
          }

          console.log('[PlanningExpert] Retrying with simplified requirements...');
          return await this.createSimplifiedPlan(userRequirements, context, eventEmitter);
        }

        throw parseError;
      }

    } catch (error) {
      console.error('[PlanningExpert] Error creating plan:', error);

      // If it's not a parsing error that we already handled, try simplified plan
      if (!error.message.includes('Failed to parse application plan')) {
        console.log('[PlanningExpert] Attempting fallback to simplified plan...');

        if (eventEmitter) {
          eventEmitter({
            type: 'thinking-step',
            data: {
              agent: 'Planning Expert',
              step: 'fallback',
              content: 'Error occurred, creating simplified plan...'
            }
          });
        }

        try {
          return await this.createSimplifiedPlan(userRequirements, context, eventEmitter);
        } catch (fallbackError) {
          console.error('[PlanningExpert] Simplified plan also failed:', fallbackError);
          throw new Error(`Planning failed: ${error.message}. Simplified fallback also failed: ${fallbackError.message}`);
        }
      }

      throw error;
    }
  }

  /**
   * Creates a component-based plan (NEW ARCHITECTURE)
   * Returns lightweight component specs instead of full components
   * Prevents JSON truncation by avoiding monolithic generation
   */
  async createComponentPlan(userRequirements, context = {}, eventEmitter = null) {
    console.log('[PlanningExpert] Creating COMPONENT-BASED plan...');

    if (eventEmitter) {
      eventEmitter({
        type: 'thinking-step',
        data: {
          agent: 'Planning Expert',
          step: 'analyzing',
          content: 'Analyzing requirements and creating component specifications...'
        }
      });
    }

    const componentPlanPrompt = this.buildComponentPlanPrompt(userRequirements, context);

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 16000, // Increased to accommodate larger component plans without artificial limits
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: componentPlanPrompt
      }]
    });

    const planText = response.content[0].text;
    const componentPlan = this.parseComponentPlan(planText);

    // Determine generation strategy based on complexity
    const ComponentOrchestrator = require('../ComponentOrchestrator');
    const analysis = ComponentOrchestrator.determineStrategy(componentPlan);

    componentPlan.generationStrategy = componentPlan.generationStrategy || analysis.strategy;
    componentPlan.complexity = componentPlan.complexity || analysis.complexity;

    console.log('[PlanningExpert] Component plan created:', {
      components: componentPlan.componentSpecs.length,
      strategy: componentPlan.generationStrategy,
      complexity: componentPlan.complexity
    });

    if (eventEmitter) {
      eventEmitter({
        type: 'thinking-step',
        data: {
          agent: 'Planning Expert',
          step: 'plan-ready',
          content: `Plan ready: ${componentPlan.componentSpecs.length} components, using ${componentPlan.generationStrategy} strategy`
        }
      });
    }

    return componentPlan;
  }

  /**
   * Creates a simplified plan with minimal viable components
   * Used as fallback when comprehensive planning fails
   */
  async createSimplifiedPlan(userRequirements, context = {}, eventEmitter = null) {
    console.log('[PlanningExpert] Creating SIMPLIFIED application plan...');

    if (eventEmitter) {
      eventEmitter({
        type: 'thinking-step',
        data: {
          agent: 'Planning Expert',
          step: 'simplified',
          content: 'Generating minimal viable plan (1-2 workflows, 2-3 data models)...'
        }
      });
    }

    const simplifiedPrompt = this.buildSimplifiedPlanningPrompt(userRequirements, context);

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8000, // Increased from 4000 to handle ultra-simplified plans without truncation
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: simplifiedPrompt
      }]
    });

    const planText = response.content[0].text;
    const wasTruncated = response.stop_reason === 'max_tokens';

    if (wasTruncated) {
      console.warn('[PlanningExpert] Response was truncated, attempting continuation...');

      if (eventEmitter) {
        eventEmitter({
          type: 'thinking-step',
          data: {
            agent: 'Planning Expert',
            step: 'continuation',
            content: 'Response was partial, generating continuation...'
          }
        });
      }

      // Try to complete the truncated response
      return await this.completeTruncatedPlan(userRequirements, planText, context, eventEmitter);
    }

    // More aggressive JSON extraction for simplified plan
    let jsonText = planText.trim();

    // Try to extract JSON even if response is incomplete
    if (!jsonText.startsWith('{')) {
      const jsonMatch = planText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
    }

    try {
      const plan = this.parsePlan(jsonText);

      console.log('[PlanningExpert] Simplified plan created with:', {
        dataModels: plan.dataModels.length,
        workflows: plan.workflows.length,
        forms: plan.forms.length,
        pages: plan.pages.length
      });

      if (eventEmitter) {
        eventEmitter({
          type: 'thinking-step',
          data: {
            agent: 'Planning Expert',
            step: 'completed',
            content: `Simplified plan ready: ${plan.workflows.length} workflow(s), ${plan.dataModels.length} data model(s)`
          }
        });
      }

      return plan;

    } catch (error) {
      console.error('[PlanningExpert] Simplified plan parsing failed:', error);
      console.error('[PlanningExpert] Plan text length:', planText.length);
      console.error('[PlanningExpert] Plan text preview:', planText.substring(0, 500));

      throw new Error(`Failed to parse simplified plan: ${error.message}`);
    }
  }

  /**
   * Complete a truncated plan by calling the expert again with continuation prompt
   */
  async completeTruncatedPlan(userRequirements, partialPlanText, context = {}, eventEmitter = null) {
    console.log('[PlanningExpert] Attempting to complete truncated plan...');
    console.log('[PlanningExpert] Partial plan length:', partialPlanText.length);

    // Extract the partial JSON - find where it was cut off
    let partialJson = partialPlanText.trim();

    // Remove any markdown code blocks
    if (partialJson.includes('```json')) {
      const match = partialJson.match(/```json\s*([\s\S]*?)(?:```|$)/);
      if (match) partialJson = match[1].trim();
    } else if (partialJson.includes('```')) {
      const match = partialJson.match(/```\s*([\s\S]*?)(?:```|$)/);
      if (match) partialJson = match[1].trim();
    }

    // Find the last complete section to understand context
    const lastBraceIndex = partialJson.lastIndexOf('}');
    const contextSnippet = partialJson.substring(Math.max(0, lastBraceIndex - 500), lastBraceIndex + 1);

    const continuationPrompt = `You previously started generating an application plan but the response was truncated.

ORIGINAL REQUIREMENTS:
${userRequirements}

PARTIAL PLAN GENERATED SO FAR (last section):
${contextSnippet}

The response was cut off. Please generate a COMPLETE, SIMPLIFIED plan from scratch following these constraints:

CRITICAL CONSTRAINTS - MUST FOLLOW:
1. Create an ULTRA-MINIMAL viable plan - ONLY core functionality
2. Maximum 2 data models (absolute minimum)
3. Create ALL WORKFLOWS explicitly requested by user - DO NOT combine or skip any
4. Maximum 2 forms (essential only)
5. Maximum 2 pages (critical UI only)
6. Each data model: MAX 4-5 fields (keep it tiny!)
7. Each workflow: MAX 3-4 steps (keep it short!)
8. Each form: MAX 1 section with 3-4 fields
9. Descriptions: 1 sentence maximum
10. NO arrays for relationships, indexes, businessRules - leave them empty []
11. Prioritize EXTREME BREVITY over completeness

Generate a complete, valid JSON plan structure that is MUCH smaller than before:

${this.buildSimplifiedPlanningPrompt(userRequirements, context).split('Create a simplified application plan in the following JSON format:')[1]}`;

    try {
      const continuationResponse = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: continuationPrompt
        }]
      });

      const completedText = continuationResponse.content[0].text;

      // Check if still truncated
      if (continuationResponse.stop_reason === 'max_tokens') {
        console.error('[PlanningExpert] Continuation still truncated, falling back to minimal template');
        throw new Error('Plan too complex even after simplification');
      }

      // Extract and parse the completed JSON
      let jsonText = completedText.trim();
      if (!jsonText.startsWith('{')) {
        const jsonMatch = completedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
        }
      }

      const plan = this.parsePlan(jsonText);

      console.log('[PlanningExpert] Successfully completed truncated plan with:', {
        dataModels: plan.dataModels.length,
        workflows: plan.workflows.length,
        forms: plan.forms.length,
        pages: plan.pages.length
      });

      if (eventEmitter) {
        eventEmitter({
          type: 'thinking-step',
          data: {
            agent: 'Planning Expert',
            step: 'completed',
            content: `Plan completed after continuation: ${plan.workflows.length} workflow(s), ${plan.dataModels.length} data model(s)`
          }
        });
      }

      return plan;

    } catch (error) {
      console.error('[PlanningExpert] Failed to complete truncated plan:', error);
      throw new Error(`Failed to complete truncated plan: ${error.message}`);
    }
  }

  /**
   * Builds comprehensive planning prompt with three expert perspectives
   */
  buildPlanningPrompt(userRequirements, context) {
    return `You are a MASTER APPLICATION STRATEGIST combining three critical expert roles:

## ROLE 1: SOFTWARE DEVELOPMENT MANAGER
You bring expertise in:
- Project decomposition and task prioritization using MoSCoW/RICE frameworks
- Risk assessment across categories: ${this.sdmKnowledge.riskCategories.slice(0, 5).join(', ')}
- Quality gates: ${this.sdmKnowledge.qualityGates.join(', ')}
- Sprint planning, dependency management, and critical path analysis
- Resource estimation and team skill requirements

## ROLE 2: MASTER TECHNICAL ARCHITECT
You bring expertise in:
- Architecture patterns: ${this.architectKnowledge.architecturePatterns.join(', ')}
- Scalability strategies: ${this.architectKnowledge.scalabilityStrategies.slice(0, 5).join(', ')}
- Security patterns: ${this.architectKnowledge.securityPatterns.slice(0, 5).join(', ')}
- API design: ${this.architectKnowledge.apiDesignPrinciples.join(', ')}
- Database optimization: ${this.architectKnowledge.databaseStrategies.join(', ')}

## ROLE 3: AI ARCHITECT
You bring expertise in:
- AI capabilities: ${this.aiArchitectKnowledge.aiCapabilities.slice(0, 5).join(', ')}
- Automation opportunities: ${this.aiArchitectKnowledge.automationOpportunities.join(', ')}
- LLM integration: ${this.aiArchitectKnowledge.llmIntegrationPatterns.join(', ')}
- Self-healing systems: ${this.aiArchitectKnowledge.selfHealingCapabilities.join(', ')}

---

USER REQUIREMENTS:
${userRequirements}

${context.applicationDomain ? `APPLICATION DOMAIN: ${context.applicationDomain}` : ''}
${context.targetUsers ? `TARGET USERS: ${context.targetUsers}` : ''}
${context.complexity ? `COMPLEXITY LEVEL: ${context.complexity}` : ''}

Analyze these requirements through ALL THREE expert lenses and create a comprehensive application plan.

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
      "components": ["Component names"],
      "qualityGates": ["Required quality gates for this phase"]
    },
    "phase2": {
      "description": "Forms and user interfaces",
      "components": ["Component names"],
      "qualityGates": ["Required quality gates for this phase"]
    },
    "phase3": {
      "description": "Advanced features and integrations",
      "components": ["Component names"],
      "qualityGates": ["Required quality gates for this phase"]
    }
  },

  "technicalArchitecture": {
    "pattern": "layered|microservices|event_driven|hexagonal|clean_architecture",
    "rationale": "Why this pattern is appropriate",
    "scalabilityStrategy": {
      "approach": "horizontal|vertical|hybrid",
      "techniques": ["caching", "async_processing", "etc"],
      "estimatedLoad": "Expected concurrent users/requests"
    },
    "securityArchitecture": {
      "authMethod": "jwt|session|oauth2",
      "dataProtection": ["encryption_at_rest", "encryption_in_transit"],
      "accessControl": "RBAC|ABAC|ACL",
      "auditRequirements": ["What needs to be logged"]
    },
    "apiDesign": {
      "style": "REST|GraphQL|hybrid",
      "versioning": "URL|header|query",
      "conventions": ["Naming and structure conventions"]
    },
    "databaseStrategy": {
      "primaryStore": "postgresql|mysql|mongodb|etc",
      "optimizations": ["indexing", "partitioning", "etc"],
      "caching": "redis|memcached|in-memory|none"
    }
  },

  "riskAssessment": {
    "technicalRisks": [
      {
        "risk": "Risk description",
        "severity": "high|medium|low",
        "probability": "high|medium|low",
        "mitigation": "Mitigation strategy"
      }
    ],
    "integrationRisks": [
      {
        "risk": "Risk description",
        "severity": "high|medium|low",
        "mitigation": "Mitigation strategy"
      }
    ],
    "criticalPath": ["Ordered list of critical dependencies"]
  },

  "aiFeatures": {
    "recommended": [
      {
        "feature": "Feature name",
        "type": "nlp|classification|prediction|automation|conversational",
        "description": "What it does",
        "appliesTo": "Which component benefits",
        "implementation": "How to implement (LLM task, ML model, rule-based)"
      }
    ],
    "automationOpportunities": [
      {
        "process": "Process to automate",
        "currentState": "Manual/semi-automated",
        "proposedState": "Fully automated with AI",
        "benefit": "Expected benefit"
      }
    ],
    "intelligentWorkflows": [
      {
        "workflow": "Workflow name",
        "enhancement": "AI enhancement description",
        "triggerConditions": "When AI kicks in"
      }
    ],
    "selfHealingCapabilities": [
      {
        "component": "Component name",
        "errorScenario": "What can go wrong",
        "healingStrategy": "auto_retry|fallback|circuit_breaker|self_correction"
      }
    ]
  },

  "resourceRequirements": {
    "skillsRequired": ["frontend", "backend", "database", "ai_ml", "devops"],
    "complexity": "simple|moderate|complex|enterprise",
    "prioritization": "MoSCoW|RICE|WSJF"
  },

  "recommendations": [
    "Specific recommendation for implementation"
  ]
}

CRITICAL GUIDELINES (Apply ALL THREE Expert Perspectives):

## As Software Development Manager:
1. Decompose requirements into manageable, prioritized components
2. Identify dependencies and critical path
3. Assess risks and provide mitigation strategies
4. Define quality gates for each implementation phase
5. Consider team skills and resource requirements

## As Master Technical Architect:
6. Select appropriate architecture pattern with clear rationale
7. Design for scalability from the start
8. Implement security at every layer (authentication, authorization, encryption)
9. Optimize database design with proper indexing strategy
10. Define clean API contracts and integration patterns

## As AI Architect:
11. Identify AI/ML enhancement opportunities in workflows
12. Recommend automation for repetitive or decision-heavy tasks
13. Design intelligent validation and smart routing
14. Include self-healing capabilities for error scenarios
15. Leverage LLM tasks for content generation and analysis

## General:
16. Return ONLY valid JSON, no additional text
17. Be comprehensive but practical - focus on real value
18. Ensure all components are properly interconnected
19. Design for maintainability and future extensibility

Return the complete JSON plan now:`;
  }

  /**
   * Builds simplified planning prompt for fallback scenarios
   * Focuses on minimal viable product with core functionality only
   */
  buildSimplifiedPlanningPrompt(userRequirements, context) {
    return `You are an expert application architect. Create an ULTRA-SIMPLIFIED minimal viable product (MVP) plan for the following requirements.

USER REQUIREMENTS:
${userRequirements}

${context.applicationDomain ? `APPLICATION DOMAIN: ${context.applicationDomain}` : ''}

CRITICAL CONSTRAINTS - MUST FOLLOW:
1. Create an ULTRA-MINIMAL viable plan - ONLY core functionality
2. Maximum 3 data models (keep minimal)
3. Create ALL WORKFLOWS explicitly requested by user - DO NOT combine or skip any
4. Maximum 3 forms (essential only)
5. Maximum 3 pages (critical UI only)
6. Each data model: MAX 5-6 fields (keep it tiny!)
7. Each workflow: MAX 4-5 steps (keep it short!)
8. Each form: MAX 1 section with 4-5 fields
9. Descriptions: 1 sentence maximum
10. NO arrays for relationships, indexes, businessRules - leave them empty
11. Prioritize BREVITY over completeness
12. IMPORTANT: If user requests multiple workflows (e.g., "HR Workflow", "IT Setup Workflow"), create EACH as a separate workflow

Create a simplified application plan in the following JSON format:

{
  "overview": {
    "name": "Application name",
    "description": "Brief description (1-2 sentences)",
    "category": "Application category",
    "complexity": "simple",
    "estimatedComponents": {
      "dataModels": 2,
      "workflows": 1,
      "forms": 2,
      "pages": 2
    }
  },

  "dataModels": [
    {
      "name": "EntityName",
      "description": "Brief description",
      "type": "sql",
      "priority": "high",
      "fields": [
        {
          "name": "fieldName",
          "type": "string|number|date|boolean",
          "required": true|false,
          "description": "Brief purpose"
        }
      ],
      "relationships": [],
      "indexes": [],
      "businessRules": []
    }
  ],

  "workflows": [
    {
      "name": "WorkflowName1",
      "description": "Brief description",
      "type": "simple",
      "priority": "high",
      "triggerType": "manual|automatic",
      "steps": [
        {
          "name": "StepName",
          "type": "userTask|scriptTask|serviceTask",
          "description": "Brief description",
          "assignee": "role",
          "formRequired": true|false,
          "automation": "Brief automation logic using helper functions"
        }
      ],
      "dataModelsUsed": ["ModelName"],
      "formsRequired": ["FormName"],
      "integrations": [],
      "businessRules": []
    },
    {
      "name": "WorkflowName2 (add more if user requested)",
      "description": "Brief description",
      "type": "simple",
      "priority": "high",
      "triggerType": "manual|automatic",
      "steps": [],
      "dataModelsUsed": [],
      "formsRequired": [],
      "integrations": [],
      "businessRules": []
    }
  ],

  "forms": [
    {
      "name": "FormName",
      "description": "Brief description",
      "type": "simple",
      "priority": "high",
      "usedIn": ["WorkflowName"],
      "sections": [
        {
          "title": "Section Title",
          "fields": [
            {
              "name": "fieldName",
              "label": "Field Label",
              "type": "text|number|date|dropdown",
              "required": true|false,
              "validation": "",
              "description": "Brief purpose"
            }
          ]
        }
      ],
      "dataModel": "ModelName",
      "conditionalLogic": [],
      "calculations": []
    }
  ],

  "pages": [
    {
      "name": "PageName",
      "description": "Brief description",
      "type": "dashboard|list|form",
      "priority": "high",
      "layout": "grid",
      "components": [
        {
          "type": "table|form",
          "dataSource": "DataModel",
          "description": "Brief purpose"
        }
      ],
      "dataModelsUsed": ["ModelName"],
      "userRoles": ["User"],
      "navigation": "Main menu"
    }
  ],

  "integrations": [],

  "businessRules": [],

  "implementationPlan": {
    "phase1": {
      "description": "MVP implementation",
      "components": ["All core components"]
    }
  },

  "recommendations": [
    "Start with core functionality",
    "Expand features based on user feedback"
  ]
}

CRITICAL: Keep everything minimal and concise. Return ONLY valid JSON, no additional text.`;
  }

  /**
   * Parses the plan from Claude's response
   * Enhanced with better error handling and JSON extraction
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

      // If still doesn't start with {, try to extract JSON from text
      if (!jsonText.startsWith('{')) {
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
        } else {
          throw new Error('No valid JSON object found in response');
        }
      }

      // Try to parse the JSON
      let plan;
      try {
        plan = JSON.parse(jsonText);
      } catch (parseError) {
        // If JSON parse fails, log details for debugging
        console.error('[PlanningExpert] JSON parse error:', parseError.message);
        console.error('[PlanningExpert] JSON text length:', jsonText.length);
        console.error('[PlanningExpert] First 500 chars:', jsonText.substring(0, 500));
        console.error('[PlanningExpert] Last 500 chars:', jsonText.substring(Math.max(0, jsonText.length - 500)));

        // Try to identify where the JSON is broken
        const errorMatch = parseError.message.match(/position (\d+)/);
        if (errorMatch) {
          const errorPos = parseInt(errorMatch[1]);
          const contextStart = Math.max(0, errorPos - 100);
          const contextEnd = Math.min(jsonText.length, errorPos + 100);
          console.error('[PlanningExpert] Error context:', jsonText.substring(contextStart, contextEnd));
        }

        throw new Error(`JSON parsing failed: ${parseError.message}. Response may be truncated or malformed.`);
      }

      // Validate required fields exist
      const requiredFields = ['overview', 'dataModels', 'workflows', 'forms', 'pages'];
      const missingFields = requiredFields.filter(field => !plan[field]);

      if (missingFields.length > 0) {
        console.error('[PlanningExpert] Missing required fields:', missingFields);
        console.error('[PlanningExpert] Available fields:', Object.keys(plan));

        // Try to provide defaults for missing fields
        missingFields.forEach(field => {
          if (field === 'overview') {
            plan.overview = {
              name: 'Generated Application',
              description: 'Auto-generated application',
              category: 'Business',
              complexity: 'simple',
              estimatedComponents: { dataModels: 0, workflows: 0, forms: 0, pages: 0 }
            };
          } else {
            plan[field] = [];
          }
        });

        console.warn('[PlanningExpert] Added default values for missing fields');
      }

      // Ensure arrays are actually arrays
      ['dataModels', 'workflows', 'forms', 'pages'].forEach(field => {
        if (!Array.isArray(plan[field])) {
          console.warn(`[PlanningExpert] ${field} is not an array, converting...`);
          plan[field] = [];
        }
      });

      return plan;

    } catch (error) {
      console.error('[PlanningExpert] Error parsing plan:', error.message);

      // Log full text only if it's not too large
      if (planText.length < 10000) {
        console.error('[PlanningExpert] Full plan text:', planText);
      } else {
        console.error('[PlanningExpert] Plan text too large to log (', planText.length, 'chars)');
        console.error('[PlanningExpert] First 1000 chars:', planText.substring(0, 1000));
      }

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

  /**
   * Builds component plan prompt for lightweight component specifications
   * Returns a prompt that asks Claude to analyze requirements and create component specs
   */
  buildComponentPlanPrompt(userRequirements, context) {
    return `You are a MASTER APPLICATION STRATEGIST combining three expert roles:

## SOFTWARE DEVELOPMENT MANAGER
- Decompose work into prioritized components with clear dependencies
- Risk assessment and critical path identification
- Quality gates: ${this.sdmKnowledge.qualityGates.join(', ')}

## MASTER TECHNICAL ARCHITECT
- Architecture patterns: ${this.architectKnowledge.architecturePatterns.join(', ')}
- Security: ${this.architectKnowledge.securityPatterns.slice(0, 4).join(', ')}
- Database: ${this.architectKnowledge.databaseStrategies.join(', ')}

## AI ARCHITECT
- AI capabilities: ${this.aiArchitectKnowledge.aiCapabilities.slice(0, 4).join(', ')}
- Automation: ${this.aiArchitectKnowledge.automationOpportunities.slice(0, 4).join(', ')}
- Self-healing: ${this.aiArchitectKnowledge.selfHealingCapabilities.join(', ')}

---

Analyze the following requirements and create a lightweight component plan with SPECIFICATIONS ONLY (not full component definitions).

USER REQUIREMENTS:
${userRequirements}

${context.applicationDomain ? `APPLICATION DOMAIN: ${context.applicationDomain}` : ''}
${context.targetUsers ? `TARGET USERS: ${context.targetUsers}` : ''}
${context.complexity ? `COMPLEXITY LEVEL: ${context.complexity}` : ''}

CRITICAL GUIDELINES:
1. Return COMPONENT SPECIFICATIONS only - NOT full component definitions
2. Create ALL components needed to fully satisfy the requirements - no artificial limits
3. Each spec should include: type, name, purpose, description, and dependencies
4. The ComponentOrchestrator will handle generating each component later
5. Focus on identifying WHAT components are needed, not HOW to build them
6. Balance completeness with practicality - include all essential components

Create a component plan in the following JSON format:

{
  "overview": {
    "name": "Application name",
    "description": "Brief description (1-2 sentences)",
    "category": "Application category (e.g., HR, Finance, CRM, etc.)",
    "complexity": "simple|moderate|complex"
  },

  "componentSpecs": [
    {
      "type": "dataModel|workflow|form|page",
      "name": "ComponentName",
      "purpose": "Brief purpose statement (1 sentence)",
      "description": "Detailed description (2-3 sentences)",
      "dependencies": ["List of component names this depends on"],

      "workflowConfig": {
        "triggers": [
          {"type": "user_action|event|schedule|api|direct_call", "event": "event.name", "cron": "cron expression"}
        ],
        "isSubWorkflow": false,
        "emits": ["event.names.this.workflow.emits"],
        "listensTo": ["event.names.this.workflow.listens.to"]
      }
    }
  ],

  "workflowConnections": [
    {
      "source": "SourceWorkflowName",
      "target": "TargetWorkflowName",
      "via": "event|direct_call",
      "event": "event.name.if.via.is.event"
    }
  ]
}

IMPORTANT:
1. Create as many components as needed to fully satisfy the requirements
2. Include only SPECIFICATIONS - no full field definitions, workflow steps, or form layouts
3. Focus on the "what" not the "how" - the expert agents will fill in details later
4. Ensure dependencies are clear so components can be generated in correct order
5. Return ONLY valid JSON, no additional text
6. Prioritize completeness and functionality over arbitrary component count limits

MULTI-WORKFLOW GUIDELINES:
7. For complex applications, create MULTIPLE SEPARATE WORKFLOWS instead of one large workflow
8. Each workflow should handle a distinct business process or feature area
9. Use "workflowConfig" for workflow-type components to specify triggers and events
10. Use "workflowConnections" to define how workflows communicate (events or direct calls)
11. Mark reusable workflows as isSubWorkflow: true if they're called by other workflows
12. Common patterns:
    - Main workflow triggers via user_action, spawns sub-workflows via direct_call
    - Background workflows trigger via events emitted by other workflows
    - Scheduled workflows trigger via cron schedule

Return the component plan now:`;
  }

  /**
   * Parses component plan JSON from Claude's response
   * Handles markdown code blocks and extracts JSON similar to parsePlan
   * Enhanced to support multi-workflow architecture with connections
   */
  parseComponentPlan(planText) {
    try {
      // Extract JSON from the response (handle code blocks if present)
      let jsonText = planText.trim();

      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
      }

      // If still doesn't start with {, try to extract JSON from text
      if (!jsonText.startsWith('{')) {
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
        } else {
          throw new Error('No valid JSON object found in component plan response');
        }
      }

      // Try to parse the JSON
      let componentPlan;
      try {
        componentPlan = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('[PlanningExpert] Component plan JSON parse error:', parseError.message);
        console.error('[PlanningExpert] JSON text length:', jsonText.length);
        console.error('[PlanningExpert] First 500 chars:', jsonText.substring(0, 500));
        console.error('[PlanningExpert] Last 500 chars:', jsonText.substring(Math.max(0, jsonText.length - 500)));

        throw new Error(`Component plan JSON parsing failed: ${parseError.message}`);
      }

      // Validate required fields exist
      if (!componentPlan.overview) {
        componentPlan.overview = {
          name: 'Generated Application',
          description: 'Auto-generated application',
          category: 'Business',
          complexity: 'simple'
        };
        console.warn('[PlanningExpert] Added default overview to component plan');
      }

      if (!componentPlan.componentSpecs || !Array.isArray(componentPlan.componentSpecs)) {
        console.error('[PlanningExpert] componentSpecs is missing or not an array');
        throw new Error('Component plan must include componentSpecs array');
      }

      // Ensure workflowConnections is an array (may not be present for simple apps)
      if (!componentPlan.workflowConnections) {
        componentPlan.workflowConnections = [];
      } else if (!Array.isArray(componentPlan.workflowConnections)) {
        componentPlan.workflowConnections = [componentPlan.workflowConnections];
      }

      // Validate each component spec has required fields
      componentPlan.componentSpecs.forEach((spec, index) => {
        if (!spec.type || !spec.name) {
          console.error(`[PlanningExpert] Component spec at index ${index} missing required fields:`, spec);
          throw new Error(`Component spec at index ${index} must have type and name`);
        }

        // Ensure dependencies is an array
        if (!spec.dependencies) {
          spec.dependencies = [];
        } else if (!Array.isArray(spec.dependencies)) {
          spec.dependencies = [spec.dependencies];
        }

        // Add default workflowConfig for workflow-type components
        if (spec.type === 'workflow') {
          if (!spec.workflowConfig) {
            spec.workflowConfig = {
              triggers: [{ type: 'user_action' }],
              isSubWorkflow: false,
              emits: [],
              listensTo: []
            };
          } else {
            // Ensure required fields exist in workflowConfig
            if (!spec.workflowConfig.triggers || !Array.isArray(spec.workflowConfig.triggers)) {
              spec.workflowConfig.triggers = [{ type: 'user_action' }];
            }
            if (typeof spec.workflowConfig.isSubWorkflow !== 'boolean') {
              spec.workflowConfig.isSubWorkflow = false;
            }
            if (!spec.workflowConfig.emits) {
              spec.workflowConfig.emits = [];
            } else if (!Array.isArray(spec.workflowConfig.emits)) {
              spec.workflowConfig.emits = [spec.workflowConfig.emits];
            }
            if (!spec.workflowConfig.listensTo) {
              spec.workflowConfig.listensTo = [];
            } else if (!Array.isArray(spec.workflowConfig.listensTo)) {
              spec.workflowConfig.listensTo = [spec.workflowConfig.listensTo];
            }
          }
        }
      });

      // Validate workflow connections
      const workflowNames = componentPlan.componentSpecs
        .filter(s => s.type === 'workflow')
        .map(s => s.name);

      componentPlan.workflowConnections.forEach((conn, index) => {
        if (!conn.source || !conn.target || !conn.via) {
          console.warn(`[PlanningExpert] Workflow connection at index ${index} missing required fields:`, conn);
        }

        // Validate source and target exist as workflows
        if (conn.source && !workflowNames.includes(conn.source)) {
          console.warn(`[PlanningExpert] Workflow connection source "${conn.source}" not found in workflow specs`);
        }
        if (conn.target && !workflowNames.includes(conn.target)) {
          console.warn(`[PlanningExpert] Workflow connection target "${conn.target}" not found in workflow specs`);
        }

        // Ensure via is valid
        if (conn.via && !['event', 'direct_call'].includes(conn.via)) {
          console.warn(`[PlanningExpert] Invalid connection type "${conn.via}", defaulting to "event"`);
          conn.via = 'event';
        }
      });

      // Count workflow types for logging
      const workflowSpecs = componentPlan.componentSpecs.filter(s => s.type === 'workflow');
      const subWorkflowCount = workflowSpecs.filter(s => s.workflowConfig?.isSubWorkflow).length;
      const mainWorkflowCount = workflowSpecs.length - subWorkflowCount;

      console.log('[PlanningExpert] Successfully parsed component plan with', componentPlan.componentSpecs.length, 'component specs');
      console.log('[PlanningExpert] Workflows:', mainWorkflowCount, 'main +', subWorkflowCount, 'sub-workflows');
      console.log('[PlanningExpert] Workflow connections:', componentPlan.workflowConnections.length);

      return componentPlan;

    } catch (error) {
      console.error('[PlanningExpert] Error parsing component plan:', error.message);

      // Log full text only if it's not too large
      if (planText.length < 5000) {
        console.error('[PlanningExpert] Full component plan text:', planText);
      } else {
        console.error('[PlanningExpert] Component plan text too large to log (', planText.length, 'chars)');
        console.error('[PlanningExpert] First 1000 chars:', planText.substring(0, 1000));
      }

      throw new Error(`Failed to parse component plan: ${error.message}`);
    }
  }

  // ============================================================================
  // SPECIALIZED ANALYSIS METHODS (Three Expert Perspectives)
  // ============================================================================

  /**
   * SOFTWARE DEVELOPMENT MANAGER: Performs comprehensive risk assessment
   * @param {Object} plan - The application plan
   * @returns {Object} Risk assessment with severity, probability, and mitigation
   */
  assessRisks(plan) {
    console.log('[PlanningExpert:SDM] Performing risk assessment...');

    const risks = {
      technical: [],
      integration: [],
      resource: [],
      timeline: []
    };

    // Analyze complexity-based risks
    const componentCount = (plan.dataModels?.length || 0) +
                          (plan.workflows?.length || 0) +
                          (plan.forms?.length || 0) +
                          (plan.pages?.length || 0);

    if (componentCount > 15) {
      risks.technical.push({
        risk: 'High component count may lead to integration complexity',
        severity: 'high',
        probability: 'medium',
        category: 'technical_complexity',
        mitigation: 'Implement incremental integration with comprehensive testing at each phase'
      });
    }

    // Analyze workflow complexity
    plan.workflows?.forEach(workflow => {
      if (workflow.steps?.length > 10) {
        risks.technical.push({
          risk: `Complex workflow "${workflow.name}" with ${workflow.steps.length} steps`,
          severity: 'medium',
          probability: 'medium',
          category: 'technical_complexity',
          mitigation: 'Consider breaking into sub-workflows or implementing state machine pattern'
        });
      }

      // Check for approval workflows (higher risk)
      if (workflow.type === 'approval') {
        risks.integration.push({
          risk: `Approval workflow "${workflow.name}" requires careful access control`,
          severity: 'medium',
          probability: 'low',
          category: 'security_vulnerabilities',
          mitigation: 'Implement RBAC with audit logging for all approval actions'
        });
      }
    });

    // Analyze data model relationships
    const relationshipCount = plan.dataModels?.reduce((count, model) =>
      count + (model.relationships?.length || 0), 0) || 0;

    if (relationshipCount > 10) {
      risks.technical.push({
        risk: 'Complex data relationships may impact query performance',
        severity: 'medium',
        probability: 'medium',
        category: 'performance_bottlenecks',
        mitigation: 'Implement strategic indexing and consider read replicas for heavy queries'
      });
    }

    // Analyze integration points
    const integrations = plan.integrations || [];
    integrations.forEach(integration => {
      if (integration.type === 'api' || integration.type === 'external-service') {
        risks.integration.push({
          risk: `External dependency on "${integration.name}"`,
          severity: 'medium',
          probability: 'medium',
          category: 'third_party_dependencies',
          mitigation: 'Implement circuit breaker pattern and fallback mechanisms'
        });
      }
    });

    // Calculate critical path
    const criticalPath = this.calculateCriticalPath(plan);

    return {
      risks,
      criticalPath,
      overallRiskLevel: this.calculateOverallRiskLevel(risks),
      mitigationPriority: this.prioritizeMitigations(risks)
    };
  }

  /**
   * Calculate critical path through component dependencies
   */
  calculateCriticalPath(plan) {
    const components = [];

    // Data models come first
    plan.dataModels?.forEach(dm => {
      components.push({
        name: dm.name,
        type: 'dataModel',
        priority: dm.priority || 'high',
        dependencies: []
      });
    });

    // Workflows depend on data models
    plan.workflows?.forEach(wf => {
      components.push({
        name: wf.name,
        type: 'workflow',
        priority: wf.priority || 'medium',
        dependencies: wf.dataModelsUsed || []
      });
    });

    // Forms depend on data models and may be used by workflows
    plan.forms?.forEach(form => {
      components.push({
        name: form.name,
        type: 'form',
        priority: form.priority || 'medium',
        dependencies: form.dataModel ? [form.dataModel] : []
      });
    });

    // Pages depend on data models and forms
    plan.pages?.forEach(page => {
      components.push({
        name: page.name,
        type: 'page',
        priority: page.priority || 'low',
        dependencies: page.dataModelsUsed || []
      });
    });

    // Sort by dependencies (topological sort simplified)
    const sorted = components.sort((a, b) => {
      if (a.dependencies.includes(b.name)) return 1;
      if (b.dependencies.includes(a.name)) return -1;
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
    });

    return sorted.map(c => `${c.type}:${c.name}`);
  }

  /**
   * Calculate overall risk level from individual risks
   */
  calculateOverallRiskLevel(risks) {
    const allRisks = [
      ...risks.technical,
      ...risks.integration,
      ...risks.resource,
      ...risks.timeline
    ];

    const highCount = allRisks.filter(r => r.severity === 'high').length;
    const mediumCount = allRisks.filter(r => r.severity === 'medium').length;

    if (highCount >= 3 || (highCount >= 1 && mediumCount >= 4)) {
      return 'high';
    } else if (highCount >= 1 || mediumCount >= 2) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Prioritize mitigations based on severity and probability
   */
  prioritizeMitigations(risks) {
    const allRisks = [
      ...risks.technical,
      ...risks.integration,
      ...risks.resource,
      ...risks.timeline
    ];

    return allRisks
      .filter(r => r.severity === 'high' || (r.severity === 'medium' && r.probability === 'high'))
      .map(r => ({
        risk: r.risk,
        mitigation: r.mitigation,
        priority: r.severity === 'high' ? 1 : 2
      }))
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * MASTER TECHNICAL ARCHITECT: Recommends architecture pattern
   * @param {Object} plan - The application plan
   * @param {Object} context - Additional context
   * @returns {Object} Architecture recommendation with rationale
   */
  recommendArchitecture(plan, context = {}) {
    console.log('[PlanningExpert:Architect] Analyzing architecture requirements...');

    const analysis = {
      componentCount: (plan.dataModels?.length || 0) + (plan.workflows?.length || 0),
      hasComplexWorkflows: plan.workflows?.some(w => w.type === 'complex' || w.steps?.length > 7),
      hasApprovalFlows: plan.workflows?.some(w => w.type === 'approval'),
      hasExternalIntegrations: (plan.integrations?.length || 0) > 0,
      dataModelCount: plan.dataModels?.length || 0,
      expectedLoad: context.expectedLoad || 'medium'
    };

    let recommendation = {
      pattern: 'layered',
      rationale: '',
      scalabilityStrategy: {},
      securityArchitecture: {},
      apiDesign: {},
      databaseStrategy: {}
    };

    // Determine architecture pattern
    if (analysis.componentCount > 20 || analysis.hasExternalIntegrations) {
      recommendation.pattern = 'microservices';
      recommendation.rationale = 'High component count and external integrations suggest microservices for independent scaling and deployment';
    } else if (analysis.hasComplexWorkflows || analysis.hasApprovalFlows) {
      recommendation.pattern = 'event_driven';
      recommendation.rationale = 'Complex workflows with approval chains benefit from event-driven architecture for loose coupling and audit trails';
    } else if (analysis.dataModelCount > 10) {
      recommendation.pattern = 'clean_architecture';
      recommendation.rationale = 'Multiple data models require clean separation of concerns and well-defined boundaries';
    } else {
      recommendation.pattern = 'layered';
      recommendation.rationale = 'Simple to moderate complexity is well-served by a layered architecture with clear separation';
    }

    // Scalability strategy
    recommendation.scalabilityStrategy = {
      approach: analysis.expectedLoad === 'high' ? 'horizontal' : 'vertical',
      techniques: [
        'caching_layers',
        analysis.componentCount > 10 ? 'async_processing' : 'sync_processing',
        analysis.dataModelCount > 5 ? 'read_replicas' : 'single_db'
      ].filter(t => t !== 'sync_processing' && t !== 'single_db'),
      cacheStrategy: analysis.dataModelCount > 5 ? 'redis' : 'in-memory'
    };

    // Security architecture
    recommendation.securityArchitecture = {
      authMethod: analysis.hasApprovalFlows ? 'oauth2' : 'jwt',
      accessControl: analysis.hasApprovalFlows ? 'RBAC' : 'simple_roles',
      dataProtection: ['encryption_in_transit'],
      auditLevel: analysis.hasApprovalFlows ? 'comprehensive' : 'basic'
    };

    if (analysis.hasApprovalFlows || analysis.hasComplexWorkflows) {
      recommendation.securityArchitecture.dataProtection.push('encryption_at_rest');
      recommendation.securityArchitecture.auditLevel = 'comprehensive';
    }

    // API design
    recommendation.apiDesign = {
      style: analysis.componentCount > 15 ? 'GraphQL' : 'REST',
      versioning: 'URL',
      patterns: ['pagination', 'filtering', 'error_handling']
    };

    // Database strategy
    recommendation.databaseStrategy = {
      primaryStore: 'postgresql',
      optimizations: ['indexing'],
      connectionPooling: true
    };

    if (analysis.dataModelCount > 8) {
      recommendation.databaseStrategy.optimizations.push('partitioning');
    }
    if (analysis.expectedLoad === 'high') {
      recommendation.databaseStrategy.optimizations.push('read_replicas');
      recommendation.databaseStrategy.caching = 'redis';
    }

    return recommendation;
  }

  /**
   * AI ARCHITECT: Identifies AI enhancement opportunities
   * @param {Object} plan - The application plan
   * @returns {Object} AI feature recommendations
   */
  identifyAIOpportunities(plan) {
    console.log('[PlanningExpert:AI] Identifying AI enhancement opportunities...');

    const opportunities = {
      recommended: [],
      automationOpportunities: [],
      intelligentWorkflows: [],
      selfHealingCapabilities: []
    };

    // Analyze workflows for AI opportunities
    plan.workflows?.forEach(workflow => {
      // Decision points can benefit from AI
      const decisionSteps = workflow.steps?.filter(s =>
        s.type === 'decision' || s.type === 'scriptTask'
      ) || [];

      if (decisionSteps.length > 0) {
        opportunities.recommended.push({
          feature: `Smart Routing for ${workflow.name}`,
          type: 'classification',
          description: 'AI-powered decision making to route workflow based on content analysis',
          appliesTo: workflow.name,
          implementation: 'LLM task with classification prompt'
        });
      }

      // User tasks can benefit from auto-completion
      const userTasks = workflow.steps?.filter(s => s.type === 'userTask') || [];
      if (userTasks.length > 2) {
        opportunities.automationOpportunities.push({
          process: `Data entry in ${workflow.name}`,
          currentState: 'Manual form filling',
          proposedState: 'AI-assisted auto-completion with suggestions',
          benefit: 'Reduced data entry time and improved accuracy'
        });
      }

      // Approval workflows benefit from intelligent routing
      if (workflow.type === 'approval') {
        opportunities.intelligentWorkflows.push({
          workflow: workflow.name,
          enhancement: 'Predictive approval routing based on request type and historical patterns',
          triggerConditions: 'On workflow initiation'
        });
      }

      // Add self-healing for complex workflows
      if (workflow.steps?.length > 5) {
        opportunities.selfHealingCapabilities.push({
          component: workflow.name,
          errorScenario: 'Task timeout or failure',
          healingStrategy: 'auto_retry',
          fallbackAction: 'Escalate to supervisor with context summary'
        });
      }
    });

    // Analyze forms for AI opportunities
    plan.forms?.forEach(form => {
      const textFields = form.sections?.flatMap(s => s.fields || [])
        .filter(f => f.type === 'textarea' || f.type === 'text') || [];

      if (textFields.length > 0) {
        opportunities.recommended.push({
          feature: `Content Analysis for ${form.name}`,
          type: 'nlp',
          description: 'Extract entities, sentiment, and key information from text inputs',
          appliesTo: form.name,
          implementation: 'LLM task with extraction prompt'
        });
      }

      // Forms with many fields benefit from smart validation
      const fieldCount = form.sections?.reduce((count, s) =>
        count + (s.fields?.length || 0), 0) || 0;

      if (fieldCount > 5) {
        opportunities.recommended.push({
          feature: `Intelligent Validation for ${form.name}`,
          type: 'automation',
          description: 'AI-powered validation that understands context and relationships between fields',
          appliesTo: form.name,
          implementation: 'Rule-based with LLM fallback for complex cases'
        });
      }
    });

    // Data models can benefit from anomaly detection
    plan.dataModels?.forEach(model => {
      if (model.type === 'timeseries' || model.fields?.some(f => f.type === 'number')) {
        opportunities.recommended.push({
          feature: `Anomaly Detection for ${model.name}`,
          type: 'prediction',
          description: 'Detect unusual patterns or outliers in numeric data',
          appliesTo: model.name,
          implementation: 'Statistical analysis with ML model'
        });
      }
    });

    // Add general recommendations
    if (plan.workflows?.length > 0) {
      opportunities.recommended.push({
        feature: 'Conversational Assistant',
        type: 'conversational',
        description: 'Natural language interface for workflow status queries and task management',
        appliesTo: 'All workflows',
        implementation: 'LLM-powered chatbot with function calling'
      });
    }

    return opportunities;
  }

  /**
   * Generate implementation roadmap combining all three expert perspectives
   * @param {Object} plan - The application plan
   * @param {Object} context - Additional context
   * @returns {Object} Comprehensive implementation roadmap
   */
  generateRoadmap(plan, context = {}) {
    console.log('[PlanningExpert] Generating comprehensive implementation roadmap...');

    const riskAssessment = this.assessRisks(plan);
    const architecture = this.recommendArchitecture(plan, context);
    const aiOpportunities = this.identifyAIOpportunities(plan);

    const phases = [];

    // Phase 1: Foundation (SDM + Architect perspective)
    phases.push({
      name: 'Foundation',
      description: 'Core infrastructure and data models',
      components: [
        ...(plan.dataModels?.filter(d => d.priority === 'high').map(d => d.name) || []),
        'Database schema',
        'API foundation',
        'Authentication setup'
      ],
      qualityGates: ['code_review', 'unit_tests', 'security_scan'],
      architectureNotes: `Implement ${architecture.pattern} pattern with ${architecture.databaseStrategy.primaryStore}`,
      risks: riskAssessment.risks.technical.slice(0, 2)
    });

    // Phase 2: Core Workflows (All perspectives)
    phases.push({
      name: 'Core Workflows',
      description: 'Primary business processes and forms',
      components: [
        ...(plan.workflows?.filter(w => w.priority === 'high').map(w => w.name) || []),
        ...(plan.forms?.filter(f => f.priority === 'high').map(f => f.name) || [])
      ],
      qualityGates: ['code_review', 'unit_tests', 'integration_tests'],
      aiEnhancements: aiOpportunities.intelligentWorkflows.slice(0, 2),
      risks: riskAssessment.risks.integration.slice(0, 2)
    });

    // Phase 3: User Interface (Architect + AI perspective)
    phases.push({
      name: 'User Interface',
      description: 'Pages and user experience',
      components: [
        ...(plan.pages?.map(p => p.name) || []),
        ...(plan.forms?.filter(f => f.priority !== 'high').map(f => f.name) || [])
      ],
      qualityGates: ['code_review', 'integration_tests', 'accessibility_audit'],
      aiEnhancements: aiOpportunities.automationOpportunities.slice(0, 2)
    });

    // Phase 4: AI & Advanced Features
    if (aiOpportunities.recommended.length > 0) {
      phases.push({
        name: 'AI Enhancement',
        description: 'Intelligent features and automation',
        components: aiOpportunities.recommended.slice(0, 5).map(r => r.feature),
        qualityGates: ['code_review', 'integration_tests', 'performance_test'],
        selfHealing: aiOpportunities.selfHealingCapabilities
      });
    }

    // Phase 5: Integration & Optimization
    if ((plan.integrations?.length || 0) > 0) {
      phases.push({
        name: 'Integration & Optimization',
        description: 'External integrations and performance tuning',
        components: [
          ...(plan.integrations?.map(i => i.name) || []),
          ...architecture.scalabilityStrategy.techniques
        ],
        qualityGates: ['integration_tests', 'performance_test', 'security_scan']
      });
    }

    return {
      phases,
      totalPhases: phases.length,
      criticalPath: riskAssessment.criticalPath,
      overallRiskLevel: riskAssessment.overallRiskLevel,
      architecturePattern: architecture.pattern,
      keyAIFeatures: aiOpportunities.recommended.slice(0, 3).map(r => r.feature),
      mitigationPriority: riskAssessment.mitigationPriority
    };
  }

  /**
   * Get expert summary for logging/display
   */
  getExpertSummary() {
    return {
      name: this.name,
      role: this.role,
      expertise: this.expertise,
      capabilities: {
        sdm: Object.keys(this.sdmKnowledge),
        architect: Object.keys(this.architectKnowledge),
        aiArchitect: Object.keys(this.aiArchitectKnowledge)
      }
    };
  }
}

module.exports = PlanningExpert;
