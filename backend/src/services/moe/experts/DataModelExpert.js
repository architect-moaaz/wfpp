/**
 * Data Model Expert
 * Generates data models individually or in batches
 */

const Anthropic = require('@anthropic-ai/sdk');

class DataModelExpert {
  constructor() {
    this.name = 'DataModelExpert';
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  /**
   * Check if error is a network/connection error that should trigger retry
   */
  isNetworkError(error) {
    const networkErrorCodes = [
      'ENOTFOUND', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT',
      'ENETUNREACH', 'EHOSTUNREACH', 'EPIPE', 'EAI_AGAIN',
      'CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
    ];
    const errorCode = error.code || error.cause?.code;
    if (errorCode && networkErrorCodes.includes(errorCode)) return true;
    if (error.name === 'APIConnectionError' ||
        error.message?.includes('Connection error') ||
        error.message?.includes('fetch failed') ||
        error.message?.includes('ENOTFOUND') ||
        error.message?.includes('getaddrinfo')) return true;
    return false;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute API call with network retry and exponential backoff
   */
  async executeWithNetworkRetry(apiCall, maxRetries = 3, baseDelayMs = 1000) {
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error;
        if (this.isNetworkError(error)) {
          const delay = baseDelayMs * Math.pow(2, attempt - 1);
          console.warn(`[${this.name}] Network error on attempt ${attempt}/${maxRetries}: ${error.message}`);
          if (attempt < maxRetries) {
            console.log(`[${this.name}] Retrying in ${delay}ms...`);
            await this.sleep(delay);
          } else {
            console.error(`[${this.name}] All ${maxRetries} network retry attempts failed`);
          }
        } else {
          throw error;
        }
      }
    }
    throw lastError;
  }

  /**
   * Generate a single data model
   */
  async generateSingle(spec, componentPlan, existingComponents) {
    console.log(`[DataModelExpert] Generating data model: ${spec.name}...`);

    const prompt = this.buildSinglePrompt(spec, componentPlan, existingComponents);

    const response = await this.executeWithNetworkRetry(async () => {
      return await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
    });

    const dataModelText = response.content[0].text;
    const dataModel = this.parseDataModel(dataModelText);

    // Preserve dataModelAssociation metadata for later linking by ComponentOrchestrator
    if (spec.dataModelAssociation) {
      dataModel._dataModelAssociation = spec.dataModelAssociation;
      dataModel._specName = spec.name; // Original spec name for matching
    }

    console.log(`[DataModelExpert] Generated data model: ${dataModel.name}`);
    return dataModel;
  }

  /**
   * Generate multiple data models in one call (for parallel strategy)
   */
  async generateBatch(specs, componentPlan) {
    if (specs.length === 0) return [];
    if (specs.length === 1) return [await this.generateSingle(specs[0], componentPlan, {})];

    console.log(`[DataModelExpert] Generating ${specs.length} data models in batch...`);

    const prompt = this.buildBatchPrompt(specs, componentPlan);

    const response = await this.executeWithNetworkRetry(async () => {
      return await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
    });

    const dataModelsText = response.content[0].text;
    const dataModels = this.parseDataModels(dataModelsText);

    // Build spec map for matching back associations
    const specMap = new Map();
    specs.forEach(spec => {
      specMap.set(spec.name.toLowerCase(), spec);
      // Also add normalized version without spaces/special chars
      specMap.set(spec.name.toLowerCase().replace(/[^a-z0-9]/g, ''), spec);
    });

    // Attach _dataModelAssociation metadata to each generated data model
    dataModels.forEach(dataModel => {
      const normalizedName = dataModel.name?.toLowerCase() || '';
      const normalizedNoSpecial = normalizedName.replace(/[^a-z0-9]/g, '');

      // Try to find matching spec
      let matchingSpec = specMap.get(normalizedName) || specMap.get(normalizedNoSpecial);

      // Fallback: fuzzy match
      if (!matchingSpec) {
        for (const [key, spec] of specMap.entries()) {
          if (normalizedName.includes(key) || key.includes(normalizedName)) {
            matchingSpec = spec;
            break;
          }
        }
      }

      if (matchingSpec && matchingSpec.dataModelAssociation) {
        dataModel._dataModelAssociation = matchingSpec.dataModelAssociation;
        dataModel._specName = matchingSpec.name;
      }
    });

    console.log(`[DataModelExpert] Generated ${dataModels.length} data models`);
    return dataModels;
  }

  buildSinglePrompt(spec, componentPlan, existingComponents) {
    // Extract data model association context from spec (for plan-based linking)
    const dataModelAssociation = spec.dataModelAssociation || {};
    const associationContext = dataModelAssociation.usedByWorkflows ? `
**DATA MODEL ASSOCIATION CONTEXT**:
- Used By Workflows: ${(dataModelAssociation.usedByWorkflows || []).join(', ') || 'N/A'}
- Used By Forms: ${(dataModelAssociation.usedByForms || []).join(', ') || 'N/A'}
- Is Primary Entity: ${dataModelAssociation.isPrimary ? 'Yes' : 'No'}
- Entity Type: ${dataModelAssociation.entityType || 'main'}
${spec.fieldHints && spec.fieldHints.length > 0 ? `- Suggested Fields: ${spec.fieldHints.join(', ')}` : ''}

IMPORTANT: Design this data model specifically for its role in the application:
${dataModelAssociation.entityType === 'main' ? '- This is a MAIN entity - it represents the core business object for the application.' : ''}
${dataModelAssociation.entityType === 'supporting' ? '- This is a SUPPORTING entity - it complements the main entity with additional data.' : ''}
${dataModelAssociation.entityType === 'lookup' ? '- This is a LOOKUP entity - it provides reference data (statuses, categories, etc.).' : ''}
${dataModelAssociation.isPrimary ? '- As the PRIMARY data model, ensure it has all fields needed by the associated workflows and forms.' : ''}
` : '';

    return `Generate a data model for: ${spec.name}

Purpose: ${spec.purpose}
${spec.description ? `Description: ${spec.description}` : ''}
${associationContext}
Context:
- Application: ${componentPlan.overview.name}
- Domain: ${componentPlan.overview.category || 'General'}
${existingComponents.dataModels ? `- Existing data models: ${existingComponents.dataModels.map(dm => dm.name).join(', ')}` : ''}

Requirements:
- Keep it simple (5-8 fields maximum)
- Include only essential fields for ${spec.name}
- Use appropriate field types (string, number, boolean, date, etc.)
- Add brief descriptions for each field
- **IMPORTANT**: The FIRST field MUST be the primary key with "primaryKey": true
${spec.fieldHints && spec.fieldHints.length > 0 ? `- Include these suggested fields where appropriate: ${spec.fieldHints.join(', ')}` : ''}

Return ONLY valid JSON in this format:
{
  "id": "unique-id",
  "name": "${spec.name}",
  "description": "Brief description",
  "fields": [
    {
      "name": "id",
      "type": "string",
      "description": "Unique identifier",
      "required": true,
      "primaryKey": true,
      "defaultValue": null
    },
    {
      "name": "otherField",
      "type": "string|number|boolean|date|...",
      "description": "What this field stores",
      "required": true|false,
      "defaultValue": null
    }
  ],
  "relationships": [],
  "indexes": [],
  "constraints": {}
}`;
  }

  buildBatchPrompt(specs, componentPlan) {
    // Build detailed spec list with association context
    const specList = specs.map(s => {
      const assoc = s.dataModelAssociation || {};
      let specInfo = `- ${s.name}: ${s.purpose}`;
      if (assoc.usedByWorkflows && assoc.usedByWorkflows.length > 0) {
        specInfo += `\n    Used by workflows: ${assoc.usedByWorkflows.join(', ')}`;
      }
      if (assoc.usedByForms && assoc.usedByForms.length > 0) {
        specInfo += `\n    Used by forms: ${assoc.usedByForms.join(', ')}`;
      }
      if (assoc.entityType) {
        specInfo += `\n    Entity type: ${assoc.entityType}${assoc.isPrimary ? ' (PRIMARY)' : ''}`;
      }
      if (s.fieldHints && s.fieldHints.length > 0) {
        specInfo += `\n    Suggested fields: ${s.fieldHints.join(', ')}`;
      }
      return specInfo;
    }).join('\n');

    return `Generate ${specs.length} data models for: ${componentPlan.overview.name}

Data models needed (with their workflow/form associations):
${specList}

Requirements for EACH model:
- Keep it simple (5-8 fields maximum per model)
- Include only essential fields
- Use appropriate field types
- Add brief descriptions
- **IMPORTANT**: Each model's FIRST field MUST be the primary key with "primaryKey": true
- Consider the workflow/form associations when designing fields - include fields that the associated forms will need
- For PRIMARY entities, ensure comprehensive field coverage for all associated workflows

Return ONLY valid JSON array:
[
  {
    "id": "unique-id",
    "name": "ModelName",
    "description": "Brief description",
    "fields": [
      {
        "name": "id",
        "type": "string",
        "description": "Unique identifier",
        "required": true,
        "primaryKey": true,
        "defaultValue": null
      }
    ],
    "relationships": [],
    "indexes": [],
    "constraints": {}
  }
]`;
  }

  parseDataModel(text) {
    try {
      // Extract JSON from markdown code blocks if present
      let jsonText = text.trim();
      if (jsonText.includes('```json')) {
        const match = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) jsonText = match[1].trim();
      } else if (jsonText.includes('```')) {
        const match = jsonText.match(/```\s*([\s\S]*?)\s*```/);
        if (match) jsonText = match[1].trim();
      }

      // Find JSON object
      if (!jsonText.startsWith('{')) {
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) jsonText = jsonMatch[0];
      }

      // Try to repair common JSON issues
      jsonText = this.repairJson(jsonText);

      return JSON.parse(jsonText);
    } catch (error) {
      console.error('[DataModelExpert] Parse error:', error);
      console.error('[DataModelExpert] Text:', text.substring(0, 500));
      // Return fallback instead of throwing
      console.warn('[DataModelExpert] Returning fallback data model');
      return this.createFallbackDataModel();
    }
  }

  /**
   * Repair common JSON issues
   */
  repairJson(jsonStr) {
    let repaired = jsonStr;
    // Remove trailing commas
    repaired = repaired.replace(/,(\s*[\]}])/g, '$1');
    // Fix missing commas between objects
    repaired = repaired.replace(/\}(\s*)\{/g, '},$1{');
    // Balance brackets
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    if (openBraces > closeBraces) {
      repaired += '}'.repeat(openBraces - closeBraces);
    }
    return repaired;
  }

  /**
   * Create fallback data model when parsing fails
   */
  createFallbackDataModel() {
    return {
      id: `dm_fallback_${Date.now()}`,
      name: 'GeneratedModel',
      description: 'Auto-generated data model',
      fields: [
        { name: 'id', type: 'string', description: 'Unique identifier', required: true, primaryKey: true, defaultValue: null },
        { name: 'name', type: 'string', description: 'Name', required: true, defaultValue: null },
        { name: 'createdAt', type: 'date', description: 'Creation date', required: false, defaultValue: null }
      ],
      relationships: [],
      indexes: [],
      constraints: {}
    };
  }

  parseDataModels(text) {
    try {
      let jsonText = text.trim();
      if (jsonText.includes('```json')) {
        const match = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) jsonText = match[1].trim();
      } else if (jsonText.includes('```')) {
        const match = jsonText.match(/```\s*([\s\S]*?)\s*```/);
        if (match) jsonText = match[1].trim();
      }

      // Find JSON array
      if (!jsonText.startsWith('[')) {
        const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
        if (jsonMatch) jsonText = jsonMatch[0];
      }

      // Try to repair common JSON issues
      jsonText = this.repairJson(jsonText);
      // Balance array brackets
      const openBrackets = (jsonText.match(/\[/g) || []).length;
      const closeBrackets = (jsonText.match(/\]/g) || []).length;
      if (openBrackets > closeBrackets) {
        jsonText += ']'.repeat(openBrackets - closeBrackets);
      }

      return JSON.parse(jsonText);
    } catch (error) {
      console.error('[DataModelExpert] Parse error:', error);
      console.error('[DataModelExpert] Text:', text.substring(0, 500));
      // Return fallback instead of throwing
      console.warn('[DataModelExpert] Returning fallback data models array');
      return [this.createFallbackDataModel()];
    }
  }
}

module.exports = DataModelExpert;
