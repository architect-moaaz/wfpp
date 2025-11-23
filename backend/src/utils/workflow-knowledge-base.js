/**
 * Workflow Component Knowledge Base for RAG
 * Contains information about available workflow components and their use cases
 */

const workflowKnowledgeBase = {
  components: [
    {
      type: "startProcess",
      name: "Start Event",
      category: "Events",
      description: "Initiates a workflow process. Every workflow must start with a Start Event.",
      useCases: [
        "Beginning of any workflow",
        "User-initiated processes",
        "Scheduled process triggers",
        "API-triggered workflows"
      ],
      properties: {
        label: "String - Display name",
        trigger: "String - What triggers this start event",
        description: "String - Purpose of this workflow"
      },
      examples: [
        "User registration workflow",
        "Order processing workflow",
        "Approval request workflow",
        "Data import workflow"
      ]
    },
    {
      type: "endEvent",
      name: "End Event",
      category: "Events",
      description: "Marks the completion of a workflow. Every workflow should end with an End Event.",
      useCases: [
        "Successful completion of workflow",
        "Workflow termination",
        "Final state of process"
      ],
      properties: {
        label: "String - Display name",
        result: "String - Final outcome or result",
        description: "String - What happens when workflow ends"
      },
      examples: [
        "User successfully registered",
        "Order completed",
        "Request approved/rejected"
      ]
    },
    {
      type: "userTask",
      name: "Human Task",
      category: "Tasks",
      description: "Represents a task that requires human interaction or approval.",
      useCases: [
        "Manual approval required",
        "Human review needed",
        "Data entry by user",
        "Document review",
        "Quality check"
      ],
      properties: {
        label: "String - Task name",
        taskName: "String - Specific task identifier",
        assignedTo: "String - User/role assigned",
        priority: "String - Task priority (Low/Medium/High)",
        dueDate: "String - When task is due",
        instructions: "String - Instructions for the user"
      },
      examples: [
        "Approve expense report",
        "Review contract",
        "Verify customer information",
        "Complete survey"
      ]
    },
    {
      type: "scriptTask",
      name: "Script Task",
      category: "Tasks",
      description: "Executes automated code or scripts without human intervention.",
      useCases: [
        "Data transformation",
        "API calls",
        "Calculations",
        "File processing",
        "Integration with external systems"
      ],
      properties: {
        label: "String - Script name",
        scriptType: "String - Type of script (JavaScript/Python/etc)",
        script: "String - The actual script code",
        description: "String - What the script does"
      },
      examples: [
        "Calculate total price",
        "Call payment API",
        "Generate report",
        "Update database"
      ]
    },
    {
      type: "decision",
      name: "Decision Gateway",
      category: "Gateways",
      description: "Routes the workflow based on conditions. Supports Exclusive (XOR) for single path and Parallel (AND) for multiple paths.",
      useCases: [
        "Conditional routing",
        "If-then-else logic",
        "Multiple outcome scenarios",
        "Parallel processing",
        "Branching workflows"
      ],
      properties: {
        label: "String - Decision name",
        gatewayType: "String - exclusive or parallel",
        condition: "String - Condition to evaluate (for exclusive)",
        branches: "String - Description of branches (for parallel)",
        description: "String - What is being decided"
      },
      examples: [
        "If amount > $1000, require approval",
        "Route based on priority",
        "Check if user is verified",
        "Parallel approval by multiple managers"
      ]
    },
    {
      type: "validation",
      name: "Validation",
      category: "Other",
      description: "Validates data against rules or constraints before proceeding.",
      useCases: [
        "Input validation",
        "Data quality checks",
        "Business rule validation",
        "Compliance checks",
        "Format verification"
      ],
      properties: {
        label: "String - Validation name",
        ruleType: "String - Type of validation",
        rules: "Array - List of validation rules",
        description: "String - What is being validated"
      },
      examples: [
        "Validate email format",
        "Check required fields",
        "Verify age > 18",
        "Validate credit card number"
      ]
    },
    {
      type: "notification",
      name: "Notification",
      category: "Other",
      description: "Sends notifications via email, SMS, or other channels.",
      useCases: [
        "Email notifications",
        "SMS alerts",
        "In-app notifications",
        "Status updates",
        "Reminders"
      ],
      properties: {
        label: "String - Notification name",
        channel: "String - Email/SMS/Push/etc",
        recipient: "String - Who receives the notification",
        template: "String - Message template",
        description: "String - Purpose of notification"
      },
      examples: [
        "Send confirmation email",
        "Alert admin of error",
        "Notify user of approval",
        "Send reminder SMS"
      ]
    },
    {
      type: "dataProcess",
      name: "Data Process",
      category: "Other",
      description: "Processes, transforms, or manipulates data.",
      useCases: [
        "Data transformation",
        "Data aggregation",
        "Data enrichment",
        "Format conversion",
        "Data cleansing"
      ],
      properties: {
        label: "String - Process name",
        operation: "String - Type of data operation",
        input: "String - Input data source",
        output: "String - Output destination",
        description: "String - What processing is done"
      },
      examples: [
        "Convert CSV to JSON",
        "Aggregate sales data",
        "Enrich customer profile",
        "Clean duplicate records"
      ]
    },
    {
      type: "timerEvent",
      name: "Timer Event",
      category: "Events",
      description: "Delays workflow execution for a specified time or until a specific date.",
      useCases: [
        "Waiting periods",
        "Scheduled execution",
        "Delayed actions",
        "Timeout handling",
        "Reminder scheduling"
      ],
      properties: {
        label: "String - Timer name",
        timerType: "String - duration or date",
        duration: "String - Time to wait (e.g., PT1H)",
        date: "String - Specific date/time",
        description: "String - Why the delay"
      },
      examples: [
        "Wait 24 hours before reminder",
        "Schedule for specific date",
        "Timeout after 1 hour",
        "Delay until business day"
      ]
    },
    {
      type: "llmTask",
      name: "LLM Task",
      category: "Tasks",
      description: "Uses Large Language Models (AI) to perform intelligent tasks like text generation, analysis, classification, extraction, and decision making.",
      useCases: [
        "Text generation and summarization",
        "Data extraction from unstructured text",
        "Content classification and categorization",
        "Sentiment analysis",
        "Smart decision making based on context",
        "Document analysis and understanding",
        "Translation and transformation",
        "Question answering"
      ],
      properties: {
        label: "String - LLM task name",
        model: "String - EXACT model ID (MUST be one of: 'claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001', or 'claude-opus-4-5-20250514'). Default: claude-sonnet-4-5-20250929",
        prompt: "String - The prompt template with variable placeholders like ${variableName}",
        outputVariable: "String - Variable name to store LLM response in processData (e.g. 'sentiment', 'extractedData', 'llmResult')",
        temperature: "Number - Response randomness 0-1 (default: 0.7)",
        maxTokens: "Number - Maximum response length (default: 1000)",
        description: "String - What the LLM will do"
      },
      examples: [
        "Analyze customer feedback and extract sentiment",
        "Generate personalized email response",
        "Classify support ticket by category and urgency",
        "Extract key information from invoice",
        "Make approval decision based on criteria",
        "Summarize long document",
        "Translate content to another language"
      ],
      exampleNode: {
        id: "node_sentiment",
        type: "llmTask",
        data: {
          label: "AI Sentiment Analysis",
          model: "claude-sonnet-4-5-20250929",
          prompt: "Analyze the sentiment of this customer feedback and extract key issues: ${processData.feedback_text}",
          outputVariable: "sentiment",
          temperature: 0.7,
          maxTokens: 1000,
          description: "Analyzes customer feedback to determine sentiment (positive/negative/neutral) and extract key points"
        }
      }
    }
  ],

  workflowPatterns: [
    {
      name: "Simple Sequential Process",
      description: "Linear workflow with steps executed one after another",
      structure: ["startProcess", "task", "task", "endEvent"],
      useCases: ["Simple approval", "Basic data processing", "Linear operations"]
    },
    {
      name: "Approval Workflow",
      description: "Workflow requiring human approval",
      structure: ["startProcess", "validation", "userTask", "decision", "endEvent"],
      useCases: ["Expense approval", "Document review", "Access requests"]
    },
    {
      name: "Conditional Routing",
      description: "Routes based on conditions",
      structure: ["startProcess", "validation", "decision", "multiple_paths", "endEvent"],
      useCases: ["Tiered approvals", "Priority-based routing", "Category-based processing"]
    },
    {
      name: "Automated Process",
      description: "Fully automated without human intervention",
      structure: ["startProcess", "scriptTask", "dataProcess", "notification", "endEvent"],
      useCases: ["Data imports", "Scheduled reports", "Automated backups"]
    },
    {
      name: "Parallel Processing",
      description: "Multiple tasks executed in parallel",
      structure: ["startProcess", "decision(parallel)", "multiple_userTasks", "endEvent"],
      useCases: ["Multi-approver workflows", "Parallel data processing", "Concurrent reviews"]
    }
  ]
};

// Helper function to search components by use case or keyword
const searchComponents = (query) => {
  const lowerQuery = query.toLowerCase();
  return workflowKnowledgeBase.components.filter(component => {
    return (
      component.name.toLowerCase().includes(lowerQuery) ||
      component.description.toLowerCase().includes(lowerQuery) ||
      component.useCases.some(uc => uc.toLowerCase().includes(lowerQuery)) ||
      component.examples.some(ex => ex.toLowerCase().includes(lowerQuery))
    );
  });
};

// Helper function to get recommended workflow pattern
const getRecommendedPattern = (requirements) => {
  const lowerReq = requirements.toLowerCase();

  if (lowerReq.includes('approval') || lowerReq.includes('review')) {
    return workflowKnowledgeBase.workflowPatterns.find(p => p.name === "Approval Workflow");
  }
  if (lowerReq.includes('automated') || lowerReq.includes('automatic')) {
    return workflowKnowledgeBase.workflowPatterns.find(p => p.name === "Automated Process");
  }
  if (lowerReq.includes('parallel') || lowerReq.includes('multiple')) {
    return workflowKnowledgeBase.workflowPatterns.find(p => p.name === "Parallel Processing");
  }
  if (lowerReq.includes('condition') || lowerReq.includes('if')) {
    return workflowKnowledgeBase.workflowPatterns.find(p => p.name === "Conditional Routing");
  }

  return workflowKnowledgeBase.workflowPatterns.find(p => p.name === "Simple Sequential Process");
};

module.exports = {
  workflowKnowledgeBase,
  searchComponents,
  getRecommendedPattern
};
