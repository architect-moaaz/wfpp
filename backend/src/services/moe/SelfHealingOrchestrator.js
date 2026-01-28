/**
 * Self-Healing MoE Orchestrator
 *
 * AI-Powered Intelligent Error Recovery System:
 * - Uses AI to analyze and understand failures
 * - Generates smart recovery strategies based on failure analysis
 * - Resumes generation from failure point
 * - Tracks partial results and continues until complete
 * - Goal: Generate complete application successfully
 */

const MoEOrchestrator = require('./MoEOrchestrator');
const Anthropic = require('@anthropic-ai/sdk');

class SelfHealingOrchestrator {
  constructor() {
    this.orchestrator = new MoEOrchestrator();
    this.errorHistory = [];
    this.maxRetries = 3;
    this.retryDelay = 1000; // Start with 1 second
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    // Track generation state for resumption
    this.generationState = {
      phase: null,
      completedComponents: [],
      failedComponents: [],
      partialResults: {}
    };

    // Adaptive generation parameters
    this.adaptiveParams = {
      maxTokensPerRequest: 8000,
      maxComponentsPerBatch: 10,
      useSequentialGeneration: false,
      contextReductionFactor: 1.0,
      chunkingEnabled: false
    };

    // Failure pattern tracking for learning
    this.failurePatterns = {
      contextOverflow: 0,
      tokenLimitExceeded: 0,
      timeouts: 0,
      jsonTruncation: 0
    };
  }

  /**
   * Analyze failure to detect context size or token limit issues
   */
  detectContextOrTokenIssue(error, context) {
    const message = error.message.toLowerCase();
    const stack = (error.stack || '').toLowerCase();

    const indicators = {
      isContextOverflow: false,
      isTokenLimitExceeded: false,
      isTimeout: false,
      isJsonTruncation: false,
      estimatedTokens: 0,
      recommendedAction: null
    };

    // Detect context overflow indicators
    if (message.includes('context') || message.includes('too long') ||
        message.includes('exceeds') || message.includes('limit') ||
        message.includes('maximum')) {
      indicators.isContextOverflow = true;
      this.failurePatterns.contextOverflow++;
    }

    // Detect token limit issues
    if (message.includes('token') || message.includes('truncat') ||
        message.includes('incomplete') || message.includes('cut off') ||
        (message.includes('json') && message.includes('position'))) {
      indicators.isTokenLimitExceeded = true;
      this.failurePatterns.tokenLimitExceeded++;
    }

    // Detect timeout issues (often caused by large context)
    if (message.includes('timeout') || message.includes('timed out') ||
        message.includes('deadline') || message.includes('504')) {
      indicators.isTimeout = true;
      this.failurePatterns.timeouts++;
    }

    // Detect JSON truncation (common symptom of token limits)
    if ((message.includes('unexpected end') || message.includes('unterminated') ||
         message.includes('expected') && message.includes('position')) &&
        !message.includes('comma')) {
      indicators.isJsonTruncation = true;
      this.failurePatterns.jsonTruncation++;
    }

    // Estimate context size
    const contextSize = this.estimateContextSize(context);
    indicators.estimatedTokens = contextSize;

    // Determine recommended action based on pattern
    if (indicators.isContextOverflow || indicators.estimatedTokens > 100000) {
      indicators.recommendedAction = 'reduce_context';
    } else if (indicators.isTokenLimitExceeded || indicators.isJsonTruncation) {
      indicators.recommendedAction = 'chunk_generation';
    } else if (indicators.isTimeout) {
      indicators.recommendedAction = 'sequential_with_smaller_batches';
    }

    console.log('[SelfHealing] Context/Token Analysis:', indicators);
    return indicators;
  }

  /**
   * Estimate context size in tokens (rough approximation)
   */
  estimateContextSize(context) {
    let totalChars = 0;

    // Count characters in requirements
    totalChars += (context.userRequirements || '').length;

    // Count characters in conversation history
    if (context.conversationHistory) {
      context.conversationHistory.forEach(msg => {
        totalChars += (msg.content || '').length;
      });
    }

    // Count characters in existing workflow
    if (context.existingWorkflow) {
      totalChars += JSON.stringify(context.existingWorkflow).length;
    }

    // Count characters in partial results
    if (context.partialResults) {
      totalChars += JSON.stringify(context.partialResults).length;
    }

    // Rough token estimate (1 token ≈ 4 characters for English)
    return Math.ceil(totalChars / 4);
  }

  /**
   * Apply adaptive parameters based on failure patterns
   */
  applyAdaptiveParameters(indicators) {
    console.log('[SelfHealing] Applying adaptive parameters based on failure analysis...');

    if (indicators.recommendedAction === 'reduce_context') {
      this.adaptiveParams.contextReductionFactor = 0.5;
      this.adaptiveParams.maxComponentsPerBatch = 3;
      console.log('[SelfHealing] Reducing context by 50%, batch size to 3');
    }

    if (indicators.recommendedAction === 'chunk_generation') {
      this.adaptiveParams.chunkingEnabled = true;
      this.adaptiveParams.maxTokensPerRequest = 4000;
      this.adaptiveParams.maxComponentsPerBatch = 2;
      console.log('[SelfHealing] Enabling chunking, reducing tokens to 4000, batch to 2');
    }

    if (indicators.recommendedAction === 'sequential_with_smaller_batches') {
      this.adaptiveParams.useSequentialGeneration = true;
      this.adaptiveParams.maxComponentsPerBatch = 1;
      console.log('[SelfHealing] Switching to sequential generation, 1 component at a time');
    }

    // If we've seen multiple token limit failures, be more aggressive
    if (this.failurePatterns.tokenLimitExceeded >= 2) {
      this.adaptiveParams.maxTokensPerRequest = 3000;
      this.adaptiveParams.maxComponentsPerBatch = 1;
      console.log('[SelfHealing] Multiple token failures - aggressive reduction applied');
    }

    return this.adaptiveParams;
  }

  /**
   * AI-Powered Failure Analyzer
   * Uses Claude to understand WHY a failure occurred and suggest fixes
   * Includes intelligent detection of context size and token limit issues
   */
  async analyzeFailureWithAI(error, context, failedComponent = null) {
    console.log('[SelfHealing] Analyzing failure with AI...');

    // First, detect context/token issues using pattern matching
    const contextAnalysis = this.detectContextOrTokenIssue(error, context);

    // If we detect a clear context/token issue, handle it directly
    if (contextAnalysis.recommendedAction) {
      console.log('[SelfHealing] Detected context/token issue, applying adaptive parameters');
      this.applyAdaptiveParameters(contextAnalysis);

      // Return a pre-computed analysis for context/token issues
      if (contextAnalysis.isContextOverflow || contextAnalysis.estimatedTokens > 50000) {
        return {
          rootCause: `Context overflow detected. Estimated tokens: ${contextAnalysis.estimatedTokens}. The request is too large for single generation.`,
          isRecoverable: true,
          recoveryStrategy: 'chunk_generation',
          modifications: {
            promptModifications: 'Split into smaller chunks, reduce context size',
            parameterChanges: {
              maxTokens: this.adaptiveParams.maxTokensPerRequest,
              maxComponentsPerBatch: this.adaptiveParams.maxComponentsPerBatch,
              useSequential: true
            },
            componentSimplification: 'Generate components one at a time instead of in batches'
          },
          preventionTips: 'Use chunked generation for large applications',
          confidence: 0.9,
          contextAnalysis
        };
      }

      if (contextAnalysis.isJsonTruncation || contextAnalysis.isTokenLimitExceeded) {
        return {
          rootCause: `Token limit exceeded causing JSON truncation. The AI response was cut off before completing the JSON structure.`,
          isRecoverable: true,
          recoveryStrategy: 'regenerate_with_smaller_output',
          modifications: {
            promptModifications: 'Request smaller, simpler output. Reduce number of components per request.',
            parameterChanges: {
              maxTokens: Math.min(4000, this.adaptiveParams.maxTokensPerRequest),
              maxComponentsPerBatch: 1,
              simplifyOutput: true
            },
            componentSimplification: 'Generate minimal viable component, then enhance incrementally'
          },
          preventionTips: 'Limit output size, use incremental generation',
          confidence: 0.85,
          contextAnalysis
        };
      }

      if (contextAnalysis.isTimeout) {
        return {
          rootCause: `Generation timeout. The request took too long to process, likely due to complexity or large context.`,
          isRecoverable: true,
          recoveryStrategy: 'sequential_generation',
          modifications: {
            promptModifications: 'Use sequential generation with smaller batches',
            parameterChanges: {
              useSequential: true,
              maxComponentsPerBatch: 1,
              timeout: 60000
            },
            componentSimplification: 'Process one component at a time to avoid timeouts'
          },
          preventionTips: 'Use sequential generation for complex applications',
          confidence: 0.8,
          contextAnalysis
        };
      }
    }

    // For other errors, use AI analysis
    const analysisPrompt = `You are an expert software debugging AI. Analyze this failure and provide a recovery strategy.

## FAILURE CONTEXT
Error Message: ${error.message}
Error Type: ${this.classifyError(error)}
Failed Component: ${failedComponent || 'Unknown'}
Generation Phase: ${this.generationState.phase || 'Unknown'}
Estimated Context Tokens: ${contextAnalysis.estimatedTokens}

## CONTEXT SIZE ANALYSIS
- Is Context Overflow: ${contextAnalysis.isContextOverflow}
- Is Token Limit Exceeded: ${contextAnalysis.isTokenLimitExceeded}
- Is Timeout: ${contextAnalysis.isTimeout}
- Is JSON Truncation: ${contextAnalysis.isJsonTruncation}

## USER REQUIREMENTS (first 500 chars)
${(context.userRequirements || '').substring(0, 500)}

## PARTIAL RESULTS GENERATED
${JSON.stringify(Object.keys(this.generationState.partialResults), null, 2)}

## COMPLETED COMPONENTS
${JSON.stringify(this.generationState.completedComponents, null, 2)}

## FAILURE PATTERN HISTORY
${JSON.stringify(this.failurePatterns, null, 2)}

## ERROR STACK (last 300 chars)
${(error.stack || '').slice(-300)}

## ANALYSIS TASK
1. Identify the ROOT CAUSE - is it context size, token limits, complexity, or something else?
2. Determine if this is a recoverable error
3. Suggest a specific RECOVERY STRATEGY from:
   - "chunk_generation" (split into smaller pieces)
   - "regenerate_with_smaller_output" (simpler output)
   - "sequential_generation" (one at a time)
   - "regenerate_component" (just retry this component)
   - "skip_and_continue" (skip non-critical)
   - "use_fallback" (use minimal fallback)
4. Provide specific parameters to fix the issue

Respond in JSON format:
{
  "rootCause": "specific explanation - mention if it's context/token/complexity related",
  "isRecoverable": true/false,
  "recoveryStrategy": "chunk_generation" | "regenerate_with_smaller_output" | "sequential_generation" | "regenerate_component" | "skip_and_continue" | "use_fallback",
  "modifications": {
    "promptModifications": "specific changes",
    "parameterChanges": { "maxTokens": number, "maxComponentsPerBatch": number, "useSequential": boolean },
    "componentSimplification": "how to simplify"
  },
  "preventionTips": "how to prevent this",
  "confidence": 0.0-1.0
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001', // Fast model for analysis
        max_tokens: 1500,
        messages: [{ role: 'user', content: analysisPrompt }],
        system: 'You are an expert at debugging AI systems and suggesting recovery strategies. Always respond with valid JSON.'
      });

      const responseText = response.content[0].text;

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        console.log('[SelfHealing] AI Analysis:', JSON.stringify(analysis, null, 2));
        return analysis;
      }

      throw new Error('No valid JSON in AI analysis response');
    } catch (analysisError) {
      console.error('[SelfHealing] AI analysis failed:', analysisError.message);
      // Return a default analysis if AI fails
      return {
        rootCause: 'Unable to determine - AI analysis failed',
        isRecoverable: true,
        recoveryStrategy: 'retry_with_modifications',
        modifications: {
          promptModifications: 'Simplify the request and reduce complexity',
          parameterChanges: { maxTokens: 4000 },
          componentSimplification: 'Generate fewer components per batch'
        },
        confidence: 0.3
      };
    }
  }

  /**
   * Apply AI-recommended recovery strategy
   */
  async applyRecoveryStrategy(analysis, context, failedComponent) {
    console.log(`[SelfHealing] Applying recovery strategy: ${analysis.recoveryStrategy}`);

    if (context.emitEvent) {
      context.emitEvent({
        type: 'thinking-step',
        data: {
          agent: 'SelfHealingOrchestrator',
          step: 'AI Recovery',
          content: `Analyzing failure: ${analysis.rootCause.substring(0, 100)}... Strategy: ${analysis.recoveryStrategy}`
        }
      });
    }

    switch (analysis.recoveryStrategy) {
      case 'retry_with_modifications':
        return await this.retryWithModifications(analysis, context, failedComponent);

      case 'regenerate_component':
        return await this.regenerateFailedComponent(analysis, context, failedComponent);

      case 'skip_and_continue':
        return await this.skipAndContinue(analysis, context, failedComponent);

      case 'simplify_request':
        return await this.simplifyAndRetry(analysis, context);

      case 'use_fallback':
        return await this.useFallbackGeneration(analysis, context, failedComponent);

      // New strategies for context/token issues
      case 'chunk_generation':
        return await this.applyChunkedGeneration(analysis, context, failedComponent);

      case 'regenerate_with_smaller_output':
        return await this.regenerateWithSmallerOutput(analysis, context, failedComponent);

      case 'sequential_generation':
        return await this.applySequentialGeneration(analysis, context);

      default:
        console.log('[SelfHealing] Unknown strategy, using retry_with_modifications');
        return await this.retryWithModifications(analysis, context, failedComponent);
    }
  }

  /**
   * Apply chunked generation strategy for large context
   * Splits the generation into smaller, manageable chunks
   */
  async applyChunkedGeneration(analysis, context, failedComponent) {
    console.log('[SelfHealing] Applying chunked generation strategy...');

    if (context.emitEvent) {
      context.emitEvent({
        type: 'thinking-step',
        data: {
          agent: 'SelfHealingOrchestrator',
          step: 'Chunked Generation',
          content: 'Context too large. Splitting generation into smaller chunks...'
        }
      });
    }

    // Apply adaptive parameters
    context.useChunkedGeneration = true;
    context.maxComponentsPerBatch = analysis.modifications?.parameterChanges?.maxComponentsPerBatch || 2;
    context.forceSequential = true;

    // Reduce context by trimming conversation history
    if (context.conversationHistory && context.conversationHistory.length > 5) {
      console.log('[SelfHealing] Trimming conversation history to reduce context');
      context.conversationHistory = context.conversationHistory.slice(-5);
    }

    // Store adaptive params for orchestrator to use
    context.adaptiveParams = this.adaptiveParams;

    return { action: 'retry_chunked', context };
  }

  /**
   * Regenerate with smaller output when token limit exceeded
   */
  async regenerateWithSmallerOutput(analysis, context, failedComponent) {
    console.log(`[SelfHealing] Regenerating ${failedComponent} with smaller output...`);

    if (context.emitEvent) {
      context.emitEvent({
        type: 'thinking-step',
        data: {
          agent: 'SelfHealingOrchestrator',
          step: 'Smaller Output',
          content: `Token limit exceeded. Regenerating ${failedComponent} with simplified output...`
        }
      });
    }

    // Generate a minimal version of the component
    const minimalPrompt = this.buildMinimalComponentPrompt(failedComponent, context);

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001', // Fast model with lower token output
        max_tokens: 2000, // Much smaller output
        messages: [{ role: 'user', content: minimalPrompt }],
        system: 'Generate minimal, valid JSON. Keep output under 1500 tokens. No explanations.'
      });

      const responseText = response.content[0].text;
      const jsonMatch = responseText.match(/[\[{][\s\S]*[\]}]/);

      if (jsonMatch) {
        const component = JSON.parse(jsonMatch[0]);
        console.log(`[SelfHealing] Successfully generated minimal ${failedComponent}`);

        this.generationState.partialResults[failedComponent] = component;
        this.generationState.completedComponents.push(`${failedComponent}_minimal`);

        return {
          action: 'component_regenerated',
          component,
          componentType: failedComponent,
          isMinimal: true
        };
      }
    } catch (error) {
      console.error(`[SelfHealing] Minimal regeneration failed:`, error.message);
    }

    // If minimal generation also fails, use fallback
    return await this.useFallbackGeneration(analysis, context, failedComponent);
  }

  /**
   * Apply sequential generation strategy for timeout issues
   */
  async applySequentialGeneration(analysis, context) {
    console.log('[SelfHealing] Applying sequential generation strategy...');

    if (context.emitEvent) {
      context.emitEvent({
        type: 'thinking-step',
        data: {
          agent: 'SelfHealingOrchestrator',
          step: 'Sequential Mode',
          content: 'Switching to sequential generation to avoid timeouts...'
        }
      });
    }

    // Force sequential generation
    context.forceSequential = true;
    context.maxComponentsPerBatch = 1;
    context.useParallel = false;

    // Store adaptive params
    this.adaptiveParams.useSequentialGeneration = true;
    this.adaptiveParams.maxComponentsPerBatch = 1;
    context.adaptiveParams = this.adaptiveParams;

    return { action: 'retry_sequential', context };
  }

  /**
   * Build minimal component prompt for smaller output
   */
  buildMinimalComponentPrompt(componentType, context) {
    const requirements = (context.userRequirements || '').substring(0, 200);

    const prompts = {
      mobileUI: `Generate a MINIMAL mobile UI for: ${requirements}

Return ONLY this JSON structure (keep it small):
{
  "screens": [{"id": "screen_1", "name": "Main", "type": "list", "components": [{"type": "View", "children": []}]}],
  "navigation": {"type": "stack", "screens": ["Main"]}
}`,

      form: `Generate a MINIMAL form for: ${requirements}

Return ONLY this JSON (3-5 fields max):
{
  "id": "form_1",
  "name": "MainForm",
  "fields": [{"id": "f1", "name": "field1", "label": "Field 1", "type": "text"}]
}`,

      page: `Generate a MINIMAL page for: ${requirements}

Return ONLY this JSON:
{
  "id": "page_1",
  "name": "MainPage",
  "sections": [{"id": "s1", "title": "Content", "components": []}]
}`,

      workflow: `Generate a MINIMAL workflow for: ${requirements}

Return ONLY this JSON (3 nodes max):
{
  "id": "wf_1",
  "name": "MainWorkflow",
  "nodes": [
    {"id": "start", "type": "startProcess", "data": {"label": "Start"}, "position": {"x": 0, "y": 0}},
    {"id": "end", "type": "endProcess", "data": {"label": "End"}, "position": {"x": 0, "y": 200}}
  ],
  "edges": [{"id": "e1", "source": "start", "target": "end"}]
}`,

      dataModel: `Generate a MINIMAL data model for: ${requirements}

Return ONLY this JSON (5 fields max):
{
  "id": "model_1",
  "name": "MainModel",
  "fields": [{"name": "id", "type": "string", "required": true}]
}`
    };

    return prompts[componentType] || prompts.form;
  }

  /**
   * Retry with AI-suggested modifications
   */
  async retryWithModifications(analysis, context, failedComponent) {
    console.log('[SelfHealing] Retrying with AI-suggested modifications...');

    // Apply modifications to context
    if (analysis.modifications.parameterChanges) {
      context.modifiedParams = {
        ...context.modifiedParams,
        ...analysis.modifications.parameterChanges
      };
    }

    // Store modification hints for the expert
    context.promptHints = analysis.modifications.promptModifications;
    context.simplificationHints = analysis.modifications.componentSimplification;

    // Set flag to use enhanced error handling
    context.useEnhancedRecovery = true;

    return { action: 'retry', context };
  }

  /**
   * Regenerate only the failed component using AI
   */
  async regenerateFailedComponent(analysis, context, failedComponent) {
    console.log(`[SelfHealing] Regenerating failed component: ${failedComponent}`);

    if (context.emitEvent) {
      context.emitEvent({
        type: 'thinking-step',
        data: {
          agent: 'SelfHealingOrchestrator',
          step: 'Component Regeneration',
          content: `Regenerating ${failedComponent} with improved prompt...`
        }
      });
    }

    const regenerationPrompt = `Generate a ${failedComponent} component for the following requirements.

REQUIREMENTS: ${context.userRequirements}

IMPORTANT CONSTRAINTS:
- ${analysis.modifications.promptModifications || 'Keep it simple and valid'}
- ${analysis.modifications.componentSimplification || 'Generate minimal viable component'}
- Return ONLY valid JSON with proper syntax
- Ensure all brackets, braces, and commas are correct

${this.getComponentTemplate(failedComponent)}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: regenerationPrompt }],
        system: `You are a ${failedComponent} generation expert. Generate valid, complete JSON components.`
      });

      const responseText = response.content[0].text;
      const jsonMatch = responseText.match(/[\[{][\s\S]*[\]}]/);

      if (jsonMatch) {
        const component = JSON.parse(jsonMatch[0]);
        console.log(`[SelfHealing] Successfully regenerated ${failedComponent}`);

        // Store the regenerated component
        this.generationState.partialResults[failedComponent] = component;
        this.generationState.completedComponents.push(failedComponent);

        return { action: 'component_regenerated', component, componentType: failedComponent };
      }

      throw new Error('Invalid JSON in regenerated component');
    } catch (regenError) {
      console.error(`[SelfHealing] Component regeneration failed:`, regenError.message);
      return { action: 'skip', reason: 'Regeneration failed' };
    }
  }

  /**
   * Skip failed component and continue with others
   */
  async skipAndContinue(analysis, context, failedComponent) {
    console.log(`[SelfHealing] Skipping ${failedComponent} and continuing...`);

    this.generationState.failedComponents.push({
      component: failedComponent,
      reason: analysis.rootCause,
      timestamp: new Date().toISOString()
    });

    if (context.emitEvent) {
      context.emitEvent({
        type: 'thinking-step',
        data: {
          agent: 'SelfHealingOrchestrator',
          step: 'Skip & Continue',
          content: `Skipping ${failedComponent}: ${analysis.rootCause.substring(0, 50)}... Continuing with other components.`
        }
      });
    }

    return { action: 'continue', skipped: failedComponent };
  }

  /**
   * Simplify the entire request and retry
   */
  async simplifyAndRetry(analysis, context) {
    console.log('[SelfHealing] Simplifying request and retrying...');

    // Modify context to request simpler generation
    context.forceSimplified = true;
    context.maxComponents = 5;
    context.skipOptionalFeatures = true;

    if (context.emitEvent) {
      context.emitEvent({
        type: 'thinking-step',
        data: {
          agent: 'SelfHealingOrchestrator',
          step: 'Simplification',
          content: 'Simplifying request to generate core components only...'
        }
      });
    }

    return { action: 'retry_simplified', context };
  }

  /**
   * Use fallback generation for critical components
   */
  async useFallbackGeneration(analysis, context, failedComponent) {
    console.log(`[SelfHealing] Using fallback generation for ${failedComponent}`);

    const fallbackComponent = this.generateFallbackComponent(failedComponent, context);

    if (fallbackComponent) {
      this.generationState.partialResults[failedComponent] = fallbackComponent;
      this.generationState.completedComponents.push(`${failedComponent}_fallback`);

      if (context.emitEvent) {
        context.emitEvent({
          type: 'thinking-step',
          data: {
            agent: 'SelfHealingOrchestrator',
            step: 'Fallback Generated',
            content: `Generated fallback ${failedComponent} - you can enhance it manually later`
          }
        });
      }

      return { action: 'fallback_used', component: fallbackComponent, componentType: failedComponent };
    }

    return { action: 'skip', reason: 'No fallback available' };
  }

  /**
   * Generate fallback component based on type
   */
  generateFallbackComponent(componentType, context) {
    const timestamp = Date.now();

    switch (componentType) {
      case 'mobileUI':
      case 'crossPlatform':
      case 'ios':
      case 'android':
        return {
          screens: [{
            id: `screen_${timestamp}`,
            name: 'MainScreen',
            type: 'list',
            platform: componentType === 'ios' ? 'ios' : componentType === 'android' ? 'android' : 'cross-platform',
            components: [
              {
                type: 'SafeAreaView',
                children: [
                  { type: 'Text', props: { children: 'Mobile screen will be generated' } }
                ]
              }
            ]
          }],
          navigation: { type: 'stack', screens: ['MainScreen'] },
          fallbackGenerated: true
        };

      case 'form':
        return {
          id: `form_${timestamp}`,
          name: 'BasicForm',
          title: 'Input Form',
          fields: [
            { id: 'field_1', name: 'input', label: 'Input', type: 'text', required: true }
          ],
          fallbackGenerated: true
        };

      case 'page':
        return {
          id: `page_${timestamp}`,
          name: 'MainPage',
          title: 'Main Page',
          sections: [{ id: 'section_1', title: 'Content', components: [] }],
          fallbackGenerated: true
        };

      default:
        return null;
    }
  }

  /**
   * Get component template for regeneration prompts
   */
  getComponentTemplate(componentType) {
    const templates = {
      mobileUI: `Return JSON in this format:
{
  "screens": [{ "id": "...", "name": "...", "type": "list|detail|form", "components": [...] }],
  "navigation": { "type": "stack", "screens": [...] }
}`,
      form: `Return JSON in this format:
{
  "id": "form_xxx",
  "name": "FormName",
  "title": "Form Title",
  "fields": [{ "id": "...", "name": "...", "label": "...", "type": "text|number|select", "required": true/false }]
}`,
      workflow: `Return JSON in this format:
{
  "id": "workflow_xxx",
  "name": "WorkflowName",
  "nodes": [{ "id": "...", "type": "startProcess|userTask|endProcess", "data": { "label": "..." }, "position": { "x": 0, "y": 0 } }],
  "edges": [{ "id": "...", "source": "...", "target": "..." }]
}`,
      dataModel: `Return JSON in this format:
{
  "id": "model_xxx",
  "name": "ModelName",
  "fields": [{ "name": "...", "type": "string|number|boolean|date", "required": true/false }]
}`
    };

    return templates[componentType] || 'Return valid JSON representing the component.';
  }

  /**
   * Resume generation from last successful point
   */
  async resumeGeneration(context) {
    console.log('[SelfHealing] Resuming generation from checkpoint...');
    console.log('[SelfHealing] Completed components:', this.generationState.completedComponents);
    console.log('[SelfHealing] Partial results keys:', Object.keys(this.generationState.partialResults));

    if (context.emitEvent) {
      context.emitEvent({
        type: 'thinking-step',
        data: {
          agent: 'SelfHealingOrchestrator',
          step: 'Resuming Generation',
          content: `Continuing from checkpoint with ${this.generationState.completedComponents.length} completed components...`
        }
      });
    }

    // Inject partial results into the orchestrator
    context.partialResults = this.generationState.partialResults;
    context.skipComponents = this.generationState.completedComponents;

    return context;
  }

  /**
   * Check if generation is complete
   */
  isGenerationComplete(results) {
    // MoEOrchestrator returns { thinking, workflow, summary }
    // dataModels, forms, pages are embedded inside workflow object
    const workflow = results.workflow;

    // Check required components - workflow with nodes is essential
    const hasWorkflow = workflow && workflow.nodes && workflow.nodes.length > 0;

    // dataModels and forms are inside the workflow object, not at the top level
    const hasDataModels = workflow && workflow.dataModels && workflow.dataModels.length > 0;
    const hasForms = workflow && workflow.forms && workflow.forms.length > 0;

    // A valid generation needs at minimum a workflow with nodes
    // dataModels and forms are nice to have but not strictly required
    if (!hasWorkflow) {
      console.log('[SelfHealing] Generation incomplete - no workflow nodes:', {
        hasWorkflow, hasDataModels, hasForms
      });
      return false;
    }

    // Log what we have
    console.log('[SelfHealing] Generation complete check:', {
      hasWorkflow,
      hasDataModels,
      hasForms,
      nodeCount: workflow?.nodes?.length || 0,
      dataModelCount: workflow?.dataModels?.length || 0,
      formCount: workflow?.forms?.length || 0
    });

    // Consider generation complete if we have a workflow with nodes
    // Even without dataModels or forms, the workflow is usable
    console.log('[SelfHealing] Generation complete - workflow present with nodes');
    return true;
  }

  /**
   * Merge partial results with final results
   */
  mergePartialResults(finalResults) {
    const partial = this.generationState.partialResults;

    // Ensure workflow object exists
    if (!finalResults.workflow) {
      console.log('[SelfHealing] No workflow in finalResults, skipping merge');
      return finalResults;
    }

    // Merge each component type
    if (partial.mobileUI && (!finalResults.workflow.mobileUI || !finalResults.workflow.mobileUI.screens)) {
      finalResults.workflow.mobileUI = partial.mobileUI;
      console.log('[SelfHealing] Merged mobileUI from partial results');
    }

    if (partial.forms && partial.forms.length > 0) {
      finalResults.workflow.forms = [...(finalResults.workflow.forms || []), ...partial.forms];
      console.log('[SelfHealing] Merged forms from partial results');
    }

    if (partial.pages && partial.pages.length > 0) {
      finalResults.workflow.pages = [...(finalResults.workflow.pages || []), ...partial.pages];
      console.log('[SelfHealing] Merged pages from partial results');
    }

    // Add metadata about recovery
    finalResults.selfHealingApplied = true;
    finalResults.recoveryStats = {
      completedComponents: this.generationState.completedComponents,
      failedComponents: this.generationState.failedComponents,
      partialResultsUsed: Object.keys(partial)
    };

    return finalResults;
  }

  /**
   * Main entry point with self-healing capabilities
   * Goal: Generate complete application successfully
   * IMPORTANT: This method NEVER throws - it always returns a result
   */
  async generateWorkflow(userRequirements, existingWorkflow, conversationHistory, emitEvent, designInput = null) {
    console.log('[SelfHealing] Starting AI-powered self-healing workflow generation...');
    console.log('[SelfHealing] Goal: Generate complete application successfully');

    try {
      // Reset generation state for new request
      this.generationState = {
        phase: 'initialization',
        completedComponents: [],
        failedComponents: [],
        partialResults: {}
      };

      const context = {
        userRequirements,
        existingWorkflow,
        conversationHistory,
        emitEvent,
        designInput,
        attemptNumber: 0,
        errors: [],
        partialResults: {}
      };

      // Try main generation with AI-powered retry logic
      return await this.executeWithAIRecovery(context);
    } catch (criticalError) {
      // This should never happen as executeWithAIRecovery never throws
      // But just in case, return a minimal result
      console.error('[SelfHealing] CRITICAL: Unexpected error in generateWorkflow:', criticalError.message);
      const timestamp = Date.now();
      return {
        thinking: [],
        workflow: {
          id: `workflow_critical_${timestamp}`,
          name: 'Emergency Workflow',
          description: 'Generated due to critical error',
          version: '1.0.0',
          nodes: [
            { id: 'start', type: 'startProcess', data: { label: 'Start' }, position: { x: 100, y: 100 } },
            { id: 'end', type: 'endProcess', data: { label: 'End' }, position: { x: 100, y: 200 } }
          ],
          edges: [{ id: 'edge1', source: 'start', target: 'end', type: 'default' }],
          connections: [],
          dataModels: [],
          forms: [],
          pages: [],
          generatedBy: 'SelfHealingOrchestrator',
          criticalFallback: true
        },
        summary: {
          title: "Emergency Fallback",
          description: "A critical error occurred but we generated a minimal workflow.",
          message: "Critical error - minimal workflow generated",
          nodeCount: 2,
          recoveryApplied: true,
          errors: [criticalError.message]
        },
        recoveryApplied: true,
        recoveryStats: {
          criticalError: true,
          errorMessage: criticalError.message
        }
      };
    }
  }

  /**
   * Execute with AI-powered intelligent retry and recovery
   * Uses AI to analyze failures, apply fixes, and resume generation
   * IMPORTANT: This method NEVER throws - it always returns a result
   */
  async executeWithAIRecovery(context) {
    // Wrap entire method in try-catch to ensure we NEVER throw
    try {
      let lastResult = null;
      let recoveryAttempts = 0;
      let lastError = null;
      const maxRecoveryAttempts = this.maxRetries + 2; // Extra attempts for AI recovery

      for (let attempt = 1; attempt <= maxRecoveryAttempts; attempt++) {
        context.attemptNumber = attempt;

        try {
          console.log(`[SelfHealing] Generation attempt ${attempt}/${maxRecoveryAttempts}`);
          this.generationState.phase = 'generation';

          if (context.emitEvent) {
            context.emitEvent({
              type: 'thinking-step',
              data: {
                agent: 'SelfHealingOrchestrator',
                step: attempt === 1 ? 'Starting Generation' : `Recovery Attempt ${recoveryAttempts + 1}`,
                content: attempt === 1
                  ? 'Generating complete application...'
                  : 'Applying AI-suggested fixes and resuming generation...'
              }
            });
          }

          // If we have partial results from previous attempt, resume from checkpoint
          if (Object.keys(this.generationState.partialResults).length > 0) {
            context = await this.resumeGeneration(context);
          }

          const result = await this.executeWithErrorHandling(context);

          // Check if generation is complete
          if (this.isGenerationComplete(result)) {
            // Merge any partial results from recovery
            const finalResult = this.mergePartialResults(result);

            if (attempt > 1 && context.emitEvent) {
              context.emitEvent({
                type: 'thinking-step',
                data: {
                  agent: 'SelfHealingOrchestrator',
                  step: 'Generation Complete',
                  content: `Application generated successfully after ${attempt} attempt(s) with AI-powered recovery!`
                }
              });
            }

            console.log('[SelfHealing] Generation completed successfully!');
            return finalResult;
          }

          // Generation incomplete - analyze what's missing
          console.log('[SelfHealing] Generation incomplete, analyzing missing components...');
          lastResult = result;

        } catch (error) {
          console.error(`[SelfHealing] Attempt ${attempt} failed:`, error.message);
          lastError = error;
          recoveryAttempts++;

          // Wrap recovery logic in try-catch to prevent propagation
          try {
            // Use AI to analyze the failure
            const failedComponent = this.identifyFailedComponent(error);
            this.generationState.phase = 'recovery';

            const aiAnalysis = await this.analyzeFailureWithAI(error, context, failedComponent);

            // Store error for learning
            context.errors = context.errors || [];
            context.errors.push({
              attempt,
              error: error.message,
              stack: error.stack,
              aiAnalysis,
              timestamp: new Date().toISOString()
            });

            // If AI says it's not recoverable after multiple attempts, use fallback
            if (!aiAnalysis.isRecoverable && recoveryAttempts >= 2) {
              console.log('[SelfHealing] AI determined error is not recoverable after multiple attempts');
              return await this.executeFinalFallback(context, error);
            }

            // Apply AI-recommended recovery strategy
            const recoveryResult = await this.applyRecoveryStrategy(aiAnalysis, context, failedComponent);

            // Handle recovery result
            if (recoveryResult.action === 'component_regenerated') {
              console.log(`[SelfHealing] Component ${recoveryResult.componentType} regenerated, continuing...`);
            } else if (recoveryResult.action === 'fallback_used') {
              console.log(`[SelfHealing] Fallback used for ${recoveryResult.componentType}, continuing...`);
            } else if (recoveryResult.action === 'retry' || recoveryResult.action === 'retry_simplified') {
              context = recoveryResult.context || context;
            }

            // Learn from error for future generations
            this.learnFromError(error, context);

          } catch (recoveryError) {
            // Recovery itself failed - log but don't propagate
            console.error(`[SelfHealing] Recovery process failed:`, recoveryError.message);
            context.errors = context.errors || [];
            context.errors.push({
              attempt,
              error: recoveryError.message,
              type: 'recovery_failure',
              timestamp: new Date().toISOString()
            });
          }

          // Wait before retry (exponential backoff)
          const delay = this.retryDelay * Math.pow(1.5, recoveryAttempts - 1);
          console.log(`[SelfHealing] Waiting ${delay}ms before next attempt...`);
          await this.sleep(delay);
        }
      }

      // All attempts exhausted - use intelligent fallback
      console.log('[SelfHealing] All recovery attempts exhausted. Executing final fallback...');
      return await this.executeFinalFallback(context, lastError || new Error('Maximum recovery attempts exceeded'));

    } catch (globalError) {
      // This is the absolute last resort - should never happen but just in case
      console.error('[SelfHealing] CRITICAL: Global error in executeWithAIRecovery:', globalError.message);
      return await this.executeFinalFallback(context, globalError);
    }
  }

  /**
   * Identify which component failed from error
   */
  identifyFailedComponent(error) {
    const message = error.message.toLowerCase();
    const stack = (error.stack || '').toLowerCase();

    if (message.includes('mobile') || stack.includes('mobileexpert') || stack.includes('crossplatform') || stack.includes('ios') || stack.includes('android')) {
      return 'mobileUI';
    }
    if (message.includes('form') || stack.includes('formexpert')) {
      return 'form';
    }
    if (message.includes('page') || stack.includes('pageexpert')) {
      return 'page';
    }
    if (message.includes('workflow') || stack.includes('workflowexpert')) {
      return 'workflow';
    }
    if (message.includes('data') || message.includes('model') || stack.includes('datamodelexpert')) {
      return 'dataModel';
    }
    if (message.includes('rule') || stack.includes('rulesexpert')) {
      return 'rules';
    }

    return 'unknown';
  }

  /**
   * Execute final fallback when all recovery attempts fail
   * IMPORTANT: This method NEVER throws - it always returns a result
   * This ensures the frontend always gets a usable response
   */
  async executeFinalFallback(context, lastError) {
    console.log('[SelfHealing] Executing final fallback strategy...');

    if (context.emitEvent) {
      context.emitEvent({
        type: 'thinking-step',
        data: {
          agent: 'SelfHealingOrchestrator',
          step: 'Final Fallback',
          content: 'Using fallback generation to create core components...'
        }
      });
    }

    // Create minimal workflow - this should never fail as it's just object creation
    let minimalWorkflow;
    try {
      minimalWorkflow = this.createMinimalWorkflow(context.userRequirements || 'Unknown application');
    } catch (createError) {
      console.error('[SelfHealing] Even createMinimalWorkflow failed:', createError.message);
      // Absolute bare minimum workflow - hardcoded
      const timestamp = Date.now();
      minimalWorkflow = {
        id: `workflow_emergency_${timestamp}`,
        name: 'Emergency Fallback Workflow',
        description: 'Generated as emergency fallback',
        version: '1.0.0',
        nodes: [
          { id: 'start', type: 'startProcess', data: { label: 'Start' }, position: { x: 100, y: 100 } },
          { id: 'end', type: 'endProcess', data: { label: 'End' }, position: { x: 100, y: 200 } }
        ],
        edges: [{ id: 'edge1', source: 'start', target: 'end', type: 'default' }],
        connections: [],
        dataModels: [],
        forms: [],
        pages: [],
        generatedBy: 'SelfHealingOrchestrator',
        fallbackMode: true,
        emergencyFallback: true
      };
    }

    // Safely merge any partial results - wrap in try-catch for safety
    try {
      const partialMobile = this.generationState?.partialResults?.mobileUI;
      const partialForms = this.generationState?.partialResults?.forms;
      const partialPages = this.generationState?.partialResults?.pages;

      if (partialMobile) {
        minimalWorkflow.mobileUI = partialMobile;
      }
      if (partialForms && Array.isArray(partialForms)) {
        minimalWorkflow.forms = [...(minimalWorkflow.forms || []), ...partialForms];
      }
      if (partialPages && Array.isArray(partialPages)) {
        minimalWorkflow.pages = [...(minimalWorkflow.pages || []), ...partialPages];
      }
    } catch (mergeError) {
      console.error('[SelfHealing] Error merging partial results:', mergeError.message);
      // Continue without partial results
    }

    // Generate designAnalysis for theme even in fallback mode
    // Theme CSS generation doesn't require LLM - it's just predefined colors
    try {
      if (context.designInput && context.designInput.theme) {
        const theme = context.designInput.theme;
        console.log('[SelfHealing] Generating theme CSS in fallback mode:', theme);

        const designAnalysis = this.generateFallbackDesignAnalysis(theme);
        if (designAnalysis) {
          minimalWorkflow.designAnalysis = designAnalysis;
          console.log('[SelfHealing] Successfully added designAnalysis to fallback workflow');
        }
      }
    } catch (designError) {
      console.error('[SelfHealing] Error generating design in fallback:', designError.message);
      // Continue without design - non-critical
    }

    // Build the result - this is just object creation, should never fail
    const errorMessages = [];
    try {
      if (context.errors && Array.isArray(context.errors)) {
        context.errors.forEach(e => {
          if (e && e.error) errorMessages.push(String(e.error).substring(0, 100));
        });
      }
    } catch (e) {
      errorMessages.push(lastError?.message || 'Unknown error');
    }

    console.log('[SelfHealing] Final fallback returning minimal workflow successfully');

    return {
      thinking: [],
      workflow: minimalWorkflow,
      summary: {
        title: "Application Generated with Recovery",
        description: "Generated using AI-powered recovery. Some components may need enhancement.",
        message: `Generated core application with ${this.generationState?.completedComponents?.length || 0} recovered component(s)`,
        nodeCount: minimalWorkflow.nodes?.length || 0,
        recoveryApplied: true,
        errors: errorMessages
      },
      recoveryApplied: true,
      recoveryStats: {
        attempts: context.attemptNumber || 0,
        completedComponents: this.generationState?.completedComponents || [],
        failedComponents: this.generationState?.failedComponents || [],
        finalFallbackUsed: true
      }
    };
  }

  /**
   * Legacy method - redirects to AI-powered recovery
   * @deprecated Use executeWithAIRecovery instead
   */
  async executeWithRetry(context) {
    return await this.executeWithAIRecovery(context);
  }

  /**
   * Execute with granular error handling at each phase
   */
  async executeWithErrorHandling(context) {
    const { userRequirements, existingWorkflow, conversationHistory, emitEvent, designInput } = context;

    try {
      // Attempt normal generation
      return await this.orchestrator.generateWorkflow(
        userRequirements,
        existingWorkflow,
        conversationHistory,
        emitEvent,
        designInput
      );
    } catch (error) {
      // Analyze error and attempt phase-specific recovery
      const errorType = this.classifyError(error);
      console.log(`[SelfHealing] Error classified as: ${errorType}`);

      switch (errorType) {
        case 'PLANNING_FAILURE':
          return await this.recoverFromPlanningFailure(context, error);

        case 'DESIGN_FAILURE':
          return await this.recoverFromDesignFailure(context, error);

        case 'EXPERT_EXECUTION_FAILURE':
          return await this.recoverFromExpertFailure(context, error);

        case 'VALIDATION_FAILURE':
          return await this.recoverFromValidationFailure(context, error);

        case 'AI_TIMEOUT':
        case 'AI_RATE_LIMIT':
          // These are transient - re-throw to trigger retry
          throw error;

        case 'NETWORK_ERROR':
          // Transient network issue - re-throw to trigger retry
          throw error;

        default:
          // Unknown error - try fallback
          throw error;
      }
    }
  }

  /**
   * Deep error analysis - extract detailed context about what failed
   */
  analyzeError(error, context) {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    const analysis = {
      type: this.classifyError(error),
      phase: this.extractPhase(stack, message),
      component: this.extractComponent(stack, message),
      rootCause: this.identifyRootCause(error, context),
      complexity: this.assessComplexity(context),
      suggestions: []
    };

    // Generate specific suggestions based on analysis
    if (analysis.type === 'JSON_TRUNCATION') {
      analysis.suggestions.push('Reduce component batch size');
      analysis.suggestions.push('Simplify component specifications');
      analysis.suggestions.push('Use sequential generation strategy');
    }

    if (analysis.type === 'AI_TIMEOUT') {
      analysis.suggestions.push('Simplify requirements');
      analysis.suggestions.push('Reduce number of components');
      analysis.suggestions.push('Split into smaller tasks');
    }

    if (analysis.type === 'PLANNING_FAILURE') {
      analysis.suggestions.push('Use simpler planning strategy');
      analysis.suggestions.push('Reduce planned component count');
      analysis.suggestions.push('Skip optional components');
    }

    if (analysis.complexity === 'high') {
      analysis.suggestions.push('Switch to sequential strategy');
      analysis.suggestions.push('Reduce total component count');
    }

    console.log('[SelfHealing] Error Analysis:', JSON.stringify(analysis, null, 2));
    return analysis;
  }

  /**
   * Extract which phase failed from error
   */
  extractPhase(stack, message) {
    if (stack.includes('planning') || message.includes('planning')) return 'planning';
    if (stack.includes('design') || message.includes('design')) return 'design';
    if (stack.includes('routing') || message.includes('routing')) return 'routing';
    if (stack.includes('execute') || message.includes('execution')) return 'execution';
    if (stack.includes('combine') || message.includes('combination')) return 'combination';
    if (stack.includes('validation') || message.includes('validation')) return 'validation';
    return 'unknown';
  }

  /**
   * Extract which component failed
   */
  extractComponent(stack, message) {
    if (stack.includes('datamodel') || message.includes('data model')) return 'dataModel';
    if (stack.includes('workflow') || message.includes('workflow')) return 'workflow';
    if (stack.includes('form') || message.includes('form')) return 'form';
    if (stack.includes('page') || message.includes('page')) return 'page';
    return 'unknown';
  }

  /**
   * Identify root cause from error pattern
   */
  identifyRootCause(error, context) {
    const message = error.message.toLowerCase();

    if (message.includes('truncat') || message.includes('incomplete')) {
      return 'AI response truncated - request too large';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'AI processing timeout - complexity too high';
    }
    if (message.includes('rate limit')) {
      return 'API rate limit exceeded - too many requests';
    }
    if (message.includes('parse') || message.includes('invalid json') || message.includes('expected')) {
      return 'JSON parsing failed - malformed response (self-healing will attempt AI correction)';
    }
    if (message.includes('null') || message.includes('undefined')) {
      return 'Missing data - component generation incomplete';
    }

    return 'Unknown - needs investigation';
  }

  /**
   * Classify error for JSON-specific handling
   */
  isJsonParseError(error) {
    const message = error.message.toLowerCase();
    return message.includes('parse') ||
           message.includes('json') ||
           message.includes('expected') ||
           message.includes('unexpected token') ||
           message.includes('position');
  }

  /**
   * Assess complexity of current request
   */
  assessComplexity(context) {
    const requirements = context.userRequirements.toLowerCase();
    const wordCount = requirements.split(/\s+/).length;

    // Check for complexity indicators
    const complexKeywords = ['complex', 'advanced', 'multiple', 'integration', 'workflow', 'approval'];
    const matches = complexKeywords.filter(keyword => requirements.includes(keyword)).length;

    if (wordCount > 100 || matches >= 3) return 'high';
    if (wordCount > 50 || matches >= 2) return 'medium';
    return 'low';
  }

  /**
   * Analyze problem and generate intelligent solution
   */
  async analyzeProblemAndGenerateSolution(context) {
    console.log('[SelfHealing] Analyzing problem to generate optimal solution...');

    const lastError = context.errors[context.errors.length - 1];
    const analysis = lastError.analysis;

    // Default solution
    let solution = {
      strategy: 'retry_same',
      description: 'Retry with same approach',
      modifications: {}
    };

    // Generate solution based on error analysis
    if (analysis.type === 'JSON_PARSE_ERROR' || analysis.rootCause.includes('malformed')) {
      solution = {
        strategy: 'retry_with_self_healing',
        description: 'JSON parsing failed - experts will use AI self-correction on retry',
        modifications: {
          useSelfHealingJson: true,
          forceJsonCorrection: true
        }
      };
    }
    else if (analysis.type === 'JSON_TRUNCATION' || analysis.rootCause.includes('truncated')) {
      solution = {
        strategy: 'reduce_batch_size',
        description: 'Reduce component batch size to prevent AI response truncation',
        modifications: {
          forcedStrategy: 'sequential',
          maxComponentsPerBatch: 2,
          simplifySpecs: true
        }
      };
    }
    else if (analysis.type === 'AI_TIMEOUT' || analysis.rootCause.includes('timeout')) {
      solution = {
        strategy: 'simplify_complexity',
        description: 'Reduce complexity and component count to prevent timeout',
        modifications: {
          reduceComponents: true,
          maxComponents: 5,
          skipOptional: true,
          forcedStrategy: 'parallel' // Parallel is actually faster for simple cases
        }
      };
    }
    else if (analysis.type === 'PLANNING_FAILURE') {
      solution = {
        strategy: 'use_simple_plan',
        description: 'Skip AI planning and use predefined simple plan',
        modifications: {
          useSimplePlan: true,
          skipAIPlanning: true,
          maxComponents: 3
        }
      };
    }
    else if (analysis.type === 'DESIGN_FAILURE') {
      solution = {
        strategy: 'skip_design',
        description: 'Use default design system without AI generation',
        modifications: {
          skipDesignGeneration: true,
          useDefaultDesign: true
        }
      };
    }
    else if (analysis.type === 'EXPERT_EXECUTION_FAILURE') {
      solution = {
        strategy: 'use_alternative_expert',
        description: 'Switch to simpler expert or skip failed component',
        modifications: {
          useSimpleExperts: true,
          skipFailedComponent: analysis.component
        }
      };
    }
    else if (analysis.complexity === 'high') {
      solution = {
        strategy: 'reduce_scope',
        description: 'Reduce overall scope to match complexity level',
        modifications: {
          forcedStrategy: 'sequential',
          maxComponents: 6,
          simplifySpecs: true
        }
      };
    }

    console.log('[SelfHealing] Generated solution:', JSON.stringify(solution, null, 2));
    return solution;
  }

  /**
   * Apply solution modifications to context
   */
  applySolution(context, solution) {
    console.log('[SelfHealing] Applying solution modifications...');

    context.solution = solution;
    context.modifications = solution.modifications;

    // Apply modifications that affect the generation process
    if (solution.modifications.forcedStrategy) {
      context.forcedGenerationStrategy = solution.modifications.forcedStrategy;
    }

    if (solution.modifications.maxComponents) {
      context.maxComponents = solution.modifications.maxComponents;
    }

    if (solution.modifications.useSimplePlan) {
      context.useSimplePlan = true;
    }

    if (solution.modifications.skipDesignGeneration) {
      context.skipDesignGeneration = true;
    }

    console.log('[SelfHealing] Context updated with solution modifications');
  }

  /**
   * Classify error type for targeted recovery
   */
  classifyError(error) {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('planning') || stack.includes('planningexpert')) {
      return 'PLANNING_FAILURE';
    }
    if (message.includes('design') || stack.includes('designexpert')) {
      return 'DESIGN_FAILURE';
    }
    if (message.includes('expert') && message.includes('failed')) {
      return 'EXPERT_EXECUTION_FAILURE';
    }
    if (message.includes('validation')) {
      return 'VALIDATION_FAILURE';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'AI_TIMEOUT';
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return 'AI_RATE_LIMIT';
    }
    if (message.includes('network') || message.includes('econnrefused') || message.includes('fetch')) {
      return 'NETWORK_ERROR';
    }
    // JSON parsing errors - now handled by self-healing with AI correction
    if (message.includes('expected') || message.includes('unexpected token') || message.includes('position')) {
      return 'JSON_PARSE_ERROR';
    }
    if (message.includes('json') || message.includes('parse') || message.includes('truncat')) {
      return 'JSON_TRUNCATION';
    }

    return 'UNKNOWN';
  }

  /**
   * Recover from planning phase failure
   */
  async recoverFromPlanningFailure(context, error) {
    console.log('[SelfHealing] Attempting recovery from planning failure...');

    if (context.emitEvent) {
      context.emitEvent({
        type: 'thinking-step',
        data: {
          agent: 'SelfHealingOrchestrator',
          step: 'Planning Recovery',
          content: 'Planning phase failed. Generating simplified plan...'
        }
      });
    }

    // Create a simple default plan
    const simplePlan = this.createDefaultPlan(context.userRequirements);
    context.partialResults.plan = simplePlan;

    // Try generation with simple plan
    try {
      // Use orchestrator's internal methods directly
      const routing = await this.orchestrator.routeRequest(
        context.userRequirements,
        context.conversationHistory,
        context.emitEvent,
        simplePlan
      );

      const results = await this.orchestrator.executeExperts(
        routing,
        context.userRequirements,
        context.existingWorkflow,
        context.conversationHistory,
        context.emitEvent,
        context.designInput,
        simplePlan
      );

      const combined = await this.orchestrator.combineResults(results, routing, context.emitEvent);
      const finalWorkflow = await this.orchestrator.finalizeWorkflow(combined, routing);

      return {
        thinking: [],
        workflow: finalWorkflow,
        summary: this.orchestrator.generateSummary(finalWorkflow, routing),
        recoveryApplied: 'Planning recovery with simplified plan'
      };
    } catch (recoveryError) {
      console.error('[SelfHealing] Planning recovery failed:', recoveryError.message);
      throw error; // Re-throw original error to trigger retry
    }
  }

  /**
   * Recover from design phase failure
   */
  async recoverFromDesignFailure(context, error) {
    console.log('[SelfHealing] Attempting recovery from design failure...');

    if (context.emitEvent) {
      context.emitEvent({
        type: 'thinking-step',
        data: {
          agent: 'SelfHealingOrchestrator',
          step: 'Design Recovery',
          content: 'Design generation failed. Using default design system...'
        }
      });
    }

    // Continue without design - the orchestrator already has fallback logic
    // Re-throw to trigger retry (which will use default design)
    throw error;
  }

  /**
   * Recover from expert execution failure
   */
  async recoverFromExpertFailure(context, error) {
    console.log('[SelfHealing] Attempting recovery from expert failure...');

    if (context.emitEvent) {
      context.emitEvent({
        type: 'thinking-step',
        data: {
          agent: 'SelfHealingOrchestrator',
          step: 'Expert Recovery',
          content: 'Some experts failed. Generating with available components...'
        }
      });
    }

    // Try with a simpler expert configuration
    // Re-throw to trigger retry with modified approach
    throw error;
  }

  /**
   * Recover from validation failure
   */
  async recoverFromValidationFailure(context, error) {
    console.log('[SelfHealing] Validation failure detected...');

    if (context.emitEvent) {
      context.emitEvent({
        type: 'thinking-step',
        data: {
          agent: 'SelfHealingOrchestrator',
          step: 'Validation Recovery',
          content: 'Validation issues detected. Auto-fix system will resolve...'
        }
      });
    }

    // Validation failures are already handled by auto-fix system
    // Re-throw to let auto-fix handle it
    throw error;
  }

  /**
   * Final fallback strategy when all else fails
   */
  async executeFallbackStrategy(context) {
    console.log('[SelfHealing] Executing final fallback strategy...');

    if (context.emitEvent) {
      context.emitEvent({
        type: 'thinking-step',
        data: {
          agent: 'SelfHealingOrchestrator',
          step: 'Fallback Strategy',
          content: 'Generating minimal viable workflow...'
        }
      });
    }

    try {
      // Create absolute minimal workflow
      const minimalWorkflow = this.createMinimalWorkflow(context.userRequirements);

      return {
        thinking: [],
        workflow: minimalWorkflow,
        summary: {
          title: "Minimal Workflow Generated",
          description: "Generated a basic workflow structure due to generation challenges. You can enhance it manually.",
          message: "Minimal viable workflow created",
          nodeCount: minimalWorkflow.nodes?.length || 0,
          fallbackApplied: true,
          errors: context.errors
        },
        fallbackApplied: true,
        errors: context.errors
      };
    } catch (fallbackError) {
      console.error('[SelfHealing] Fallback strategy failed:', fallbackError.message);

      // Absolute last resort - throw comprehensive error
      const comprehensiveError = new Error(
        `Workflow generation failed after ${this.maxRetries} attempts and fallback strategy. ` +
        `Errors: ${context.errors.map(e => e.error).join('; ')}`
      );
      comprehensiveError.attempts = context.errors;
      throw comprehensiveError;
    }
  }

  /**
   * Create a default simple plan
   */
  createDefaultPlan(requirements) {
    return {
      componentSpecs: [
        {
          type: 'dataModel',
          name: 'MainEntity',
          description: 'Primary data entity',
          priority: 1
        },
        {
          type: 'workflow',
          name: 'BasicWorkflow',
          description: 'Basic process workflow',
          priority: 1
        },
        {
          type: 'form',
          name: 'InputForm',
          description: 'Data input form',
          priority: 1
        }
      ],
      generationStrategy: 'parallel',
      complexity: 'simple'
    };
  }

  /**
   * Create minimal viable workflow
   */
  createMinimalWorkflow(requirements) {
    const timestamp = Date.now();

    return {
      id: `workflow_minimal_${timestamp}`,
      name: 'Basic Workflow',
      description: `Generated workflow for: ${requirements.substring(0, 100)}`,
      version: '1.0.0',
      nodes: [
        {
          id: 'start',
          type: 'startProcess',
          data: {
            label: 'Start',
            description: 'Workflow start point'
          },
          position: { x: 100, y: 100 }
        },
        {
          id: 'task1',
          type: 'userTask',
          data: {
            label: 'Main Task',
            description: 'Primary task based on requirements'
          },
          position: { x: 100, y: 200 }
        },
        {
          id: 'end',
          type: 'endProcess',
          data: {
            label: 'End',
            description: 'Workflow completion'
          },
          position: { x: 100, y: 300 }
        }
      ],
      edges: [
        {
          id: 'edge1',
          source: 'start',
          target: 'task1',
          type: 'default'
        },
        {
          id: 'edge2',
          source: 'task1',
          target: 'end',
          type: 'default'
        }
      ],
      connections: [],
      dataModels: [],
      forms: [
        {
          id: `form_minimal_${timestamp}`,
          name: 'Basic Form',
          title: 'Input Form',
          description: 'Basic data collection form',
          fields: [
            {
              id: 'field1',
              name: 'name',
              label: 'Name',
              type: 'text',
              required: true,
              placeholder: 'Enter name'
            },
            {
              id: 'field2',
              name: 'description',
              label: 'Description',
              type: 'textarea',
              required: false,
              placeholder: 'Enter description'
            }
          ],
          layout: {
            type: 'single-column',
            sections: []
          }
        }
      ],
      pages: [],
      generatedBy: 'SelfHealingOrchestrator',
      fallbackMode: true,
      autoFixesApplied: []
    };
  }

  /**
   * Generate design analysis with theme CSS for fallback mode
   * This doesn't require LLM - just applies predefined color schemes
   */
  generateFallbackDesignAnalysis(theme) {
    console.log('[SelfHealing] Generating fallback design analysis for theme:', theme);

    const designSystem = {
      colors: {},
      typography: {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: { base: '14px', h1: '24px', h2: '20px', label: '14px', input: '14px' },
        fontWeight: { title: 600, label: 500, input: 400 }
      },
      spacing: {
        container: '24px',
        fieldGap: '16px',
        sectionGap: '32px',
        inputPadding: '10px 12px'
      },
      components: {
        input: { borderRadius: '6px', borderWidth: '1px', height: '42px' },
        button: {
          primary: { padding: '10px 24px', borderRadius: '6px' },
          secondary: { padding: '10px 24px', borderRadius: '6px' }
        },
        card: { borderRadius: '8px', shadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '24px' }
      }
    };

    if (theme === 'dark') {
      designSystem.colors = {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        background: '#0f172a',
        cardBackground: '#1e293b',
        cardBorder: '#334155',
        text: '#f1f5f9',
        textSecondary: '#94a3b8',
        labelText: '#cbd5e1',
        border: '#475569',
        focus: '#818cf8',
        info: '#38bdf8',
        infoBackground: '#0c4a6e',
        error: '#f87171',
        success: '#4ade80',
        warning: '#fbbf24'
      };
      designSystem.source = 'dark-theme';
    } else {
      // Light theme (default)
      designSystem.colors = {
        primary: '#4f46e5',
        secondary: '#7c3aed',
        background: '#f8fafc',
        cardBackground: '#ffffff',
        cardBorder: '#e2e8f0',
        text: '#1e293b',
        textSecondary: '#64748b',
        labelText: '#475569',
        border: '#cbd5e1',
        focus: '#6366f1',
        info: '#0284c7',
        infoBackground: '#f0f9ff',
        error: '#dc2626',
        success: '#16a34a',
        warning: '#d97706'
      };
      designSystem.source = 'light-theme';
    }

    // Generate CSS from design system
    const generatedCSS = this.generateCSSFromDesignSystem(designSystem);

    return {
      designSystem,
      generatedCSS,
      themeName: theme,
      source: `${theme}-theme`
    };
  }

  /**
   * Generate CSS from design system for fallback mode
   */
  generateCSSFromDesignSystem(designSystem) {
    const colors = designSystem.colors;
    const typography = designSystem.typography;

    return `
/* Generated Theme CSS - ${designSystem.source || 'auto'} */
:root {
  --color-primary: ${colors.primary};
  --color-secondary: ${colors.secondary};
  --color-background: ${colors.background};
  --color-card-background: ${colors.cardBackground};
  --color-card-border: ${colors.cardBorder};
  --color-text: ${colors.text};
  --color-text-secondary: ${colors.textSecondary};
  --color-label: ${colors.labelText};
  --color-border: ${colors.border};
  --color-focus: ${colors.focus};
  --color-error: ${colors.error};
  --color-success: ${colors.success};
  --color-warning: ${colors.warning};
  --font-family: ${typography.fontFamily};
}

body, .app-container, .preview-frame {
  background-color: var(--color-background);
  color: var(--color-text);
  font-family: var(--font-family);
}

.card, .form-card, .page-section {
  background-color: var(--color-card-background);
  border: 1px solid var(--color-card-border);
  border-radius: 8px;
  padding: 24px;
}

h1, h2, h3, h4, h5, h6 {
  color: var(--color-text);
}

p, span, label {
  color: var(--color-text-secondary);
}

input, textarea, select {
  background-color: var(--color-card-background);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  border-radius: 6px;
  padding: 10px 12px;
}

input:focus, textarea:focus, select:focus {
  border-color: var(--color-focus);
  outline: none;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

button, .btn {
  border-radius: 6px;
  padding: 10px 24px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary, button[type="submit"] {
  background-color: var(--color-primary);
  color: white;
  border: none;
}

.btn-primary:hover, button[type="submit"]:hover {
  opacity: 0.9;
}

.btn-secondary {
  background-color: var(--color-card-background);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.alert-error {
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--color-error);
  color: var(--color-error);
}

.alert-success {
  background-color: rgba(16, 185, 129, 0.1);
  border: 1px solid var(--color-success);
  color: var(--color-success);
}
`;
  }

  /**
   * Learn from errors to improve future generations
   */
  learnFromError(error, context) {
    const errorRecord = {
      type: this.classifyError(error),
      message: error.message,
      attempt: context.attemptNumber,
      requirements: context.userRequirements.substring(0, 200),
      timestamp: new Date().toISOString()
    };

    this.errorHistory.push(errorRecord);

    // Keep only last 100 errors
    if (this.errorHistory.length > 100) {
      this.errorHistory.shift();
    }

    // Log error patterns
    const errorTypes = this.errorHistory.map(e => e.type);
    const mostCommon = this.getMostCommon(errorTypes);
    if (mostCommon) {
      console.log(`[SelfHealing] Learning: Most common error type is "${mostCommon}"`);
    }
  }

  /**
   * Get most common element in array
   */
  getMostCommon(arr) {
    if (arr.length === 0) return null;

    const counts = {};
    let maxCount = 0;
    let mostCommon = null;

    arr.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
      if (counts[item] > maxCount) {
        maxCount = counts[item];
        mostCommon = item;
      }
    });

    return mostCommon;
  }

  /**
   * Utility: Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = {
      total: this.errorHistory.length,
      byType: {},
      recentErrors: this.errorHistory.slice(-10)
    };

    this.errorHistory.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
    });

    return stats;
  }
}

module.exports = SelfHealingOrchestrator;
