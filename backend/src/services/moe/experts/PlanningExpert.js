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
   *
   * For complex requirements (ERP-level), uses CHUNKED PLANNING:
   * 1. Decompose into modules
   * 2. Generate specs per module
   * 3. Stitch together with cross-module connections
   */
  async createComponentPlan(userRequirements, context = {}, eventEmitter = null) {
    console.log('[PlanningExpert] Creating COMPONENT-BASED plan...');

    // Check if requirements are complex enough to need chunked planning
    const isComplex = this.isComplexRequirement(userRequirements);
    console.log('[PlanningExpert] Complexity detection:', isComplex ? 'COMPLEX - using chunked planning' : 'SIMPLE - using single-pass planning');

    if (isComplex) {
      return await this.createChunkedComponentPlan(userRequirements, context, eventEmitter);
    }

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
   * Detect if requirements are complex enough to need chunked planning
   * Uses GENERIC metrics - works for any application type
   */
  isComplexRequirement(requirements) {
    const text = requirements.toLowerCase();

    // Metric 1: Length of requirements (longer = more complex)
    const wordCount = text.split(/\s+/).length;
    const isLengthy = wordCount > 80; // Lowered from 150

    // Metric 2: Count numbered/bulleted items (features, steps, etc.)
    // Match: "1.", "1)", "- ", "* ", with or without leading whitespace
    const numberedItems = (text.match(/\d+[\.\)]\s|^\s*[-*]\s|,\s*\d+[\.\)]/gm) || []).length;
    const hasMultipleItems = numberedItems >= 4; // Lowered from 5

    // Metric 3: Count distinct workflow/process indicators
    const workflowIndicators = [
      /workflow|process|flow|pipeline/gi,
      /step|phase|stage/gi,
      /then|after|next|finally|first|second|third/gi,
      /approval|review|validate|verify/gi,
      /notify|alert|email|send|notification/gi,
      /manage|management|tracking|monitor/gi
    ];
    const workflowMatches = workflowIndicators.reduce((count, pattern) => {
      return count + (text.match(pattern) || []).length;
    }, 0);
    const hasComplexWorkflows = workflowMatches >= 5; // Lowered from 8

    // Metric 4: Count distinct entity/data types mentioned (matches plurals too)
    const entityPatterns = [
      /\b(users?|customers?|clients?|members?|employees?|staff|admins?|managers?|suppliers?|vendors?|teams?)\b/gi,
      /\b(products?|items?|goods|services?|orders?|transactions?|purchases?|sales?)\b/gi,
      /\b(forms?|screens?|pages?|views?|dashboards?|reports?|analytics)\b/gi,
      /\b(documents?|files?|attachments?|records?|data|database)\b/gi,
      /\b(payments?|invoices?|billing|subscriptions?|pricing|finance|accounting)\b/gi,
      /\b(notifications?|messages?|alerts?|emails?|sms|communication)\b/gi,
      /\b(schedules?|calendars?|bookings?|appointments?|events?|meetings?)\b/gi,
      /\b(inventory|stock|warehouse|shipping|delivery|logistics)\b/gi,
      /\b(category|categories|tags?|types?|status|priority|priorities|levels?|roles?|permissions?)\b/gi,
      /\b(comments?|reviews?|ratings?|feedback|notes?|tasks?|projects?)\b/gi,
      /\b(hr|payroll|manufacturing|production|crm|erp|workflow)\b/gi
    ];
    const entityMatches = entityPatterns.filter(pattern => pattern.test(text)).length;
    const hasMultipleEntities = entityMatches >= 4;

    // Metric 5: Explicit complexity indicators
    const complexityKeywords = [
      'comprehensive', 'complete', 'full', 'entire', 'all-in-one',
      'enterprise', 'complex', 'advanced', 'sophisticated', 'robust',
      'multiple', 'various', 'different', 'several', 'many',
      'integration', 'integrate', 'connect', 'sync', 'platform', 'system'
    ];
    const complexityScore = complexityKeywords.filter(kw => text.includes(kw)).length;
    const hasComplexityKeywords = complexityScore >= 2; // Lowered from 3

    // Metric 6: Count commas and "and" (indicates listing multiple features)
    const andCount = (text.match(/\band\b/gi) || []).length;
    const commaCount = (text.match(/,/g) || []).length;
    const hasMultipleListing = andCount >= 4 || commaCount >= 8; // More sensitive

    // Calculate overall complexity score (max 12 points)
    const scores = {
      lengthy: isLengthy ? 2 : 0,
      multipleItems: hasMultipleItems ? 2 : 0,
      complexWorkflows: hasComplexWorkflows ? 2 : 0,
      multipleEntities: hasMultipleEntities ? 2 : 0,
      complexityKeywords: hasComplexityKeywords ? 2 : 0,
      multipleListing: hasMultipleListing ? 2 : 0
    };

    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

    // Complex if score >= 4 (out of 12 possible) - more sensitive threshold
    const isComplex = totalScore >= 4;

    console.log('[PlanningExpert] Complexity analysis:', {
      wordCount,
      numberedItems,
      workflowMatches,
      entityMatches,
      complexityScore,
      andCount,
      commaCount,
      scores,
      totalScore,
      isComplex
    });

    return isComplex;
  }

  /**
   * CHUNKED PLANNING: Break complex requirements into modules and plan each separately
   * This avoids giant JSON responses that get truncated
   */
  async createChunkedComponentPlan(userRequirements, context = {}, eventEmitter = null) {
    console.log('[PlanningExpert] Starting CHUNKED planning for complex requirements...');

    if (eventEmitter) {
      eventEmitter({
        type: 'thinking-step',
        data: {
          agent: 'Planning Expert',
          step: 'chunked-start',
          content: 'Complex requirements detected. Breaking down into modules for reliable generation...'
        }
      });
    }

    // Phase 1: Decompose into modules
    const modules = await this.decomposeIntoModules(userRequirements, eventEmitter);
    console.log('[PlanningExpert] Identified modules:', modules.map(m => m.name));

    // Phase 2: Generate component specs for each module
    const allComponentSpecs = [];
    const moduleOverviews = [];

    for (let i = 0; i < modules.length; i++) {
      const module = modules[i];

      if (eventEmitter) {
        eventEmitter({
          type: 'thinking-step',
          data: {
            agent: 'Planning Expert',
            step: 'module-planning',
            content: `Planning module ${i + 1}/${modules.length}: ${module.name}...`
          }
        });
      }

      const moduleSpecs = await this.planModuleComponents(module, userRequirements, eventEmitter);

      // Tag specs with their module
      moduleSpecs.forEach(spec => {
        spec.module = module.name;
      });

      allComponentSpecs.push(...moduleSpecs);
      moduleOverviews.push({
        name: module.name,
        description: module.description,
        componentCount: moduleSpecs.length
      });

      console.log(`[PlanningExpert] Module "${module.name}" planned: ${moduleSpecs.length} components`);
    }

    // Phase 3: Generate cross-module connections
    if (eventEmitter) {
      eventEmitter({
        type: 'thinking-step',
        data: {
          agent: 'Planning Expert',
          step: 'integration',
          content: 'Generating cross-module integrations and connections...'
        }
      });
    }

    const workflowConnections = await this.generateCrossModuleConnections(modules, allComponentSpecs, eventEmitter);

    // Build final component plan
    const componentPlan = {
      overview: {
        name: context.applicationName || 'Generated Application',
        description: `Application with ${modules.length} integrated modules: ${modules.map(m => m.name).join(', ')}`,
        category: context.category || 'Business',
        complexity: 'complex',
        modules: moduleOverviews
      },
      componentSpecs: allComponentSpecs,
      workflowConnections: workflowConnections,
      generationStrategy: 'sequential', // Complex apps always use sequential
      complexity: 'complex'
    };

    console.log('[PlanningExpert] Chunked planning complete:', {
      modules: modules.length,
      totalComponents: allComponentSpecs.length,
      connections: workflowConnections.length
    });

    if (eventEmitter) {
      eventEmitter({
        type: 'thinking-step',
        data: {
          agent: 'Planning Expert',
          step: 'plan-ready',
          content: `Chunked plan ready: ${modules.length} modules, ${allComponentSpecs.length} components`
        }
      });
    }

    return componentPlan;
  }

  /**
   * Phase 1: Decompose requirements into logical modules
   * Works for ANY application type - not just enterprise apps
   */
  async decomposeIntoModules(userRequirements, eventEmitter = null) {
    console.log('[PlanningExpert] Decomposing requirements into modules...');

    const prompt = `Analyze these application requirements and break them down into logical MODULES or FEATURE AREAS.

A module is a self-contained functional area that can be developed independently.
Examples of modules: "User Management", "Content Creation", "Booking System", "Payment Processing", "Notifications", "Reports", "Settings", etc.

REQUIREMENTS:
${userRequirements}

Break this down into logical modules. Each module should group related functionality together.

Respond with a JSON array of modules:
[
  {
    "name": "Module Name",
    "description": "Brief description of what this module handles",
    "keyEntities": ["Entity1", "Entity2"],
    "keyWorkflows": ["Workflow1", "Workflow2"],
    "keyForms": ["Form1", "Form2"]
  }
]

RULES:
- Create 2-8 modules depending on complexity
- Each module should be focused on one functional area
- Identify the main data entities, workflows, and forms for each module
- Keep module names short and descriptive
- Return ONLY the JSON array, no other text`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text.trim();

    try {
      // Extract JSON array
      let jsonText = text;
      if (!jsonText.startsWith('[')) {
        const match = jsonText.match(/\[[\s\S]*\]/);
        if (match) jsonText = match[0];
      }

      const modules = JSON.parse(jsonText);
      console.log('[PlanningExpert] Decomposed into', modules.length, 'modules');
      return modules;
    } catch (error) {
      console.error('[PlanningExpert] Failed to parse modules:', error);
      // Fallback: create a single module with everything
      return [{
        name: 'Core Application',
        description: 'Main application functionality',
        keyEntities: [],
        keyWorkflows: [],
        keyForms: []
      }];
    }
  }

  /**
   * Phase 2: Generate component specs for a single module
   */
  async planModuleComponents(module, fullRequirements, eventEmitter = null) {
    console.log(`[PlanningExpert] Planning components for module: ${module.name}`);

    const prompt = `Generate component specifications for the "${module.name}" module.

MODULE DETAILS:
- Name: ${module.name}
- Description: ${module.description}
- Key Entities: ${(module.keyEntities || []).join(', ')}
- Key Workflows: ${(module.keyWorkflows || []).join(', ')}
- Key Forms: ${(module.keyForms || []).join(', ')}

FULL APPLICATION CONTEXT:
${fullRequirements}

Generate component specs for THIS MODULE ONLY. Include:
1. Data models (entities) for this module
2. Workflows for this module's processes
3. Forms for data entry in this module
4. Pages/screens for this module

Respond with JSON array of component specs:
[
  {
    "type": "dataModel",
    "name": "Product",
    "description": "Product master data",
    "fields": ["id", "name", "sku", "price", "quantity"],
    "dependencies": []
  },
  {
    "type": "workflow",
    "name": "Stock Receiving",
    "description": "Process for receiving inventory",
    "steps": ["Create Receipt", "Verify Items", "Update Stock"],
    "dependencies": ["Product"],
    "workflowConfig": {
      "triggers": [{"type": "user_action"}],
      "isSubWorkflow": false
    }
  },
  {
    "type": "form",
    "name": "Product Form",
    "description": "Form for product data entry",
    "formType": "standard",
    "dependencies": ["Product"],
    "formAssociation": {
      "workflowName": "Stock Receiving",
      "nodeName": "Create Receipt"
    }
  }
]

Return ONLY the JSON array. Keep specs lightweight - no full implementations.`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 6000,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text.trim();

    try {
      let jsonText = text;
      if (!jsonText.startsWith('[')) {
        const match = jsonText.match(/\[[\s\S]*\]/);
        if (match) jsonText = match[0];
      }

      // Attempt repair if needed
      let specs;
      try {
        specs = JSON.parse(jsonText);
      } catch (parseError) {
        const repaired = this.repairTruncatedJson(jsonText);
        if (repaired) {
          specs = JSON.parse(repaired);
        } else {
          throw parseError;
        }
      }

      return specs;
    } catch (error) {
      console.error(`[PlanningExpert] Failed to parse module "${module.name}" specs:`, error);
      // Return minimal specs based on module hints
      return this.createFallbackModuleSpecs(module);
    }
  }

  /**
   * Create fallback specs when AI generation fails for a module
   */
  createFallbackModuleSpecs(module) {
    const specs = [];

    // Create data models from key entities
    (module.keyEntities || []).forEach(entity => {
      specs.push({
        type: 'dataModel',
        name: entity,
        description: `${entity} data model`,
        fields: ['id', 'name', 'createdAt', 'updatedAt'],
        dependencies: []
      });
    });

    // Create workflows from key workflows
    (module.keyWorkflows || []).forEach(workflow => {
      specs.push({
        type: 'workflow',
        name: workflow,
        description: `${workflow} process`,
        steps: ['Start', 'Process', 'Complete'],
        dependencies: module.keyEntities || [],
        workflowConfig: {
          triggers: [{ type: 'user_action' }],
          isSubWorkflow: false
        }
      });
    });

    // Create forms from key forms
    (module.keyForms || []).forEach(form => {
      specs.push({
        type: 'form',
        name: form,
        description: `${form} for data entry`,
        formType: 'standard',
        dependencies: []
      });
    });

    return specs;
  }

  /**
   * Phase 3: Generate cross-module workflow connections
   */
  async generateCrossModuleConnections(modules, allSpecs, eventEmitter = null) {
    console.log('[PlanningExpert] Generating cross-module connections...');

    // Get workflow names by module
    const workflowsByModule = {};
    modules.forEach(m => {
      workflowsByModule[m.name] = allSpecs
        .filter(s => s.type === 'workflow' && s.module === m.name)
        .map(s => s.name);
    });

    const prompt = `Given these modules and their workflows, identify logical connections between them.

MODULES AND WORKFLOWS:
${JSON.stringify(workflowsByModule, null, 2)}

Generate workflow connections that represent how data or control flows between modules.
For example: Sales Order completion might trigger Inventory update.

Respond with JSON array:
[
  {
    "fromWorkflow": "Sales Order Processing",
    "toWorkflow": "Inventory Update",
    "trigger": "on_complete",
    "description": "Update inventory when sale is confirmed"
  }
]

Return ONLY the JSON array. Maximum 10 connections for most important integrations.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2000,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      });

      const text = response.content[0].text.trim();
      let jsonText = text;
      if (!jsonText.startsWith('[')) {
        const match = jsonText.match(/\[[\s\S]*\]/);
        if (match) jsonText = match[0];
      }

      return JSON.parse(jsonText);
    } catch (error) {
      console.error('[PlanningExpert] Failed to generate cross-module connections:', error);
      return [];
    }
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
   *
   * NEW ARCHITECTURE: Forms are planned as SEPARATE components with explicit workflow/node associations
   * This allows each expert to generate their own components independently
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
      "type": "dataModel",
      "name": "EntityName",
      "purpose": "Brief purpose statement",
      "description": "Detailed description",
      "dependencies": [],
      "dataModelAssociation": {
        "usedByWorkflows": ["WorkflowName1", "WorkflowName2"],
        "usedByForms": ["FormName1", "FormName2"],
        "isPrimary": true,
        "entityType": "main|supporting|lookup"
      },
      "fieldHints": ["id", "name", "status", "createdAt", "updatedAt"]
    },
    {
      "type": "workflow",
      "name": "WorkflowName",
      "purpose": "Brief purpose statement",
      "description": "Detailed description of workflow steps and logic",
      "dependencies": ["DataModelName"],
      "workflowConfig": {
        "triggers": [{"type": "user_action"}],
        "isSubWorkflow": false,
        "emits": [],
        "listensTo": []
      }
    },
    {
      "type": "form",
      "name": "Request Submission Form",
      "purpose": "Collect initial request data from user",
      "description": "Form for submitting new requests with all required fields",
      "dependencies": ["DataModelName"],
      "formAssociation": {
        "forWorkflow": "WorkflowName",
        "forNodeType": "startProcess",
        "forNodeLabel": "Start - Submit Request",
        "dataModel": "EntityName"
      },
      "fieldHints": ["requesterName", "requestType", "description", "priority"]
    },
    {
      "type": "form",
      "name": "Review Form",
      "purpose": "Allow reviewer to approve/reject with comments",
      "description": "Form for reviewing and making decisions on requests",
      "dependencies": ["DataModelName"],
      "formAssociation": {
        "forWorkflow": "WorkflowName",
        "forNodeType": "userTask",
        "forNodeLabel": "Review Request",
        "dataModel": "EntityName"
      },
      "fieldHints": ["status", "reviewerComments", "approvalDecision"]
    },
    {
      "type": "page",
      "name": "PageName",
      "purpose": "Brief purpose statement",
      "description": "Detailed description",
      "dependencies": ["WorkflowName"],
      "pageAssociation": {
        "forWorkflow": "WorkflowName",
        "pageType": "dashboard|list|detail|form|report|auth",
        "displaysForms": ["FormName1", "FormName2"],
        "displaysDataModels": ["DataModelName"],
        "navigationFlow": {
          "previousPage": null,
          "nextPage": "NextPageName",
          "alternateLinks": ["OtherPageName"]
        },
        "isEntryPoint": false,
        "requiresAuth": true
      }
    },
    {
      "type": "rule",
      "name": "RuleName",
      "purpose": "Brief purpose statement",
      "description": "Business rule logic description",
      "dependencies": ["DataModelName"],
      "ruleAssociation": {
        "forWorkflow": "WorkflowName",
        "forForm": "FormName",
        "forDataModel": "DataModelName",
        "ruleType": "validation|calculation|visibility|routing|notification",
        "triggerEvent": "onSubmit|onChange|onLoad|onTransition",
        "affectedFields": ["fieldName1", "fieldName2"]
      },
      "ruleLogicHints": ["condition description", "action description"]
    }
  ],

  "sharedDataModels": [
    {
      "name": "SharedEntityName",
      "purpose": "Shared across multiple workflows",
      "usedBy": ["Workflow1", "Workflow2"]
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

CRITICAL - COMPONENT ARCHITECTURE:
1. Plan ALL components SEPARATELY: data models, workflows, forms, and pages
2. Each component type will be generated by its respective expert agent
3. Forms are SEPARATE components with "formAssociation" specifying their workflow/node binding
4. Each form MUST specify which workflow and node it belongs to via "formAssociation"
5. Forms will be pre-linked to workflow nodes during generation using consistent IDs

FORM COMPONENT STRUCTURE:
- type: "form"
- name: Descriptive form name
- purpose: What the form accomplishes
- description: Detailed description of the form's role
- dependencies: Array of data models this form uses
- formAssociation: Object specifying workflow binding
  - forWorkflow: Name of the workflow this form belongs to
  - forNodeType: "startProcess" | "userTask" (the node type that uses this form)
  - forNodeLabel: Human-readable label for the node (e.g., "Submit Request", "Manager Approval")
  - dataModel: Primary data model this form reads/writes
- fieldHints: Array of suggested field names (not full definitions)

IMPORTANT:
1. Create as many components as needed to fully satisfy the requirements
2. Include only SPECIFICATIONS - no full field definitions, workflow steps, or form layouts
3. Focus on the "what" not the "how" - the expert agents will fill in details later
4. Ensure dependencies are clear so components can be generated in correct order
5. Return ONLY valid JSON, no additional text
6. Prioritize completeness and functionality over arbitrary component count limits
7. EVERY userTask and startProcess node in a workflow MUST have a corresponding form component

MULTI-WORKFLOW GUIDELINES:
8. For complex applications, create MULTIPLE SEPARATE WORKFLOWS instead of one large workflow
9. Each workflow should handle a distinct business process or feature area
10. Use "workflowConfig" for workflow-type components to specify triggers and events
11. Use "workflowConnections" to define how workflows communicate (events or direct calls)
12. Mark reusable workflows as isSubWorkflow: true if they're called by other workflows
13. Create ONE form component for EACH userTask/startProcess node across ALL workflows
14. Forms for different workflows will have unique IDs like: form_{workflowId}_{nodeId}

AUTHENTICATION & SECURITY REQUIREMENTS:
15. ALWAYS include authentication pages and forms for any application that has user-facing features
16. Create the following auth components by default:
    - AuthWorkflow: A workflow handling the authentication process (login, register, password reset)
    - LoginForm: Form with email/password fields, "forgot password" link
    - RegistrationForm: Form with name, email, password, confirm password fields
    - ForgotPasswordForm: Form with email field for password reset request
    - ResetPasswordForm: Form with new password and confirm password fields
    - LoginPage: Page displaying LoginForm with link to registration (pageType: "auth", isEntryPoint: true)
    - RegisterPage: Page displaying RegistrationForm with link to login (pageType: "auth")
    - ForgotPasswordPage: Page displaying ForgotPasswordForm (pageType: "auth")
    - ResetPasswordPage: Page displaying ResetPasswordForm (pageType: "auth")
17. Auth pages should be linked in navigationFlow:
    - LoginPage.nextPage → Dashboard (after successful login)
    - LoginPage has links to RegisterPage and ForgotPasswordPage
    - RegisterPage.nextPage → Dashboard (after successful registration)
    - ForgotPasswordPage.nextPage → LoginPage (after sending reset email)
    - ResetPasswordPage.nextPage → LoginPage (after password reset)
18. Auth pages use pageAssociation with:
    - pageType: "auth"
    - isEntryPoint: true (for LoginPage only)
    - requiresAuth: false (auth pages are public)
19. All OTHER pages should have requiresAuth: true in pageAssociation
20. The main Dashboard page should be the landing page AFTER authentication

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

        // Attempt to repair truncated JSON
        console.log('[PlanningExpert] Attempting to repair truncated JSON...');
        const repairedJson = this.repairTruncatedJson(jsonText);

        if (repairedJson) {
          try {
            componentPlan = JSON.parse(repairedJson);
            console.log('[PlanningExpert] Successfully repaired and parsed JSON');
          } catch (repairError) {
            console.error('[PlanningExpert] Repair attempt failed:', repairError.message);
            throw new Error(`Component plan JSON parsing failed: ${parseError.message}`);
          }
        } else {
          throw new Error(`Component plan JSON parsing failed: ${parseError.message}`);
        }
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

        // Validate form components have formAssociation
        if (spec.type === 'form') {
          if (!spec.formAssociation) {
            console.warn(`[PlanningExpert] Form spec "${spec.name}" missing formAssociation, adding empty association`);
            spec.formAssociation = {
              forWorkflow: null,
              forNodeType: null,
              forNodeLabel: null,
              dataModel: null
            };
          } else {
            // Ensure required fields exist in formAssociation
            if (!spec.formAssociation.forWorkflow) {
              console.warn(`[PlanningExpert] Form "${spec.name}" missing forWorkflow in formAssociation`);
            }
            if (!spec.formAssociation.forNodeType) {
              console.warn(`[PlanningExpert] Form "${spec.name}" missing forNodeType in formAssociation`);
            }
          }

          // Ensure fieldHints is an array
          if (!spec.fieldHints) {
            spec.fieldHints = [];
          } else if (!Array.isArray(spec.fieldHints)) {
            spec.fieldHints = [spec.fieldHints];
          }
        }

        // Validate dataModel components have dataModelAssociation
        if (spec.type === 'dataModel') {
          if (!spec.dataModelAssociation) {
            console.warn(`[PlanningExpert] DataModel spec "${spec.name}" missing dataModelAssociation, adding default`);
            spec.dataModelAssociation = {
              usedByWorkflows: [],
              usedByForms: [],
              isPrimary: false,
              entityType: 'main'
            };
          } else {
            // Ensure arrays exist
            if (!spec.dataModelAssociation.usedByWorkflows) {
              spec.dataModelAssociation.usedByWorkflows = [];
            }
            if (!spec.dataModelAssociation.usedByForms) {
              spec.dataModelAssociation.usedByForms = [];
            }
          }

          // Ensure fieldHints is an array
          if (!spec.fieldHints) {
            spec.fieldHints = [];
          } else if (!Array.isArray(spec.fieldHints)) {
            spec.fieldHints = [spec.fieldHints];
          }
        }

        // Validate page components have pageAssociation
        if (spec.type === 'page') {
          if (!spec.pageAssociation) {
            console.warn(`[PlanningExpert] Page spec "${spec.name}" missing pageAssociation, adding default`);
            spec.pageAssociation = {
              forWorkflow: null,
              pageType: 'dashboard',
              displaysForms: [],
              displaysDataModels: [],
              navigationFlow: { previousPage: null, nextPage: null }
            };
          } else {
            // Ensure arrays exist
            if (!spec.pageAssociation.displaysForms) {
              spec.pageAssociation.displaysForms = [];
            }
            if (!spec.pageAssociation.displaysDataModels) {
              spec.pageAssociation.displaysDataModels = [];
            }
            if (!spec.pageAssociation.navigationFlow) {
              spec.pageAssociation.navigationFlow = { previousPage: null, nextPage: null };
            }
          }
        }

        // Validate rule components have ruleAssociation
        if (spec.type === 'rule') {
          if (!spec.ruleAssociation) {
            console.warn(`[PlanningExpert] Rule spec "${spec.name}" missing ruleAssociation, adding default`);
            spec.ruleAssociation = {
              forWorkflow: null,
              forForm: null,
              forDataModel: null,
              ruleType: 'validation',
              triggerEvent: 'onSubmit',
              affectedFields: []
            };
          } else {
            // Ensure affectedFields is an array
            if (!spec.ruleAssociation.affectedFields) {
              spec.ruleAssociation.affectedFields = [];
            } else if (!Array.isArray(spec.ruleAssociation.affectedFields)) {
              spec.ruleAssociation.affectedFields = [spec.ruleAssociation.affectedFields];
            }
          }

          // Ensure ruleLogicHints is an array
          if (!spec.ruleLogicHints) {
            spec.ruleLogicHints = [];
          } else if (!Array.isArray(spec.ruleLogicHints)) {
            spec.ruleLogicHints = [spec.ruleLogicHints];
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

      // IMPORTANT: Deduplicate form specs to ensure only ONE form per workflow + nodeType combination
      // This prevents multiple forms being attached to the same start node or user task
      this.deduplicateFormSpecs(componentPlan);

      // Count component types for logging
      const workflowSpecs = componentPlan.componentSpecs.filter(s => s.type === 'workflow');
      const formSpecs = componentPlan.componentSpecs.filter(s => s.type === 'form');
      const dataModelSpecs = componentPlan.componentSpecs.filter(s => s.type === 'dataModel');
      const pageSpecs = componentPlan.componentSpecs.filter(s => s.type === 'page');
      const ruleSpecs = componentPlan.componentSpecs.filter(s => s.type === 'rule');
      const subWorkflowCount = workflowSpecs.filter(s => s.workflowConfig?.isSubWorkflow).length;
      const mainWorkflowCount = workflowSpecs.length - subWorkflowCount;

      // Log form-workflow associations
      const formWorkflowMap = {};
      formSpecs.forEach(form => {
        const workflowName = form.formAssociation?.forWorkflow || 'unassigned';
        if (!formWorkflowMap[workflowName]) {
          formWorkflowMap[workflowName] = [];
        }
        formWorkflowMap[workflowName].push(form.name);
      });

      // Log data model associations
      const dataModelWorkflowMap = {};
      dataModelSpecs.forEach(dm => {
        const workflows = dm.dataModelAssociation?.usedByWorkflows || ['unassigned'];
        workflows.forEach(wf => {
          if (!dataModelWorkflowMap[wf]) {
            dataModelWorkflowMap[wf] = [];
          }
          dataModelWorkflowMap[wf].push(dm.name);
        });
      });

      // Log rule associations
      const ruleWorkflowMap = {};
      ruleSpecs.forEach(rule => {
        const workflowName = rule.ruleAssociation?.forWorkflow || 'unassigned';
        if (!ruleWorkflowMap[workflowName]) {
          ruleWorkflowMap[workflowName] = [];
        }
        ruleWorkflowMap[workflowName].push(rule.name);
      });

      console.log('[PlanningExpert] Successfully parsed component plan with', componentPlan.componentSpecs.length, 'component specs');
      console.log('[PlanningExpert] Data Models:', dataModelSpecs.length, '- associations:', JSON.stringify(dataModelWorkflowMap));
      console.log('[PlanningExpert] Workflows:', mainWorkflowCount, 'main +', subWorkflowCount, 'sub-workflows');
      console.log('[PlanningExpert] Forms:', formSpecs.length, '- associations:', JSON.stringify(formWorkflowMap));
      console.log('[PlanningExpert] Pages:', pageSpecs.length);
      console.log('[PlanningExpert] Rules:', ruleSpecs.length, '- associations:', JSON.stringify(ruleWorkflowMap));
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

  /**
   * Attempts to repair truncated JSON by closing unclosed strings, arrays, and objects
   * @param {string} jsonText - The potentially truncated JSON string
   * @returns {string|null} - Repaired JSON string or null if repair fails
   */
  repairTruncatedJson(jsonText) {
    try {
      let text = jsonText.trim();

      // Track open brackets and braces
      let openBraces = 0;
      let openBrackets = 0;
      let inString = false;
      let escapeNext = false;
      let lastValidIndex = 0;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === '\\') {
          escapeNext = true;
          continue;
        }

        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }

        if (!inString) {
          if (char === '{') {
            openBraces++;
            lastValidIndex = i;
          } else if (char === '}') {
            openBraces--;
            lastValidIndex = i;
          } else if (char === '[') {
            openBrackets++;
            lastValidIndex = i;
          } else if (char === ']') {
            openBrackets--;
            lastValidIndex = i;
          }
        }
      }

      // If we're inside a string, close it
      if (inString) {
        console.log('[PlanningExpert] Repairing: closing unclosed string');
        text += '"';
      }

      // Remove any trailing incomplete key-value pairs
      // Look for patterns like: ,"key": or ,"key" at the end
      text = text.replace(/,\s*"[^"]*"?\s*:?\s*$/, '');

      // Close any open arrays
      while (openBrackets > 0) {
        console.log('[PlanningExpert] Repairing: closing unclosed array');
        text += ']';
        openBrackets--;
      }

      // Close any open objects
      while (openBraces > 0) {
        console.log('[PlanningExpert] Repairing: closing unclosed object');
        text += '}';
        openBraces--;
      }

      // Validate the repair worked
      JSON.parse(text);
      console.log('[PlanningExpert] JSON repair successful, length:', text.length);
      return text;
    } catch (error) {
      console.error('[PlanningExpert] JSON repair failed:', error.message);

      // Fallback: try to extract a valid subset by finding balanced braces
      try {
        const fallback = this.extractValidJsonSubset(jsonText);
        if (fallback) {
          JSON.parse(fallback);
          console.log('[PlanningExpert] Extracted valid JSON subset, length:', fallback.length);
          return fallback;
        }
      } catch (e) {
        // Fallback also failed
      }

      return null;
    }
  }

  /**
   * Extracts a valid JSON subset by finding the largest balanced JSON object
   * @param {string} jsonText - The potentially truncated JSON string
   * @returns {string|null} - Valid JSON string or null
   */
  extractValidJsonSubset(jsonText) {
    // Find the last complete object or array by looking for balanced braces
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    let lastCompleteEnd = -1;

    for (let i = 0; i < jsonText.length; i++) {
      const char = jsonText[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{' || char === '[') {
          depth++;
        } else if (char === '}' || char === ']') {
          depth--;
          if (depth === 0) {
            lastCompleteEnd = i;
          }
        }
      }
    }

    if (lastCompleteEnd > 0) {
      return jsonText.substring(0, lastCompleteEnd + 1);
    }

    return null;
  }

  /**
   * Deduplicate form specs to ensure only ONE form per workflow + nodeType combination
   * For example, a workflow should have only ONE form for its startProcess node.
   *
   * This prevents the AI from creating multiple similar forms for the same purpose.
   *
   * @param {Object} componentPlan - The component plan with componentSpecs
   */
  deduplicateFormSpecs(componentPlan) {
    const formSpecs = componentPlan.componentSpecs.filter(s => s.type === 'form');
    if (formSpecs.length === 0) return;

    // Group forms by workflow + nodeType
    const formGroups = new Map();
    formSpecs.forEach(form => {
      const workflow = form.formAssociation?.forWorkflow || 'unassigned';
      const nodeType = form.formAssociation?.forNodeType || 'unknown';
      const nodeLabel = form.formAssociation?.forNodeLabel || '';
      // Use nodeLabel if available, otherwise fall back to just workflow+nodeType
      const key = nodeLabel ? `${workflow}|${nodeType}|${nodeLabel}` : `${workflow}|${nodeType}`;

      if (!formGroups.has(key)) {
        formGroups.set(key, []);
      }
      formGroups.get(key).push(form);
    });

    // Find duplicates and remove them
    const formsToRemove = new Set();
    let deduplicatedCount = 0;

    formGroups.forEach((forms, key) => {
      if (forms.length > 1) {
        // Keep the first form (or the one with the most complete formAssociation)
        const bestForm = forms.reduce((best, form) => {
          const bestScore = this.scoreFormSpec(best);
          const formScore = this.scoreFormSpec(form);
          return formScore > bestScore ? form : best;
        }, forms[0]);

        // Mark all others for removal
        forms.forEach(form => {
          if (form !== bestForm) {
            formsToRemove.add(form);
            deduplicatedCount++;
          }
        });

        console.log(`[PlanningExpert] Deduplicated ${forms.length - 1} duplicate form(s) for ${key}, keeping "${bestForm.name}"`);
      }
    });

    // Remove duplicate forms from componentSpecs
    if (formsToRemove.size > 0) {
      componentPlan.componentSpecs = componentPlan.componentSpecs.filter(spec =>
        spec.type !== 'form' || !formsToRemove.has(spec)
      );
      console.log(`[PlanningExpert] Removed ${deduplicatedCount} duplicate form specs`);
    }
  }

  /**
   * Score a form spec based on completeness (higher is better)
   * Used to determine which form to keep when deduplicating
   */
  scoreFormSpec(form) {
    let score = 0;
    if (form.name) score += 1;
    if (form.purpose) score += 1;
    if (form.description) score += 2;
    if (form.formAssociation) {
      if (form.formAssociation.forWorkflow) score += 2;
      if (form.formAssociation.forNodeType) score += 2;
      if (form.formAssociation.forNodeLabel) score += 3;
      if (form.formAssociation.dataModel) score += 1;
    }
    if (form.fieldHints && form.fieldHints.length > 0) score += form.fieldHints.length;
    return score;
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

  // ============================================================================
  // COMPONENT EXTRACTION METHODS (for standalone generation)
  // ============================================================================

  /**
   * Extract form specifications from requirements
   * Used by MoEOrchestrator.generateForms() for standalone form generation
   * @param {string} requirements - User requirements
   * @param {Object} context - Additional context (dataModels, workflow, etc.)
   * @returns {Promise<Array>} Array of form specifications
   */
  async extractFormSpecs(requirements, context = {}) {
    console.log('[PlanningExpert] Extracting form specifications...');

    try {
      const prompt = `Analyze the following requirements and extract form specifications.

REQUIREMENTS: ${requirements}

${context.dataModels ? `AVAILABLE DATA MODELS: ${JSON.stringify(context.dataModels.map(dm => dm.name), null, 2)}` : ''}
${context.workflow ? `WORKFLOW NAME: ${context.workflow.name || 'Main Workflow'}` : ''}

Return a JSON array of form specifications. Each form spec should have:
- type: "form"
- name: Form name
- purpose: Brief purpose statement
- description: Detailed description
- dependencies: Array of data model names this form uses
- formAssociation: Object with forWorkflow, forNodeType, forNodeLabel, dataModel
- fieldHints: Array of suggested field names

Return ONLY valid JSON array, no additional text.

Example:
[
  {
    "type": "form",
    "name": "Request Form",
    "purpose": "Collect request information",
    "description": "Form for submitting new requests",
    "dependencies": ["Request"],
    "formAssociation": {
      "forWorkflow": "Request Workflow",
      "forNodeType": "startProcess",
      "forNodeLabel": "Submit Request",
      "dataModel": "Request"
    },
    "fieldHints": ["title", "description", "priority", "requester"]
  }
]`;

      const response = await this.anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
        system: 'You are a form specification expert. Return only valid JSON arrays.'
      });

      const responseText = response.content[0].text;
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        const specs = JSON.parse(jsonMatch[0]);
        console.log(`[PlanningExpert] Extracted ${specs.length} form specs`);
        return specs;
      }

      return [];
    } catch (error) {
      console.error('[PlanningExpert] Form extraction failed:', error.message);
      return [];
    }
  }

  /**
   * Extract data model specifications from requirements
   * Used by MoEOrchestrator.generateDataModels() for standalone data model generation
   * @param {string} requirements - User requirements
   * @param {Object} context - Additional context
   * @returns {Promise<Array>} Array of data model specifications
   */
  async extractDataModelSpecs(requirements, context = {}) {
    console.log('[PlanningExpert] Extracting data model specifications...');

    try {
      const prompt = `Analyze the following requirements and extract data model (entity) specifications.

REQUIREMENTS: ${requirements}

Return a JSON array of data model specifications. Each spec should have:
- type: "dataModel"
- name: Entity name (PascalCase)
- purpose: Brief purpose statement
- description: Detailed description
- dependencies: Array of related entity names
- dataModelAssociation: Object with usedByWorkflows, usedByForms, isPrimary, entityType
- fieldHints: Array of suggested field names

Return ONLY valid JSON array, no additional text.

Example:
[
  {
    "type": "dataModel",
    "name": "Employee",
    "purpose": "Store employee information",
    "description": "Main employee entity with personal and work details",
    "dependencies": [],
    "dataModelAssociation": {
      "usedByWorkflows": ["Onboarding Workflow"],
      "usedByForms": ["Employee Form"],
      "isPrimary": true,
      "entityType": "main"
    },
    "fieldHints": ["id", "firstName", "lastName", "email", "department", "hireDate", "status"]
  }
]`;

      const response = await this.anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
        system: 'You are a data modeling expert. Return only valid JSON arrays.'
      });

      const responseText = response.content[0].text;
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        const specs = JSON.parse(jsonMatch[0]);
        console.log(`[PlanningExpert] Extracted ${specs.length} data model specs`);
        return specs;
      }

      return [];
    } catch (error) {
      console.error('[PlanningExpert] Data model extraction failed:', error.message);
      return [];
    }
  }

  /**
   * Extract page specifications from requirements
   * Used by MoEOrchestrator.generatePages() for standalone page generation
   * @param {string} requirements - User requirements
   * @param {Object} context - Additional context (forms, dataModels, workflow, etc.)
   * @returns {Promise<Array>} Array of page specifications
   */
  async extractPageSpecs(requirements, context = {}) {
    console.log('[PlanningExpert] Extracting page specifications...');

    try {
      const prompt = `Analyze the following requirements and extract page specifications.

REQUIREMENTS: ${requirements}

${context.forms ? `AVAILABLE FORMS: ${JSON.stringify(context.forms.map(f => f.name), null, 2)}` : ''}
${context.dataModels ? `AVAILABLE DATA MODELS: ${JSON.stringify(context.dataModels.map(dm => dm.name), null, 2)}` : ''}

Return a JSON array of page specifications. Each page spec should have:
- type: "page"
- name: Page name
- purpose: Brief purpose statement
- description: Detailed description
- dependencies: Array of form/data model names this page uses
- pageAssociation: Object with forWorkflow, pageType, displaysForms, displaysDataModels, navigationFlow

Return ONLY valid JSON array, no additional text.

Example:
[
  {
    "type": "page",
    "name": "Dashboard",
    "purpose": "Main overview page",
    "description": "Dashboard showing summary statistics and recent activity",
    "dependencies": [],
    "pageAssociation": {
      "forWorkflow": null,
      "pageType": "dashboard",
      "displaysForms": [],
      "displaysDataModels": ["Employee", "Request"],
      "navigationFlow": { "previousPage": null, "nextPage": "Employees List" }
    }
  },
  {
    "type": "page",
    "name": "Employees List",
    "purpose": "View all employees",
    "description": "List page for viewing and managing employees",
    "dependencies": ["Employee"],
    "pageAssociation": {
      "forWorkflow": "Employee Workflow",
      "pageType": "list",
      "displaysForms": [],
      "displaysDataModels": ["Employee"],
      "navigationFlow": { "previousPage": "Dashboard", "nextPage": "Employee Form" }
    }
  }
]`;

      const response = await this.anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
        system: 'You are a UI/UX architect. Return only valid JSON arrays.'
      });

      const responseText = response.content[0].text;
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        const specs = JSON.parse(jsonMatch[0]);
        console.log(`[PlanningExpert] Extracted ${specs.length} page specs`);
        return specs;
      }

      return [];
    } catch (error) {
      console.error('[PlanningExpert] Page extraction failed:', error.message);
      return [];
    }
  }
}

module.exports = PlanningExpert;
