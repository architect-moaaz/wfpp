/**
 * iOSExpert - Specialized in iOS-native mobile UI (SwiftUI/UIKit)
 */

const BaseAgent = require('../../agents/BaseAgent');

class iOSExpert extends BaseAgent {
  constructor() {
    const knowledgeBase = `
# iOS Mobile Expert

## Specialization:
I am an expert in **iOS-native mobile UI** with SwiftUI and UIKit, following Apple Human Interface Guidelines.

## iOS Design Principles (HIG):
1. **Clarity**: Text legible, icons precise, purposeful adornments
2. **Deference**: Content fills screen, understands gesture
3. **Depth**: Layers and motion convey hierarchy

## iOS-Specific Components:

### Navigation:
- **UINavigationController**: Hierarchical navigation with back button on left
- **UITabBarController**: Bottom tab bar (max 5 tabs)
- **UISplitViewController**: Master-detail for iPad
- **Modal**: Bottom-up modal presentation

### UI Components:
- **UITableView/List**: Grouped or plain lists
- **UICollectionView/Grid**: Grid layouts
- **UITextField**: Single-line input
- **UITextView**: Multi-line input
- **UISwitch**: Toggle (green when on)
- **UISlider**: Continuous value selector
- **UIPickerView**: Rotating picker
- **UIDatePicker**: Date/time picker wheels
- **UISegmentedControl**: Segmented buttons
- **UIButton**: System or custom buttons
- **UIActionSheet**: Bottom action sheet
- **UIAlert**: Center alert dialog

## iOS Visual Style:
- **SF Symbols**: System icons
- **San Francisco**: System font
- **Colors**: iOS blue (#007AFF), system colors
- **Corner Radius**: 10-12px for cards
- **Shadows**: Subtle, y-offset 2-4px
- **Blur**: Frosted glass effect
- **Spacing**: 8pt grid system

## iOS Navigation Patterns:
- Back button: Top-left with chevron <
- Tab bar: Bottom, 5 tabs max
- Navigation bar: Top with title
- Large titles: Collapsing headers
- Search: Pull down on list

## iOS Gestures:
- Swipe right: Back navigation
- Swipe left on list item: Delete/actions
- Pull down: Refresh
- Long press: Context menu

## Output Format:
{
  "screens": [
    {
      "id": "screen_xxx",
      "name": "ScreenName",
      "type": "list|detail|form",
      "platform": "ios",
      "components": [
        {
          "type": "NavigationView",
          "props": {"title": "Screen Title"},
          "children": [...]
        }
      ]
    }
  ],
  "navigation": {
    "type": "NavigationController",
    "tabBar": {...}
  }
}
`;

    super('iOSExpert', knowledgeBase, 'claude-sonnet-4-20250514');
  }

  async execute(sharedContext, onThinking) {
    const { userRequirements, workflow } = sharedContext;

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Generating iOS Native UI',
        content: 'Creating SwiftUI screens following iOS Human Interface Guidelines...'
      });
    }

    const prompt = `Generate iOS-native mobile UI for: "${userRequirements}"

Create iOS screens with:
1. iOS-native components (SwiftUI/UIKit)
2. Follow Apple HIG
3. iOS navigation patterns
4. SF Symbols for icons
5. iOS gestures and interactions

Return ONLY valid JSON.`;

    const messages = [{
      role: 'user',
      content: prompt
    }];

    const responseText = await this.getResponse(messages);
    const result = this.parseJsonResponse(responseText);

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'iOS UI Complete',
        content: `Generated ${result.screens?.length || 0} iOS-native screen(s)`
      });
    }

    return result;
  }
}

module.exports = iOSExpert;
