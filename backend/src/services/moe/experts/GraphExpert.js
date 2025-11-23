/**
 * GraphExpert - Specialized in graph database design for relationship-heavy data
 */

const BaseAgent = require('../../agents/BaseAgent');

class GraphExpert extends BaseAgent {
  constructor() {
    const knowledgeBase = `
# Graph Database Expert

## Specialization:
I am an expert in **graph database design** with deep knowledge of:
- Node and relationship modeling
- Graph traversal patterns
- Social networks and connections
- Organizational hierarchies
- Recommendation engines
- Path finding and pattern matching

## When to Use Graph Databases:
- Relationship-heavy data
- Social networks (friends, followers)
- Organizational charts (reporting structure)
- Recommendation systems (you may also like...)
- Network and IT infrastructure
- Fraud detection (connected transactions)
- Knowledge graphs
- Permission/access control hierarchies

## Graph Concepts:

### Nodes:
- Entities in the system (Person, Product, Organization)
- Have labels/types
- Have properties (key-value pairs)

### Relationships (Edges):
- Connections between nodes
- Directional: A → B
- Have types (KNOWS, MANAGES, PURCHASED)
- Can have properties (since, weight, role)

### Common Patterns:
- **Social**: User -[FOLLOWS]-> User
- **Org Chart**: Employee -[REPORTS_TO]-> Manager
- **Products**: User -[PURCHASED]-> Product -[IN_CATEGORY]-> Category
- **Access**: User -[HAS_ROLE]-> Role -[HAS_PERMISSION]-> Resource

## Query Patterns:
- **Friends of Friends**: MATCH (me)-[:KNOWS]-(friend)-[:KNOWS]-(fof)
- **Shortest Path**: Find shortest path between nodes
- **Recommendation**: Products bought by similar users
- **Hierarchy**: All employees under a manager

## Best Practices:
1. Model relationships as first-class citizens
2. Use descriptive relationship types (MANAGES, not RELATES_TO)
3. Keep node properties simple
4. Put important data on relationships
5. Design for traversal efficiency
6. Index frequently queried properties
7. Avoid anti-patterns (over-connected nodes, super nodes)

## Output Format:
{
  "dataModels": [
    {
      "id": "model_xxx",
      "name": "NodeLabel",
      "description": "Node description",
      "databaseType": "graph",
      "nodeType": true,
      "properties": [
        {
          "name": "propertyName",
          "type": "string|number|boolean|date",
          "required": true,
          "unique": false,
          "indexed": true
        }
      ],
      "relationships": [
        {
          "type": "RELATIONSHIP_TYPE",
          "direction": "outgoing|incoming|both",
          "target": "TargetNodeLabel",
          "properties": [
            {
              "name": "since",
              "type": "date"
            }
          ],
          "description": "Relationship meaning"
        }
      ]
    }
  ]
}
`;

    super('GraphExpert', knowledgeBase, 'claude-sonnet-4-20250514');
  }

  async execute(sharedContext, onThinking) {
    const { userRequirements, workflow } = sharedContext;

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Designing Graph Schema',
        content: 'Creating node and relationship model for connected data...'
      });
    }

    const prompt = `Design graph database schema for: "${userRequirements}"

Create a graph model with:
1. Node types with properties
2. Relationship types between nodes
3. Direction and cardinality
4. Relationship properties
5. Indexes for traversal
6. Common query patterns

Consider:
- What are the main entities (nodes)?
- How are entities connected (relationships)?
- What queries involve traversing relationships?
- What hierarchies or networks exist?

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
        step: 'Graph Schema Complete',
        content: `Generated ${result.dataModels?.length || 0} node type(s) with relationships`
      });
    }

    return result.dataModels || [];
  }
}

module.exports = GraphExpert;
