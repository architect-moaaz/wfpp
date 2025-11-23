/**
 * Form Components Knowledge Base
 * Complete catalog of 64 custom form components for AI-powered form generation
 */

const FORM_COMPONENT_CATALOG = `
# FORM COMPONENTS KNOWLEDGE BASE

## 64 Custom Form Components Organized by Category

### CORE ELEMENTS (18 Components)

1. **Text Box** (type: "text")
   - Single-line text input field
   - Properties: placeholder, minLength, maxLength, prefix, suffix
   - Use for: names, titles, short inputs

2. **Number Input** (type: "number")
   - Numeric input with validation
   - Properties: min, max, step, prefix, suffix, placeholder
   - Use for: quantities, ages, counts

3. **Email** (type: "email")
   - Email address input with validation
   - Properties: placeholder, pattern
   - Use for: contact information, user registration

4. **Password** (type: "password")
   - Secure password input
   - Properties: minLength, showStrength, placeholder
   - Use for: authentication, security settings

5. **Date Picker** (type: "date")
   - Date selection input
   - Properties: minDate, maxDate, includeTime
   - Use for: appointments, deadlines, birthdays

6. **Text Area** (type: "textarea")
   - Multi-line text input
   - Properties: rows, placeholder, maxLength
   - Use for: descriptions, comments, notes

7. **Dropdown** (type: "dropdown")
   - Single selection from list
   - Properties: options (array), placeholder
   - Use for: categories, status selection

8. **Radio Buttons** (type: "radio")
   - Single choice from visible options
   - Properties: options (array), layout (vertical/horizontal)
   - Use for: yes/no, priority levels

9. **Checkboxes** (type: "checkbox")
   - Multiple selections
   - Properties: options (array), layout
   - Use for: permissions, features selection

10. **Switch/Toggle** (type: "switch")
    - Boolean on/off control
    - Properties: defaultValue
    - Use for: enable/disable features

11. **Slider** (type: "slider")
    - Range value selection
    - Properties: min, max, step, showValue
    - Use for: ratings, ranges, percentages

12. **Rating** (type: "rating")
    - Star/heart rating input
    - Properties: maxRating, ratingType (star/heart/thumbs)
    - Use for: feedback, reviews

13. **File Upload** (type: "file")
    - File attachment input
    - Properties: maxFiles, maxSize, allowedTypes
    - Use for: document submission

14. **Image Upload** (type: "image")
    - Image-specific upload
    - Properties: maxSize, dimensions
    - Use for: profile pictures, photos

15. **Phone Input** (type: "phoneInput")
    - Phone number with country code
    - Properties: defaultCountry, format
    - Use for: contact details

16. **Currency Input** (type: "currency")
    - Money amount input
    - Properties: currencySymbol, locale
    - Use for: prices, budgets, payments

17. **Color Picker** (type: "color")
    - Color selection
    - Properties: format (hex/rgb)
    - Use for: customization, themes

18. **Time Picker** (type: "time")
    - Time selection
    - Properties: format24h
    - Use for: schedules, appointments

### LAYOUT ELEMENTS (7 Components)

19. **Section/Fieldset** (type: "section")
    - Groups related fields
    - Properties: headerText, collapsible, backgroundColor
    - Use for: organizing complex forms

20. **Card Container** (type: "card")
    - Styled content container
    - Properties: headerText, backgroundColor, borderColor
    - Use for: visual grouping

21. **Tabs** (type: "tab")
    - Tabbed content sections
    - Properties: tabs (array of {label, content})
    - Use for: multi-step forms

22. **Divider** (type: "divider")
    - Visual separator
    - Properties: style, thickness
    - Use for: section breaks

23. **Spacer** (type: "spacer")
    - Empty space
    - Properties: height
    - Use for: layout spacing

24. **Grid Layout** (type: "grid")
    - Multi-column layout
    - Properties: columns, gap
    - Use for: compact forms

25. **Accordion** (type: "accordion")
    - Collapsible content sections
    - Properties: sections (array)
    - Use for: FAQ, help text

### CARDS (2 Components)

26. **Label/Heading** (type: "label")
    - Text display only
    - Properties: text, fontSize, fontWeight, color, alignment
    - Use for: titles, instructions

27. **Button** (type: "button")
    - Action button
    - Properties: buttonText, color (primary/secondary/success/danger), size
    - Use for: submit, cancel, actions

### ADVANCED ELEMENTS (37 Components)

28. **Multi-Select** (type: "multiselect")
    - Multiple dropdown selections
    - Properties: options, maxSelections
    - Use for: tags, categories

29. **Auto-Complete** (type: "autocomplete")
    - Search with suggestions
    - Properties: options, minChars
    - Use for: location, product search

30. **Rich Text Editor** (type: "richtext")
    - Formatted text editing
    - Properties: toolbar options
    - Use for: content creation

31. **Code Editor** (type: "codeeditor")
    - Code input with syntax highlighting
    - Properties: language, theme
    - Use for: API keys, scripts

32. **Signature Pad** (type: "esign")
    - Digital signature capture
    - Properties: canvasWidth, canvasHeight
    - Use for: approvals, agreements

33. **QR Code** (type: "qrcode")
    - QR code display
    - Properties: data, size
    - Use for: check-in, sharing

34. **Barcode** (type: "barcode")
    - Barcode display
    - Properties: format, value
    - Use for: inventory, products

35. **Data Grid/Table** (type: "dataGrid")
    - Editable data table
    - Properties: columns, data
    - Use for: line items, lists

36. **File Manager** (type: "filemanager")
    - File browser/organizer
    - Properties: allowUpload, allowDelete
    - Use for: document management

37. **Location Picker** (type: "location")
    - Map-based location selection
    - Properties: defaultLocation
    - Use for: addresses, venues

38. **Progress Bar** (type: "Progress Bar")
    - Visual progress indicator
    - Properties: currentValue, maxValue, color, showPercentage
    - Use for: multi-step forms, uploads

39. **Stepper** (type: "stepper")
    - Multi-step indicator
    - Properties: steps, currentStep
    - Use for: wizards, processes

40. **Timer/Countdown** (type: "timer")
    - Time-based display
    - Properties: duration, autoStart
    - Use for: timed tasks, exams

41. **OTP Input** (type: "otp")
    - One-time password entry
    - Properties: length, numeric
    - Use for: verification

42. **Password Strength** (type: "passwordstrength")
    - Password validation with meter
    - Properties: requirements
    - Use for: account security

43. **CAPTCHA** (type: "captcha")
    - Bot prevention
    - Properties: type
    - Use for: security

44. **Consent Checkbox** (type: "consent")
    - Terms acceptance
    - Properties: text, required
    - Use for: legal agreements

45. **NPS Score** (type: "nps")
    - Net Promoter Score input
    - Properties: labels
    - Use for: satisfaction surveys

46. **Matrix/Grid Questions** (type: "matrix")
    - Multiple questions with same options
    - Properties: questions, options
    - Use for: surveys

47. **Rank Order** (type: "rankorder")
    - Drag-to-rank items
    - Properties: items
    - Use for: prioritization

48. **Image Choice** (type: "imagechoice")
    - Selection with images
    - Properties: options (with images)
    - Use for: product selection

49. **Video Upload** (type: "video")
    - Video file upload
    - Properties: maxSize, maxDuration
    - Use for: testimonials, recordings

50. **Audio Recorder** (type: "audio")
    - Voice recording
    - Properties: maxDuration
    - Use for: notes, feedback

51. **Drawing Canvas** (type: "drawing")
    - Freehand drawing
    - Properties: tools, colors
    - Use for: diagrams, sketches

52. **Emoji Picker** (type: "emoji")
    - Emoji selection
    - Properties: categories
    - Use for: reactions, feedback

53. **Avatar Upload** (type: "avatar")
    - Profile picture with cropping
    - Properties: size, shape
    - Use for: user profiles

54. **Credit Card** (type: "creditcard")
    - Payment card input
    - Properties: acceptedCards
    - Use for: payments

55. **Bank Account** (type: "bankaccount")
    - Banking details
    - Properties: country
    - Use for: direct deposit

56. **SSN/National ID** (type: "nationalid")
    - Secure ID number
    - Properties: country, masked
    - Use for: identification

57. **Tags Input** (type: "tags")
    - Add/remove tags
    - Properties: maxTags, suggestions
    - Use for: keywords, categories

58. **Mentions** (type: "mentions")
    - @mention input
    - Properties: users
    - Use for: collaboration

59. **Conditional Field** (type: "conditional")
    - Shows based on other field
    - Properties: condition, field
    - Use for: dynamic forms

60. **Calculated Field** (type: "calculated")
    - Auto-calculated value
    - Properties: formula, dependencies
    - Use for: totals, summaries

61. **Lookup/Reference** (type: "lookup")
    - Reference to other data
    - Properties: source, display
    - Use for: related data

62. **Multi-Language** (type: "multilang")
    - Multiple language inputs
    - Properties: languages
    - Use for: i18n content

63. **JSON Editor** (type: "jsoneditor")
    - JSON data editing
    - Properties: schema
    - Use for: configuration

64. **Chart/Visualization** (type: "chart")
    - Data visualization
    - Properties: chartType, data
    - Use for: dashboards, reports

## FIELD PROPERTIES REFERENCE

All fields support:
- **fieldName**: Unique identifier
- **label**: Display label
- **required**: Boolean
- **tooltip**: Help text
- **placeholder**: Input hint
- **defaultValue**: Initial value
- **disabled**: Boolean
- **readonly**: Boolean
- **validation**: Custom rules
- **hideOnMobile**: Boolean
- **hideOnWeb**: Boolean

## USAGE GUIDELINES FOR AI

When generating forms:
1. Choose appropriate component types for the data being collected
2. Use descriptive fieldNames (e.g., "customer_email", "approval_status")
3. Set reasonable validation (required, min/max, patterns)
4. Group related fields in sections
5. Use layout components for better UX
6. Add helpful placeholders and tooltips
7. Consider mobile responsiveness

## COMMON FORM PATTERNS

**User Registration:**
- Text (name), Email, Password, PasswordStrength, Phone, Consent

**Approval Workflow:**
- Radio (approved/rejected), Textarea (comments), Signature, Date

**Data Entry:**
- Text/Number fields, Dropdown (categories), Date, File Upload

**Survey:**
- Rating, Radio, Checkbox, NPS, Matrix, Textarea

**Payment:**
- CreditCard, Currency, Email, Text (billing address)

**Document Submission:**
- File Upload, Text (description), Date, Signature
`;

module.exports = {
  FORM_COMPONENT_CATALOG,

  /**
   * Get form component suggestions based on field requirements
   */
  suggestComponents(fieldDescription) {
    const lower = fieldDescription.toLowerCase();

    // Mapping keywords to component types
    const componentMap = {
      email: 'email',
      password: 'password',
      phone: 'phoneInput',
      date: 'date',
      time: 'time',
      currency: 'currency',
      money: 'currency',
      amount: 'currency',
      price: 'currency',
      file: 'file',
      upload: 'file',
      image: 'image',
      photo: 'image',
      signature: 'esign',
      sign: 'esign',
      rating: 'rating',
      star: 'rating',
      dropdown: 'dropdown',
      select: 'dropdown',
      choice: 'radio',
      checkbox: 'checkbox',
      toggle: 'switch',
      description: 'textarea',
      comment: 'textarea',
      notes: 'textarea',
      number: 'number',
      quantity: 'number',
      age: 'number',
      slider: 'slider',
      range: 'slider',
      location: 'location',
      address: 'text',
      name: 'text',
      title: 'text'
    };

    for (const [keyword, componentType] of Object.entries(componentMap)) {
      if (lower.includes(keyword)) {
        return componentType;
      }
    }

    return 'text'; // Default to text input
  }
};
