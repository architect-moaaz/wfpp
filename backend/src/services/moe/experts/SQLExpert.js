/**
 * SQLExpert - Specialized in relational database design
 */

const BaseAgent = require('../../agents/BaseAgent');

class SQLExpert extends BaseAgent {
  constructor() {
    const knowledgeBase = `
# SQL Database Expert

## Specialization:
I am an expert in **relational database design** with deep knowledge of:
- Relational data modeling
- Normalization (1NF, 2NF, 3NF, BCNF)
- Primary and foreign keys
- Indexes and constraints
- Transactional integrity (ACID)
- SQL best practices
- Referential integrity

## When to Use SQL:
- Structured data with clear relationships
- ACID compliance required
- Complex queries with JOINs
- Transactional systems (banking, e-commerce)
- Data integrity is critical
- Referential integrity constraints needed

## Design Principles:

### Normalization:
- **1NF**: Atomic values, no repeating groups
- **2NF**: No partial dependencies
- **3NF**: No transitive dependencies
- Avoid data duplication

### Relationships:
- **One-to-One**: User → UserProfile
- **One-to-Many**: Customer → Orders
- **Many-to-Many**: Students ↔ Courses (via junction table)

### Constraints:
- PRIMARY KEY: Unique identifier
- FOREIGN KEY: References another table
- UNIQUE: Enforce uniqueness
- NOT NULL: Required fields
- CHECK: Value constraints
- DEFAULT: Default values

### Indexes:
- Primary key (automatic)
- Foreign keys (for JOINs)
- Frequently queried fields
- Composite indexes for multi-field queries

## Field Types (SQL):
- INT, BIGINT: Integer numbers
- DECIMAL(p,s): Precise decimal numbers
- VARCHAR(n): Variable-length strings
- TEXT: Long text
- BOOLEAN: True/false
- DATE: Date only
- DATETIME, TIMESTAMP: Date and time
- ENUM: Predefined values
- JSON: Structured data (MySQL/PostgreSQL)

## Best Practices:
1. Use singular names for tables (User, not Users)
2. Always include id, created_at, updated_at
3. Use snake_case for field names
4. Index foreign keys for performance
5. Set ON DELETE and ON UPDATE rules
6. Use appropriate data types (don't use VARCHAR for numbers)
7. Avoid storing computed values
8. Consider data size and growth

## Output Format:
{
  "dataModels": [
    {
      "id": "model_xxx",
      "name": "EntityName",
      "description": "Entity description",
      "databaseType": "sql",
      "fields": [
        {
          "id": "field_xxx",
          "name": "field_name",
          "type": "varchar",
          "sqlType": "VARCHAR(255)",
          "required": true,
          "primaryKey": false,
          "unique": false,
          "defaultValue": null,
          "validation": {...}
        }
      ],
      "relationships": [
        {
          "type": "belongsTo|hasMany|hasOne",
          "target": "TargetEntity",
          "foreignKey": "target_id",
          "onDelete": "CASCADE|SET NULL|RESTRICT",
          "onUpdate": "CASCADE"
        }
      ],
      "indexes": [
        {
          "name": "idx_field_name",
          "fields": ["field_name"],
          "unique": false
        }
      ],
      "constraints": [
        {
          "type": "check",
          "expression": "amount > 0"
        }
      ]
    }
  ]
}
`;

    super('SQLExpert', knowledgeBase, 'claude-sonnet-4-20250514');
  }

  async execute(sharedContext, onThinking) {
    const { userRequirements, workflow } = sharedContext;

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Designing SQL Schema',
        content: 'Creating normalized relational database schema...'
      });
    }

    const dataNodes = workflow?.nodes?.filter(node =>
      node.type === 'startProcess' ||
      node.type === 'userTask' ||
      node.type === 'dataProcess'
    ) || [];

    const prompt = `Design SQL database schema for: "${userRequirements}"

Workflow Nodes:
${JSON.stringify(dataNodes, null, 2)}

Create a normalized relational schema with:
1. Properly normalized tables (3NF)
2. Primary and foreign keys
3. Appropriate data types
4. Indexes for performance
5. Referential integrity constraints
6. Standard audit fields

Consider:
- What are the main entities?
- How do they relate?
- What fields need indexes?
- What constraints ensure data integrity?

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
        step: 'SQL Schema Complete',
        content: `Generated ${result.dataModels?.length || 0} normalized table(s)`
      });
    }

    return result.dataModels || [];
  }
}

module.exports = SQLExpert;
