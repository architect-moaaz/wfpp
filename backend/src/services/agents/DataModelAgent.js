/**
 * DataModelAgent - Generates data models and schemas
 */

const BaseAgent = require('./BaseAgent');

class DataModelAgent extends BaseAgent {
  constructor() {
    const knowledgeBase = `
# Data Model Design Knowledge Base

## Your Responsibilities:
1. Analyze workflow nodes to identify data entities
2. Design normalized data schemas
3. Define field types, validation rules, and constraints
4. Map relationships between entities
5. Ensure data consistency across workflow

## Field Types:
- string: Text data (short to medium length)
- text: Long text data
- number: Numeric values (integer or decimal)
- boolean: True/false values
- date: Date values
- datetime: Date and time values
- email: Email addresses (with validation)
- phone: Phone numbers
- url: URLs
- enum: Predefined set of values
- array: List of values
- object: Nested object structure

## Validation Rules:
- required: Field must have a value
- unique: Value must be unique across records
- minLength/maxLength: String length constraints
- min/max: Numeric range constraints
- pattern: Regex validation pattern
- custom: Custom validation logic

## Best Practices:
1. Use descriptive field names (snake_case)
2. Set appropriate defaults
3. Mark audit fields (created_at, updated_at, created_by)
4. Define indexes for frequently queried fields
5. Normalize data to avoid redundancy
6. Consider data privacy and security
7. ALWAYS include an "id" field as primaryKey: true for each entity
8. Mark foreign key fields with foreignKey: true
9. Foreign key field names should match the foreignKey in relationships

## Output Format:
Return ONLY valid JSON:
{
  "dataModels": [
    {
      "id": "model_<workflow_id>_<sequence>",
      "name": "EntityName",
      "description": "Brief description",
      "fields": [
        {
          "id": "field_<sequence>",
          "name": "field_name",
          "type": "string",
          "required": true,
          "primaryKey": false,
          "foreignKey": false,
          "validation": {
            "minLength": 1,
            "maxLength": 255
          },
          "defaultValue": null,
          "description": "Field purpose"
        }
      ],
      "relationships": [
        {
          "type": "hasMany|hasOne|belongsTo|manyToMany",
          "target": "OtherEntity",
          "targetModel": "OtherEntity",
          "foreignKey": "other_entity_id",
          "description": "Relationship description"
        }
      ],
      "indexes": ["field_name"],
      "metadata": {
        "timestamps": true,
        "softDelete": true
      }
    }
  ]
}
`;

    super('DataModelAgent', knowledgeBase, 'claude-sonnet-4-20250514');
  }

  /**
   * Generate data models from workflow
   */
  async execute(sharedContext, onThinking) {
    const { userRequirements, workflow } = sharedContext;

    if (!workflow || !workflow.nodes) {
      throw new Error('DataModelAgent requires workflow structure');
    }

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Analyzing Workflow',
        content: 'Identifying data entities from workflow nodes...'
      });
    }

    // Identify nodes that require data
    const dataNodes = workflow.nodes.filter(node =>
      node.type === 'startProcess' ||
      node.type === 'userTask' ||
      node.type === 'dataProcess'
    );

    const prompt = `Analyze this workflow and generate appropriate data models with proper entity relationships.

User Requirements: "${userRequirements}"

Workflow Structure:
${JSON.stringify({ nodes: dataNodes, connections: workflow.connections }, null, 2)}

Generate data models that:
1. Capture all data collected in the workflow
2. Support the business process requirements
3. Follow database design best practices
4. Include proper validation and constraints
5. MUST define relationships between entities (hasMany, hasOne, belongsTo, manyToMany)

IMPORTANT - Entity Relationships:
- Identify all relationships between entities
- For each relationship, specify: type, target entity name (targetModel), and foreignKey
- Use proper relationship types:
  * hasMany: One entity has multiple of another (e.g., Customer hasMany Orders)
  * hasOne: One-to-one relationship (e.g., User hasOne Profile)
  * belongsTo: Reverse of hasMany (e.g., Order belongsTo Customer)
  * manyToMany: Many-to-many relationship (e.g., Students manyToMany Courses)

Consider:
- What data is collected at each step?
- What are the main entities?
- How do entities relate to each other? (CRITICAL - define these relationships)
- What fields are required vs optional?
- What are the foreign keys connecting entities?

Example relationship structure:
{
  "type": "hasMany",
  "target": "Order",
  "targetModel": "Order",
  "foreignKey": "customer_id",
  "description": "Customer can have multiple orders"
}`;

    const messages = [{
      role: 'user',
      content: prompt
    }];

    try {
      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'Generating Data Models',
          content: 'Designing schemas and field structures...'
        });
      }

      const responseText = await this.getResponse(messages);

      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'Parsing Response',
          content: 'Validating data model structure...'
        });
      }

      const result = this.parseJsonResponse(responseText);

      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'Data Models Generated',
          content: `Created ${result.dataModels?.length || 0} data model(s)`
        });
      }

      return result.dataModels || [];
    } catch (error) {
      console.error('DataModelAgent execution failed:', error);
      throw new Error(`DataModelAgent failed: ${error.message}`);
    }
  }
}

module.exports = DataModelAgent;
