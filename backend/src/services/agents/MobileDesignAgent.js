/**
 * MobileDesignAgent - Generates mobile UI screens and navigation
 */

const BaseAgent = require('./BaseAgent');

class MobileDesignAgent extends BaseAgent {
  constructor() {
    const knowledgeBase = `
# Mobile UI Design Knowledge Base

## Your Responsibilities:
1. Generate mobile screens for each workflow step
2. Design responsive layouts for iOS and Android
3. Create intuitive navigation flows
4. Apply mobile UI best practices
5. Ensure touch-friendly interactions

## Mobile Component Types:

### Layout Components:
- **Screen**: Top-level container for a view
- **ScrollView**: Scrollable content area
- **Stack**: Vertical stack layout
- **Row**: Horizontal row layout
- **Card**: Elevated container with shadow
- **Section**: Grouped content area
- **Divider**: Visual separator

### Navigation Components:
- **TabBar**: Bottom tab navigation
- **Drawer**: Side drawer menu
- **Stack Navigator**: Push/pop navigation
- **Header**: Top app bar with title and actions
- **BackButton**: Navigate to previous screen

### Input Components:
- **TextInput**: Single-line text field
- **TextArea**: Multi-line text input
- **Picker**: Dropdown selector
- **Switch**: Toggle on/off
- **Checkbox**: Multiple selection
- **Radio**: Single selection from group
- **DatePicker**: Date selection
- **Slider**: Range selection
- **SearchBar**: Search input

### Display Components:
- **Text**: Text display (various sizes)
- **Heading**: Section heading
- **Label**: Field label
- **Badge**: Status indicator
- **Avatar**: User profile image
- **Icon**: Icon display
- **Image**: Image display
- **List**: Scrollable list
- **ListItem**: Individual list entry

### Action Components:
- **Button**: Primary action button
- **IconButton**: Icon-only button
- **FAB**: Floating action button
- **ActionSheet**: Bottom action menu
- **Modal**: Overlay modal

### Feedback Components:
- **Alert**: Modal alert dialog
- **Toast**: Temporary message
- **LoadingSpinner**: Loading indicator
- **ProgressBar**: Progress indicator
- **EmptyState**: No content state

## Screen Types:

1. **List Screen**:
   - Display workflow instances
   - Search and filter
   - Pull-to-refresh
   - Infinite scroll

2. **Detail Screen**:
   - Show workflow details
   - Timeline view
   - Status indicators
   - Action buttons

3. **Form Screen**:
   - Input fields from form definition
   - Validation feedback
   - Submit/cancel actions
   - Progress indicator

4. **Dashboard Screen**:
   - Statistics cards
   - Recent activity
   - Quick actions
   - Charts/graphs

## Design Guidelines:

1. **Spacing**:
   - Minimum touch target: 44x44 points
   - Standard padding: 16px
   - Section spacing: 24px

2. **Typography**:
   - Heading 1: 24px, bold
   - Heading 2: 20px, semi-bold
   - Body: 16px, regular
   - Caption: 14px, regular

3. **Colors**:
   - Primary: App brand color
   - Secondary: Accent color
   - Success: Green (#10B981)
   - Warning: Orange (#F59E0B)
   - Error: Red (#EF4444)
   - Text: Dark gray (#111827)
   - Muted: Light gray (#6B7280)

4. **Navigation**:
   - Max 5 tabs in tab bar
   - Drawer for secondary items
   - Stack for hierarchical flows

## Output Format:
Return ONLY valid JSON:
{
  "screens": [
    {
      "id": "screen_<sequence>",
      "name": "Screen Name",
      "type": "list | detail | form | dashboard",
      "workflowNodeId": "node_id (if applicable)",
      "formId": "form_id (if form screen)",
      "components": [
        {
          "id": "comp_<sequence>",
          "type": "component_type",
          "props": {
            "title": "...",
            "placeholder": "...",
            // Component-specific props
          },
          "children": [
            // Nested components
          ],
          "layout": {
            "padding": 16,
            "margin": 8
          },
          "style": {
            "backgroundColor": "#FFFFFF"
          }
        }
      ],
      "navigation": {
        "showHeader": true,
        "headerTitle": "Screen Title",
        "showBackButton": true,
        "headerActions": [
          { "icon": "more", "action": "showMenu" }
        ]
      }
    }
  ],
  "navigation": {
    "type": "tab_bar | drawer | stack",
    "tabs": [
      {
        "id": "tab_<sequence>",
        "label": "Home",
        "icon": "home",
        "screen": "screen_id"
      }
    ],
    "initialScreen": "screen_id"
  }
}
`;

    super('MobileDesignAgent', knowledgeBase, 'claude-sonnet-4-20250514');
  }

  /**
   * Generate mobile UI screens
   */
  async execute(sharedContext, onThinking) {
    const { userRequirements, workflow, forms } = sharedContext;

    if (!workflow || !workflow.nodes) {
      throw new Error('MobileDesignAgent requires workflow structure');
    }

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Planning Mobile UI',
        content: 'Determining screen structure and navigation...'
      });
    }

    const prompt = `Design a mobile application UI for this workflow.

User Requirements: "${userRequirements}"

Workflow Name: ${workflow.name}
Workflow Description: ${workflow.description || 'N/A'}

Workflow Structure:
${JSON.stringify({ nodes: workflow.nodes, connections: workflow.connections }, null, 2)}

Forms:
${JSON.stringify(forms, null, 2)}

Design a complete mobile app including:
1. Main navigation structure (tabs or drawer)
2. List screen showing workflow instances
3. Form screens for each workflow step
4. Detail screens for viewing workflow status
5. Dashboard with key metrics

Consider:
- User roles (requestor, approver, admin)
- Workflow states (draft, pending, approved, rejected)
- Mobile-first design patterns
- Touch interactions
- Offline capabilities (optimistic UI)

Create an intuitive, user-friendly mobile experience.`;

    const messages = [{
      role: 'user',
      content: prompt
    }];

    try {
      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'Generating Mobile UI',
          content: 'Creating screens, components, and navigation...'
        });
      }

      const responseText = await this.getResponse(messages);

      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'Parsing Response',
          content: 'Validating mobile UI structure...'
        });
      }

      const result = this.parseJsonResponse(responseText);

      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'Mobile UI Generated',
          content: `Created ${result.screens?.length || 0} screen(s) with ${result.navigation?.type || 'stack'} navigation`
        });
      }

      return result;
    } catch (error) {
      console.error('MobileDesignAgent execution failed:', error);
      throw new Error(`MobileDesignAgent failed: ${error.message}`);
    }
  }
}

module.exports = MobileDesignAgent;
