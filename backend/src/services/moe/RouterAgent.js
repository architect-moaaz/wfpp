/**
 * RouterAgent - Mixture of Experts Gating Network
 * Analyzes requests and routes to appropriate expert agents
 */

const BaseAgent = require('../agents/BaseAgent');

class RouterAgent extends BaseAgent {
  constructor() {
    const knowledgeBase = `
# Router Agent - Mixture of Experts Gating Network

## Your Responsibilities:
1. Analyze user requirements
2. Determine workflow complexity and domain
3. Select appropriate expert agents
4. Route requests to best-fit experts
5. Determine if multiple experts should be combined

## Workflow Complexity Levels:
- **Simple**: Linear, 2-5 nodes, single path
- **Medium**: Some branching, 5-10 nodes, basic decisions
- **Complex**: Multiple branches, 10+ nodes, parallel paths, sub-workflows

## Workflow Domains:
- **Approval**: Expense, leave, purchase orders
- **Data Processing**: ETL, transformations, calculations
- **Onboarding**: Customer, employee, vendor
- **Notification**: Alerts, emails, SMS workflows
- **Sequential**: Step-by-step processes
- **Parallel**: Concurrent task execution

## Form Complexity:
- **Simple**: 3-7 fields, basic inputs
- **Advanced**: 8-15 fields, complex validation, conditional logic
- **Mobile-First**: Optimized for mobile, touch-friendly
- **Wizard**: Multi-step forms with progress tracking

## Data Model Types:
- **SQL**: Relational data, normalized schemas
- **NoSQL**: Document-based, flexible schemas
- **Graph**: Relationship-heavy data
- **Time-Series**: Time-stamped data, analytics

## Expert Selection Rules:

### Workflow Experts:
- Simple workflows → SimpleWorkflowExpert
- Complex workflows → ComplexWorkflowExpert
- Approval workflows → ApprovalWorkflowExpert
- Data processing → DataProcessingExpert

### Data Model Experts:
- Relational data → SQLExpert
- Flexible schemas → NoSQLExpert
- Relationship-heavy → GraphExpert
- Analytics/metrics → TimeSeriesExpert

### Form Experts:
- Basic forms → SimpleFormExpert
- Complex validation → AdvancedFormExpert
- Mobile apps → MobileFormExpert
- Multi-step → WizardFormExpert

### Mobile Experts:
- iOS specific → iOSExpert
- Android specific → AndroidExpert
- Cross-platform → CrossPlatformExpert

### Design Experts:
- Use when: Figma URL provided, PDF design provided, or need optimal UI/UX design
- Figma designs → DesignExpert (analyzes Figma structure)
- PDF designs → DesignExpert (extracts UI from wireframes/mockups)
- Auto-design → DesignExpert (generates optimal UI based on best practices)
- Design expert can REPLACE form and page experts when design is provided
- If DesignExpert is used, forms and pages will come from design analysis

## Output Format:
Return ONLY valid JSON:
{
  "routing": {
    "workflowExperts": ["SimpleWorkflowExpert" | "ComplexWorkflowExpert" | "ApprovalWorkflowExpert" | "DataProcessingExpert"],
    "dataModelExperts": ["SQLExpert" | "NoSQLExpert" | "GraphExpert" | "TimeSeriesExpert"],
    "formExperts": ["SimpleFormExpert" | "AdvancedFormExpert" | "MobileFormExpert" | "WizardFormExpert"],
    "mobileExperts": ["iOSExpert" | "AndroidExpert" | "CrossPlatformExpert"],
    "designExperts": ["DesignExpert"],
    "pageExperts": ["PageExpert"]
  },
  "complexity": {
    "workflow": "simple" | "medium" | "complex",
    "forms": "simple" | "advanced" | "mobile-first" | "wizard",
    "dataModel": "sql" | "nosql" | "graph" | "timeseries"
  },
  "domain": "approval" | "data-processing" | "onboarding" | "notification" | "sequential" | "parallel",
  "useDesignExpert": true | false,
  "designSource": "figma" | "pdf" | "auto" | null,
  "combineStrategy": "ensemble" | "best-only" | "weighted",
  "confidence": 0.0 to 1.0,
  "reasoning": "Brief explanation of routing decisions"
}
`;

    super('RouterAgent', knowledgeBase, 'claude-sonnet-4-20250514');
  }

  /**
   * Analyze request and route to appropriate experts
   */
  async execute(userRequirements, conversationHistory = [], onThinking) {
    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Analyzing Request',
        content: `Determining optimal expert routing for: "${userRequirements}"`
      });
    }

    const prompt = `Analyze this workflow request and determine the best expert routing.

User Requirements: "${userRequirements}"

Conversation History:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Based on the request:
1. Determine workflow complexity (simple, medium, complex)
2. Identify domain (approval, data-processing, onboarding, etc.)
3. Select appropriate workflow experts
4. Select appropriate form experts
5. Select appropriate data model experts
6. Select appropriate mobile experts
7. Decide if multiple experts should be combined (ensemble)

Consider:
- Workflow size and branching
- Number of decision points
- Data complexity
- Form requirements
- Mobile platform needs
- Domain-specific patterns`;

    const messages = [{
      role: 'user',
      content: prompt
    }];

    try {
      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'Routing Analysis',
          content: 'Evaluating expert capabilities and matching to requirements...'
        });
      }

      const responseText = await this.getResponse(messages);
      const routing = this.parseJsonResponse(responseText);

      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'Routing Complete',
          content: `Routed to:\n- Workflow: ${routing.routing.workflowExperts.join(', ')}\n- Forms: ${routing.routing.formExperts.join(', ')}\n- Data: ${routing.routing.dataModelExperts.join(', ')}\n- Mobile: ${routing.routing.mobileExperts.join(', ')}\nStrategy: ${routing.combineStrategy}\nConfidence: ${(routing.confidence * 100).toFixed(0)}%`
        });
      }

      return routing;
    } catch (error) {
      console.error('RouterAgent execution failed:', error);

      // Fallback to default routing
      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'Fallback Routing',
          content: 'Using default expert selection'
        });
      }

      return {
        routing: {
          workflowExperts: ['SimpleWorkflowExpert'],
          dataModelExperts: ['SQLExpert'],
          formExperts: ['SimpleFormExpert'],
          mobileExperts: ['CrossPlatformExpert']
        },
        complexity: {
          workflow: 'medium',
          forms: 'simple',
          dataModel: 'sql'
        },
        domain: 'sequential',
        combineStrategy: 'best-only',
        confidence: 0.5,
        reasoning: 'Fallback to default routing due to analysis failure'
      };
    }
  }
}

module.exports = RouterAgent;
