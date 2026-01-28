/**
 * CrossPlatformExpert - Specialized in cross-platform mobile UI (React Native, Flutter)
 */

const BaseAgent = require('../../agents/BaseAgent');

class CrossPlatformExpert extends BaseAgent {
  constructor() {
    const knowledgeBase = `
# Cross-Platform Mobile Expert

## Specialization:
I am an expert in **cross-platform mobile UI** for React Native and Flutter with:
- Platform-agnostic component design
- Shared codebase principles
- Cross-platform navigation
- Adaptive layouts (iOS & Android)
- Performance optimization

## Cross-Platform Principles:
1. **Write Once, Run Everywhere**: Single codebase for both platforms
2. **Platform Adaptations**: Respect platform conventions
3. **Performance**: Optimize for both platforms
4. **Native Feel**: Use platform-appropriate patterns
5. **Shared Business Logic**: Platform-specific UI only when needed

## Component Strategy:

### Universal Components (Use these):
- **View**: Basic container (works everywhere)
- **Text**: Text display
- **ScrollView**: Scrollable content
- **FlatList**: Performant lists
- **TextInput**: Text input
- **TouchableOpacity**: Touchable buttons
- **Image**: Image display
- **SafeAreaView**: Respect device notches

### Platform-Aware Components:
- **StatusBar**: Platform-specific styling
- **Platform.select()**: Conditional platform code
- **Platform.OS**: Check iOS vs Android

## Navigation Patterns:

### React Native Navigation:
- **Stack**: Push/pop screens
- **Tab**: Bottom tabs (iOS style) or Material (Android)
- **Drawer**: Side menu

### Best Practices:
- Tab bar on bottom (iOS) or top (Android optional)
- Back button on left (iOS) or hardware button (Android)
- Header styling per platform

## Layout Principles:
1. **Flexbox**: Works on both platforms
2. **Absolute positions**: Use sparingly
3. **Percentage widths**: Better than fixed
4. **Platform dimensions**: Use Dimensions API
5. **SafeArea**: Respect notches and status bars

## Screen Types for Workflows:

### List Screen:
- Header with title and search
- FlatList for performance
- Pull-to-refresh
- Empty state component
- Filter buttons

### Detail Screen:
- Header with back button
- ScrollView for content
- Status badges
- Timeline view
- Action buttons (approve/reject)

### Form Screen:
- Keyboard-aware ScrollView
- Grouped form fields
- Validation feedback
- Submit button
- Platform-appropriate inputs

### Dashboard Screen:
- Grid of statistic cards
- Recent activity list
- Quick action buttons
- Charts (via react-native-chart-kit)

## Mobile UI Components:

### Layout:
- View, ScrollView, SafeAreaView
- Stack (vertical), Row (horizontal)
- Card, Section

### Input:
- TextInput, Picker, Switch
- DatePicker (platform modal)
- Slider

### Display:
- Text, Heading, Badge
- Image, Avatar, Icon
- FlatList, SectionList

### Actions:
- TouchableOpacity (Button)
- FAB (Floating Action Button)
- ActionSheet

### Feedback:
- Alert (platform-native)
- Toast/Snackbar
- ActivityIndicator (Spinner)
- ProgressBar

## Output Format:
{
  "screens": [
    {
      "id": "screen_xxx",
      "name": "ScreenName",
      "type": "list|detail|form|dashboard",
      "platform": "cross-platform",
      "framework": "react-native",
      "workflowNodeId": "node_id",
      "components": [
        {
          "type": "SafeAreaView",
          "children": [
            {
              "type": "ScrollView",
              "props": {
                "contentContainerStyle": {
                  "padding": 16
                }
              },
              "children": [...]
            }
          ]
        }
      ]
    }
  ],
  "navigation": {
    "type": "stack",
    "screens": ["ListScreen", "DetailScreen", "FormScreen"]
  }
}
`;

    super('CrossPlatformExpert', knowledgeBase, 'claude-sonnet-4-20250514');
  }

  async execute(sharedContext, onThinking) {
    const { userRequirements, workflow } = sharedContext;

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Generating Cross-Platform Mobile UI',
        content: 'Creating React Native screens with platform-adaptive components...'
      });
    }

    // Limit workflow nodes to prevent overly large output
    const workflowNodes = workflow?.nodes?.slice(0, 10) || [];
    const workflowSummary = workflowNodes.map(n => ({
      id: n.id,
      type: n.type,
      label: n.data?.label || n.data?.name
    }));

    const prompt = `Generate mobile UI screens for: "${userRequirements}"

Workflow steps (summarized):
${JSON.stringify(workflowSummary, null, 2)}

Create a CONCISE mobile UI with:
1. One screen per main workflow step (max 5 screens)
2. Simple component hierarchy (avoid deep nesting)
3. Essential components only

CRITICAL: Keep the response SHORT. Use minimal props. Return ONLY this JSON structure:
{
  "screens": [
    {
      "id": "screen_1",
      "name": "ScreenName",
      "type": "list|detail|form",
      "components": [
        { "type": "header", "props": { "text": "Title" } },
        { "type": "textinput", "props": { "label": "Field", "name": "field1" } },
        { "type": "button", "props": { "title": "Submit" } }
      ]
    }
  ],
  "navigation": { "type": "stack", "screens": ["Screen1", "Screen2"] }
}`;

    const messages = [{
      role: 'user',
      content: prompt
    }];

    try {
      // Use self-healing execution with AI correction for JSON errors
      const result = await this.executeWithSelfHealing(messages, onThinking);

      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'Mobile UI Complete',
          content: `Generated ${result.screens?.length || 0} cross-platform screen(s)`
        });
      }

      return result;
    } catch (error) {
      console.error(`[${this.name}] Failed to generate mobile UI, returning fallback:`, error.message);

      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'Using Fallback UI',
          content: 'JSON parsing failed, generating basic mobile UI from workflow'
        });
      }

      // Return a fallback mobile UI based on workflow
      return this.generateFallbackUI(workflow, userRequirements);
    }
  }

  /**
   * Generate fallback mobile UI when AI response parsing fails
   */
  generateFallbackUI(workflow, userRequirements) {
    const screens = [];
    const nodes = workflow?.nodes || [];

    // Create a screen for each workflow node (up to 5)
    for (let i = 0; i < Math.min(nodes.length, 5); i++) {
      const node = nodes[i];
      const screenName = node.data?.label || node.data?.name || `Screen${i + 1}`;

      screens.push({
        id: `screen_${node.id || i}`,
        name: screenName.replace(/\s+/g, ''),
        type: node.type === 'formTask' ? 'form' : 'detail',
        components: [
          {
            type: 'header',
            props: { text: screenName }
          },
          {
            type: 'text',
            props: { text: `${screenName} content` }
          },
          {
            type: 'button',
            props: { title: 'Continue', primary: true }
          }
        ]
      });
    }

    // If no workflow nodes, create a default screen
    if (screens.length === 0) {
      screens.push({
        id: 'screen_main',
        name: 'Main',
        type: 'detail',
        components: [
          {
            type: 'header',
            props: { text: userRequirements?.substring(0, 50) || 'Application' }
          },
          {
            type: 'text',
            props: { text: 'Welcome to your application' }
          }
        ]
      });
    }

    return {
      screens,
      navigation: {
        type: screens.length > 3 ? 'tab' : 'stack',
        screens: screens.map(s => s.name)
      }
    };
  }
}

module.exports = CrossPlatformExpert;
