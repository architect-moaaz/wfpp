/**
 * PageExpert - Generic page/screen generation expert
 *
 * Generates pages (web/mobile screens) that contain forms, components, and data visualizations
 * Works for ANY domain - e-commerce, banking, healthcare, education, etc.
 */

const BaseAgent = require('../../agents/BaseAgent');

class PageExpert extends BaseAgent {
  constructor() {
    const knowledgeBase = `
# Generic Page Expert

## Specialization:
I design complete pages/screens for ANY type of application. Pages are containers that:
- Display information and data
- Contain forms for user input
- Provide navigation between screens
- Handle user interactions and workflows

## Universal Page Patterns I Understand:

### 1. **List/Index Pages**
Show collections of entities (users, products, orders, patients, students, etc.)
- Data table or card grid
- Search and filter controls
- Pagination
- Action buttons (view, edit, delete)
- "Create New" button

### 2. **Detail/View Pages**
Show single entity details
- Entity information display
- Related data sections
- Action buttons (edit, delete, share)
- Navigation back to list

### 3. **Create/Edit Form Pages**
Dedicated pages for data entry
- Form component (ref to existing form)
- Validation feedback
- Submit and cancel buttons
- Success/error messaging

### 4. **Dashboard Pages**
Overview/summary screens
- Key metrics cards
- Charts and graphs
- Recent activity lists
- Quick action buttons

### 5. **Settings/Configuration Pages**
User preferences and system settings
- Tabbed interface or sections
- Various form inputs
- Save/reset functionality

### 6. **Authentication Pages**
Login, register, forgot password
- Authentication forms
- Social login options
- Navigation links

### 7. **Confirmation/Result Pages**
Success, error, or status pages
- Message display
- Next action buttons
- Navigation options

## Page Generation Logic:

1. **Analyze Context**:
   - What data models exist? (User, Product, Order, etc.)
   - What forms are available?
   - What workflows need to be triggered?
   - What is the application domain?

2. **Identify Required Pages**:
   - CRUD operations → List + Detail + Create/Edit pages
   - Authentication needed → Login/Register pages
   - Data visualization → Dashboard pages
   - Multi-step processes → Wizard/Stepper pages

3. **Component Composition**:
   - Use available forms
   - Bind to data models
   - Link to workflows
   - Create logical navigation

## Output Format:

IMPORTANT: Return ONLY valid JSON array. No markdown, no explanations.

[
  {
    "id": "page_<type>_<entity>_<action>",
    "name": "Descriptive Name",
    "type": "list|detail|form|dashboard|auth|confirmation",
    "route": "/path",
    "platform": "web|mobile|both",

    "layout": {
      "type": "single|two-column|grid|dashboard",
      "responsive": true
    },

    "sections": [
      {
        "id": "section_id",
        "type": "header|main|footer|sidebar",
        "components": [
          {
            "type": "form|table|card|chart|text|button|input|list",
            "formRef": "form_id", // if type is form
            "dataBinding": "model.query", // data source
            "config": { /* component-specific config */ }
          }
        ]
      }
    ],

    "navigation": {
      "onLoad": { "workflow": "workflow_id" },
      "onAction": {
        "actionName": { "type": "navigate|workflow", "target": "..." }
      },
      "menu": [
        { "label": "Menu Item", "route": "/path", "icon": "icon-name" }
      ]
    },

    "dataBindings": {
      "bindingName": {
        "model": "ModelName",
        "query": "filter_or_method",
        "fields": ["field1", "field2"]
      }
    },

    "permissions": {
      "view": ["role1", "role2"],
      "edit": ["role1"]
    },

    "metadata": {
      "entity": "EntityName",
      "action": "list|view|create|edit|delete|dashboard",
      "tags": ["tag1", "tag2"]
    }
  }
]

## Design Principles:
- **Domain-agnostic**: Works for any industry or application type
- **Consistency**: Similar patterns for similar operations across domains
- **Accessibility**: Follow WCAG guidelines
- **Responsiveness**: Mobile-first design
- **Performance**: Lazy loading, pagination for large datasets
- **User-centric**: Clear labels, helpful error messages, logical flow

## Examples of Generic Page Generation:

**E-commerce App**:
- Product List Page → shows products, filters, search
- Product Detail Page → shows single product, add to cart form
- Checkout Page → contains checkout form, payment integration

**Healthcare App**:
- Patient List Page → shows patients, filters, search
- Patient Detail Page → shows single patient, medical history
- Appointment Form Page → contains appointment booking form

**Education App**:
- Course List Page → shows courses, filters, search
- Course Detail Page → shows single course, enrollment form
- Student Dashboard → shows enrolled courses, progress, assignments

The PATTERN is the same, only the ENTITIES and FIELDS differ!
`;

    super('PageExpert', knowledgeBase, 'claude-sonnet-4-20250514');
  }

  async execute(sharedContext, onThinking) {
    const { userRequirements, workflow, forms, dataModels } = sharedContext;

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Analyzing Page Requirements',
        content: 'Determining what pages are needed based on workflows, forms, and data models...'
      });
    }

    // Build context for the AI
    const context = {
      userRequirements,
      workflow: workflow ? {
        name: workflow.name,
        nodes: workflow.nodes?.length || 0,
        domain: workflow.domain,
        complexity: workflow.complexity
      } : null,
      forms: forms?.map(f => ({
        id: f.id,
        name: f.name,
        fields: f.fields?.map(field => field.name)
      })) || [],
      dataModels: dataModels?.map(dm => ({
        name: dm.name,
        fields: dm.fields?.map(f => f.name)
      })) || []
    };

    const prompt = `Analyze this application and generate ALL necessary pages:

**User Requirements**: "${userRequirements}"

**Available Context**:
${JSON.stringify(context, null, 2)}

**Your Task**:
1. Identify what pages are needed for this application
2. For each data model, consider if CRUD pages are needed
3. Create pages that use the available forms
4. Add dashboard/overview pages if appropriate
5. Include authentication pages if workflows require it
6. Design logical navigation between pages

**Page Types to Consider**:
- List pages (show all entities)
- Detail pages (show single entity)
- Create/Edit pages (data entry using forms)
- Dashboard pages (overview/summary)
- Authentication pages (login, register)
- Confirmation pages (success, error states)

**Guidelines**:
- Match page purpose to application domain
- Use available forms where appropriate
- Bind to available data models
- Create RESTful route patterns
- Include proper navigation flow
- Consider user roles and permissions

**CRITICAL REQUIREMENTS**:
1. Every page MUST have a "sections" array with at least one section
2. Every section MUST have a "components" array with actual components
3. Components must have proper "type" and "config" properties
4. Use component types: text, button, card, table, list, input, form
5. Include detailed configs for each component

IMPORTANT: Return ONLY a valid JSON array of pages. No markdown, no explanations, just the JSON array.

Example structures (adapt to the actual requirements):

LIST PAGE:
{
  "id": "page_list_<entity>",
  "name": "<Entity> List",
  "type": "list",
  "route": "/<entities>",
  "platform": "both",
  "sections": [
    {
      "id": "header",
      "type": "header",
      "components": [
        {
          "type": "text",
          "config": { "text": "All <Entities>", "variant": "h1" }
        },
        {
          "type": "button",
          "config": { "label": "Create New", "variant": "primary" },
          "action": { "type": "navigate", "target": "/<entity>/new" }
        }
      ]
    },
    {
      "id": "main",
      "type": "main",
      "components": [
        {
          "type": "table",
          "dataBinding": "<entity>.all",
          "config": {
            "columns": [
              { "key": "field1", "label": "Field 1" },
              { "key": "field2", "label": "Field 2" },
              { "key": "actions", "label": "Actions" }
            ],
            "actions": [
              { "label": "View", "route": "/<entity>/:id" },
              { "label": "Edit", "route": "/<entity>/:id/edit" }
            ],
            "pagination": true
          }
        }
      ]
    }
  ],
  "dataBindings": {
    "<entity>": { "model": "<Entity>", "query": "all", "fields": ["field1", "field2", "id"] }
  }
}

DASHBOARD PAGE:
{
  "id": "page_dashboard",
  "name": "Dashboard",
  "type": "dashboard",
  "route": "/dashboard",
  "sections": [
    {
      "id": "header",
      "type": "header",
      "components": [
        { "type": "text", "config": { "text": "Dashboard Overview", "variant": "h1" } }
      ]
    },
    {
      "id": "metrics",
      "type": "main",
      "components": [
        { "type": "card", "config": { "title": "Total Items", "metric": "count", "color": "blue" }, "dataBinding": "items.total" },
        { "type": "card", "config": { "title": "Active", "metric": "count", "color": "green" }, "dataBinding": "items.active" },
        { "type": "card", "config": { "title": "Pending", "metric": "count", "color": "yellow" }, "dataBinding": "items.pending" }
      ]
    }
  ]
}

FORM PAGE:
{
  "id": "page_form_create",
  "name": "Create <Entity>",
  "type": "form",
  "route": "/<entity>/new",
  "sections": [
    {
      "id": "header",
      "type": "header",
      "components": [
        { "type": "text", "config": { "text": "Create New <Entity>", "variant": "h1" } }
      ]
    },
    {
      "id": "main",
      "type": "main",
      "components": [
        {
          "type": "form",
          "formRef": "form_create_<entity>",
          "config": {
            "submitLabel": "Create",
            "cancelLabel": "Cancel",
            "cancelAction": { "type": "navigate", "target": "/<entities>" }
          }
        }
      ]
    }
  ]
}`;

    const messages = [{
      role: 'user',
      content: prompt
    }];

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Generating Pages',
        content: 'Creating page layouts and component compositions...'
      });
    }

    const responseText = await this.getResponse(messages);
    const pages = this.parseJsonResponse(responseText);

    // Validate and enhance pages
    const enhancedPages = this.enhancePages(pages, context);

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Pages Generated',
        content: `Created ${enhancedPages.length} pages with navigation and data bindings`
      });
    }

    return {
      pages: enhancedPages,
      expertType: 'PageExpert'
    };
  }

  enhancePages(pages, context) {
    return pages.map((page, index) => {
      // Ensure sections exist and have components
      const sections = (page.sections || []).map(section => {
        const components = section.components || [];

        // If section has no components, add a default one based on section type
        if (components.length === 0) {
          const defaultComponent = this.getDefaultComponent(section.type, page.type);
          if (defaultComponent) {
            components.push(defaultComponent);
          }
        }

        return {
          ...section,
          components
        };
      });

      // If no sections exist, create default sections based on page type
      if (sections.length === 0) {
        sections.push(...this.getDefaultSections(page.type, page.name));
      }

      return {
        ...page,
        id: page.id || `page_${Date.now()}_${index}`,
        platform: page.platform || 'both',
        layout: page.layout || { type: 'single', responsive: true },
        sections,
        permissions: page.permissions || { view: ['authenticated'] },
        metadata: {
          ...page.metadata,
          createdBy: 'PageExpert',
          createdAt: new Date().toISOString(),
          workflowId: context.workflow?.name
        }
      };
    });
  }

  getDefaultComponent(sectionType, pageType) {
    if (sectionType === 'header') {
      return {
        type: 'text',
        config: { text: 'Page Header', variant: 'h1' }
      };
    }
    if (sectionType === 'main') {
      if (pageType === 'list') {
        return {
          type: 'text',
          config: { text: 'List view - configure table or list components', variant: 'p' }
        };
      }
      if (pageType === 'dashboard') {
        return {
          type: 'card',
          config: { title: 'Dashboard Card', content: 'Add metrics and charts here' }
        };
      }
      if (pageType === 'form') {
        return {
          type: 'text',
          config: { text: 'Form view - configure form components', variant: 'p' }
        };
      }
      return {
        type: 'text',
        config: { text: 'Main content area', variant: 'p' }
      };
    }
    return null;
  }

  getDefaultSections(pageType, pageName) {
    const sections = [
      {
        id: 'header',
        type: 'header',
        components: [
          {
            type: 'text',
            config: { text: pageName || 'Page', variant: 'h1' }
          }
        ]
      },
      {
        id: 'main',
        type: 'main',
        components: [
          {
            type: 'text',
            config: { text: 'This page was auto-generated. Use the Page Designer to customize it.', variant: 'p' }
          }
        ]
      }
    ];

    return sections;
  }
}

module.exports = PageExpert;
