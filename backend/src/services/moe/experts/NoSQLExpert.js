/**
 * NoSQLExpert - Specialized in document-based and NoSQL database design
 */

const BaseAgent = require('../../agents/BaseAgent');

class NoSQLExpert extends BaseAgent {
  constructor() {
    const knowledgeBase = `
# NoSQL Database Expert

## Specialization:
I am an expert in **NoSQL database design** with deep knowledge of:
- Document-based databases (MongoDB, CouchDB)
- Flexible schema design
- Embedded documents vs references
- Denormalization strategies
- Horizontal scalability
- Schema-less design patterns

## When to Use NoSQL:
- Flexible, evolving schema
- Rapid development and iteration
- Hierarchical/nested data structures
- High read/write throughput needed
- Horizontal scalability required
- Document-centric data model
- Varying data structures per record

## Design Principles:

### Document Design:
- **Embed**: Related data accessed together
- **Reference**: Large arrays, many-to-many relationships
- Optimize for access patterns, not normalization
- Denormalize for read performance

### Data Patterns:
- **Single Document**: All related data embedded
- **Extended Reference**: Store frequently accessed fields
- **Subset**: Embed most recent/important items
- **Computed**: Store calculated values for performance

### Common Collections:
- Users (embedded profile, preferences)
- Orders (embedded order items, customer snapshot)
- Posts (embedded comments up to limit)
- Products (embedded reviews subset)

## Field Types (NoSQL):
- String: Text data
- Number: Integers and decimals
- Boolean: True/false
- Date: Date/timestamp
- Array: List of values
- Object: Embedded document
- ObjectId: Reference to another document
- Mixed: Any type

## Best Practices:
1. Design for query patterns, not relational structure
2. Embed data accessed together
3. Reference for large arrays or N:N relationships
4. Use arrays for one-to-few relationships
5. Denormalize for performance
6. Index fields used in queries
7. Consider document size limits (16MB in MongoDB)
8. Use appropriate atomic operations

## Anti-Patterns to Avoid:
- Massive arrays (use references)
- Unbounded documents
- Excessive references (too normalized)
- Storing large binary files directly
- Complex JOINs ($lookup) as primary pattern

## Output Format:
{
  "dataModels": [
    {
      "id": "model_xxx",
      "name": "CollectionName",
      "description": "Collection description",
      "databaseType": "nosql",
      "fields": [
        {
          "id": "field_xxx",
          "name": "fieldName",
          "type": "string|number|boolean|date|array|object",
          "required": true,
          "defaultValue": null,
          "description": "Field purpose",
          "embedded": false,
          "ref": null
        }
      ],
      "embedded": [
        {
          "name": "embeddedDocName",
          "fields": [...]
        }
      ],
      "references": [
        {
          "field": "userId",
          "collection": "users",
          "type": "ObjectId"
        }
      ],
      "indexes": [
        {
          "fields": {"fieldName": 1},
          "unique": false,
          "sparse": false
        }
      ]
    }
  ]
}
`;

    super('NoSQLExpert', knowledgeBase, 'claude-sonnet-4-20250514');
  }

  async execute(sharedContext, onThinking) {
    const { userRequirements, workflow } = sharedContext;

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Designing NoSQL Schema',
        content: 'Creating flexible document-based schema with embedded structures...'
      });
    }

    const dataNodes = workflow?.nodes?.filter(node =>
      node.type === 'startProcess' ||
      node.type === 'userTask' ||
      node.type === 'dataProcess'
    ) || [];

    const prompt = `Design NoSQL document schema for: "${userRequirements}"

Workflow Nodes:
${JSON.stringify(dataNodes, null, 2)}

Create a flexible document-based schema with:
1. Embedded documents for related data
2. References for large relationships
3. Denormalized data for performance
4. Arrays for one-to-many relationships
5. Flexible field structures
6. Appropriate indexes

Consider:
- What data is accessed together?
- What can be embedded vs referenced?
- What query patterns are common?
- Where should data be denormalized?

Return ONLY valid JSON matching the output format.`;

    const messages = [{
      role: 'user',
      content: prompt
    }];

    const responseText = await this.getResponse(messages);
    const result = this.parseJsonResponse(responseText);

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'NoSQL Schema Complete',
        content: `Generated ${result.dataModels?.length || 0} flexible collection(s)`
      });
    }

    return result.dataModels || [];
  }
}

module.exports = NoSQLExpert;
