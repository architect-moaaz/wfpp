/**
 * AndroidExpert - Specialized in Android-native mobile UI (Jetpack Compose/Material Design)
 */

const BaseAgent = require('../../agents/BaseAgent');

class AndroidExpert extends BaseAgent {
  constructor() {
    const knowledgeBase = `
# Android Mobile Expert

## Specialization:
I am an expert in **Android-native mobile UI** with Jetpack Compose and Material Design 3, following Android design principles.

## Material Design 3 Principles:
1. **Material**: Inspired by paper and ink
2. **Bold**: Typography, grids, color guide design
3. **Motion**: Responsive and natural
4. **Adaptive**: Works across devices

## Android-Specific Components:

### Navigation:
- **NavHost**: Navigation graph
- **BottomNavigationBar**: Bottom nav (3-5 items)
- **NavigationDrawer**: Side drawer menu
- **TopAppBar**: Top action bar
- **FloatingActionButton (FAB)**: Primary action

### UI Components:
- **LazyColumn**: Scrollable list
- **LazyGrid**: Grid layout
- **TextField**: Material text field
- **OutlinedTextField**: Outlined variant
- **Switch**: Material switch
- **Slider**: Value selector
- **DropdownMenu**: Dropdown selector
- **DatePicker**: Date picker dialog
- **Checkbox**: Multiple selection
- **RadioButton**: Single selection
- **Button**: Material buttons (filled, outlined, text)
- **Card**: Elevated or outlined cards
- **BottomSheet**: Bottom sheet modal
- **AlertDialog**: Material dialog
- **Snackbar**: Bottom notification

## Material Design 3 Visual Style:
- **Material You**: Dynamic color theming
- **Roboto**: System font
- **Colors**:
  - Primary: Brand color
  - Secondary: Accent
  - Tertiary: Additional accent
  - Surface: Background surfaces
- **Elevation**: Shadow/tonal elevation
- **Corner Radius**: 12-28dp for cards
- **Spacing**: 4dp grid system
- **Typography Scale**:
  - Display Large: 57sp
  - Headline Large: 32sp
  - Body Large: 16sp
  - Label Large: 14sp

## Android Navigation Patterns:
- Up button: Top-left arrow ←
- Overflow menu: Top-right ⋮
- Bottom nav: 3-5 primary destinations
- Navigation drawer: Secondary destinations
- FAB: Primary action (bottom-right)

## Android Gestures:
- Swipe right: Open drawer
- Swipe to dismiss: Remove items
- Pull down: Refresh
- Long press: Context menu

## Material Components:
### Layout:
- Scaffold (with TopBar, BottomBar, FAB)
- Column, Row, Box
- LazyColumn, LazyRow
- Surface, Card

### Input:
- TextField, OutlinedTextField
- Checkbox, Switch, RadioButton
- Slider, RangeSlider
- ExposedDropdownMenu

### Action:
- Button (Filled, Outlined, Text)
- IconButton
- FloatingActionButton (FAB)
- ExtendedFloatingActionButton

### Feedback:
- CircularProgressIndicator
- LinearProgressIndicator
- Snackbar
- AlertDialog
- BottomSheet

## Output Format:
{
  "screens": [
    {
      "id": "screen_xxx",
      "name": "ScreenName",
      "type": "list|detail|form",
      "platform": "android",
      "components": [
        {
          "type": "Scaffold",
          "props": {
            "topBar": {...},
            "floatingActionButton": {...}
          },
          "children": [...]
        }
      ]
    }
  ],
  "navigation": {
    "type": "NavHost",
    "bottomBar": {...}
  }
}
`;

    super('AndroidExpert', knowledgeBase, 'claude-sonnet-4-20250514');
  }

  async execute(sharedContext, onThinking) {
    const { userRequirements, workflow } = sharedContext;

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Generating Android Native UI',
        content: 'Creating Jetpack Compose screens with Material Design 3...'
      });
    }

    const prompt = `Generate Android-native mobile UI for: "${userRequirements}"

Create Android screens with:
1. Jetpack Compose components
2. Material Design 3 guidelines
3. Android navigation patterns
4. Material icons
5. Android gestures

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
        step: 'Android UI Complete',
        content: `Generated ${result.screens?.length || 0} Android-native screen(s)`
      });
    }

    return result;
  }
}

module.exports = AndroidExpert;
