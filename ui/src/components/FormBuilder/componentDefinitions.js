// Complete definitions for all 64 form components
import {
  Tag, Type, Hash, Calendar, FileText, List, Circle, Star,
  Paperclip, CheckSquare, Image, Video, Square, Clock, DollarSign,
  Film, SlidersHorizontal, BarChart3, Table, Box, Folder, ChevronDown,
  Wand2, CreditCard, PenTool, Timer, Link, QrCode, Barcode, Camera,
  Calculator, Search, Users, Package, MapPin, Map, ScanText, Home,
  Phone
} from 'lucide-react';

export const COMPONENT_CATEGORIES = {
  CORE: 'Core Elements',
  LAYOUT: 'Layout Elements',
  CARDS: 'Cards',
  ADVANCED: 'Advanced Elements'
};

export const COMPONENT_DEFINITIONS = {
  // CORE ELEMENTS (18 components)
  label: {
    type: 'label',
    label: 'Label',
    category: COMPONENT_CATEGORIES.CORE,
    icon: Tag,
    defaultName: 'Label',
    defaultWidth: 24,
    defaultHeight: 3,
    description: 'Display static text or headings',
    defaultProperties: {
      text: 'Label Text',
      fontSize: '14px',
      fontWeight: 'normal',
      color: '#000000',
      alignment: 'left'
    }
  },

  text: {
    type: 'text',
    label: 'Text Box',
    category: COMPONENT_CATEGORIES.CORE,
    icon: Type,
    defaultName: 'Text Box',
    defaultWidth: 24,
    defaultHeight: 5,
    description: 'Single-line text input field',
    defaultProperties: {
      placeholder: 'Enter text',
      minLength: 0,
      maxLength: 255,
      prefix: '',
      suffix: ''
    }
  },

  number: {
    type: 'number',
    label: 'Number',
    category: COMPONENT_CATEGORIES.CORE,
    icon: Hash,
    defaultName: 'Number',
    defaultWidth: 24,
    defaultHeight: 5,
    description: 'Numeric input with validation',
    defaultProperties: {
      placeholder: 'Enter number',
      min: null,
      max: null,
      isDecimal: false,
      prefix: '',
      suffix: ''
    }
  },

  date: {
    type: 'date',
    label: 'Date & Time',
    category: COMPONENT_CATEGORIES.CORE,
    icon: Calendar,
    defaultName: 'Date',
    defaultWidth: 24,
    defaultHeight: 5,
    description: 'Date and/or time picker',
    defaultProperties: {
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12hr',
      includeTime: false,
      useCurrentDate: false
    }
  },

  textarea: {
    type: 'textarea',
    label: 'Text Area',
    category: COMPONENT_CATEGORIES.CORE,
    icon: FileText,
    defaultName: 'Text Area',
    defaultWidth: 24,
    defaultHeight: 6,
    description: 'Multi-line text input',
    defaultProperties: {
      placeholder: 'Enter text',
      minLength: 0,
      maxLength: 2000,
      rows: 4,
      showCounter: true
    }
  },

  dropdown: {
    type: 'dropdown',
    label: 'Dropdown',
    category: COMPONENT_CATEGORIES.CORE,
    icon: List,
    defaultName: 'Dropdown',
    defaultWidth: 24,
    defaultHeight: 5,
    description: 'Select from predefined options',
    defaultProperties: {
      options: ['Option 1', 'Option 2', 'Option 3'],
      multiSelect: false,
      searchable: true,
      defaultValue: null
    }
  },

  radio: {
    type: 'radio',
    label: 'Radio Button',
    category: COMPONENT_CATEGORIES.CORE,
    icon: Circle,
    defaultName: 'Radio Button',
    defaultWidth: 24,
    defaultHeight: 3,
    description: 'Single choice from multiple options',
    defaultProperties: {
      options: ['Option 1', 'Option 2', 'Option 3'],
      layout: 'vertical',
      defaultValue: null
    }
  },

  rating: {
    type: 'rating',
    label: 'Rating',
    category: COMPONENT_CATEGORIES.CORE,
    icon: Star,
    defaultName: 'Rating',
    defaultWidth: 24,
    defaultHeight: 3,
    description: 'Visual rating input',
    defaultProperties: {
      ratingType: 'star',
      maxRating: 5,
      defaultValue: 0
    }
  },

  file: {
    type: 'file',
    label: 'File Upload',
    category: COMPONENT_CATEGORIES.CORE,
    icon: Paperclip,
    defaultName: 'File Upload',
    defaultWidth: 24,
    defaultHeight: 3,
    description: 'Upload documents and files',
    defaultProperties: {
      allowedTypes: ['pdf', 'docx', 'xlsx', 'jpg', 'png'],
      maxSize: 10,
      maxFiles: 5,
      showPreview: true
    }
  },

  checkbox: {
    type: 'checkbox',
    label: 'Checkbox',
    category: COMPONENT_CATEGORIES.CORE,
    icon: CheckSquare,
    defaultName: 'Checkbox',
    defaultWidth: 24,
    defaultHeight: 3,
    description: 'Multiple choice selection',
    defaultProperties: {
      options: ['Option 1', 'Option 2', 'Option 3'],
      layout: 'vertical',
      minSelection: 0,
      maxSelection: null
    }
  },

  image: {
    type: 'image',
    label: 'Image Upload',
    category: COMPONENT_CATEGORIES.CORE,
    icon: Image,
    defaultName: 'Image Upload',
    defaultWidth: 24,
    defaultHeight: 3,
    description: 'Upload and display images',
    defaultProperties: {
      maxSize: 5,
      allowedFormats: ['jpg', 'png', 'gif'],
      showPreview: true,
      enableCrop: false
    }
  },

  VideoRecorder: {
    type: 'VideoRecorder',
    label: 'Video Recorder',
    category: COMPONENT_CATEGORIES.CORE,
    icon: Video,
    defaultName: 'Video Recorder',
    defaultWidth: 24,
    defaultHeight: 3,
    description: 'Record video from device camera',
    defaultProperties: {
      maxDuration: 300,
      camera: 'front',
      showPreview: true
    }
  },

  button: {
    type: 'button',
    label: 'Button',
    category: COMPONENT_CATEGORIES.CORE,
    icon: Square,
    defaultName: 'Button',
    defaultWidth: 4,
    defaultHeight: 3,
    description: 'Trigger actions',
    defaultProperties: {
      buttonText: 'Click Me',
      actionType: 'submit',
      color: 'primary',
      size: 'medium'
    }
  },

  tSheet: {
    type: 'tSheet',
    label: 'T-Sheet',
    category: COMPONENT_CATEGORIES.CORE,
    icon: Clock,
    defaultName: 'Timesheet',
    defaultWidth: 15,
    defaultHeight: 6,
    description: 'Timesheet tracking component',
    defaultProperties: {
      startDate: null,
      endDate: null,
      calculateTotal: true
    }
  },

  currency: {
    type: 'currency',
    label: 'Currency',
    category: COMPONENT_CATEGORIES.CORE,
    icon: DollarSign,
    defaultName: 'Currency',
    defaultWidth: 24,
    defaultHeight: 3,
    description: 'Monetary value input',
    defaultProperties: {
      currencySymbol: '$',
      decimalPlaces: 2,
      min: 0,
      max: null
    }
  },

  ImageSlider: {
    type: 'ImageSlider',
    label: 'Image Slider',
    category: COMPONENT_CATEGORIES.CORE,
    icon: Film,
    defaultName: 'Image Slider',
    defaultWidth: 24,
    defaultHeight: 3,
    description: 'Carousel/slideshow of images',
    defaultProperties: {
      autoPlay: true,
      interval: 3000,
      showControls: true
    }
  },

  slider: {
    type: 'slider',
    label: 'Slider',
    category: COMPONENT_CATEGORIES.CORE,
    icon: SlidersHorizontal,
    defaultName: 'Slider',
    defaultWidth: 24,
    defaultHeight: 3,
    description: 'Select value by dragging slider',
    defaultProperties: {
      min: 0,
      max: 100,
      step: 1,
      showValue: true
    }
  },

  'Progress Bar': {
    type: 'Progress Bar',
    label: 'Progress Bar',
    category: COMPONENT_CATEGORIES.CORE,
    icon: BarChart3,
    defaultName: 'Progress Bar',
    defaultWidth: 24,
    defaultHeight: 3,
    description: 'Visual progress indicator',
    defaultProperties: {
      currentValue: 0,
      maxValue: 100,
      showPercentage: true,
      color: '#4CAF50'
    }
  },

  // LAYOUT ELEMENTS (7 components)
  dataGrid: {
    type: 'dataGrid',
    label: 'Data Grid',
    category: COMPONENT_CATEGORIES.LAYOUT,
    icon: Table,
    defaultName: 'Data Grid',
    defaultWidth: 24,
    defaultHeight: 9,
    description: 'Display tabular data',
    defaultProperties: {
      dataModel: null,
      columns: [],
      pageSize: 10,
      sortable: true,
      filterable: true
    }
  },

  section: {
    type: 'section',
    label: 'Section',
    category: COMPONENT_CATEGORIES.LAYOUT,
    icon: Box,
    defaultName: 'Section',
    defaultWidth: 24,
    defaultHeight: 3,
    isContainer: true,
    description: 'Container for grouping elements',
    defaultProperties: {
      backgroundColor: '#ffffff',
      borderColor: '#e5e7eb',
      padding: '16px'
    }
  },

  tab: {
    type: 'tab',
    label: 'Tabs',
    category: COMPONENT_CATEGORIES.LAYOUT,
    icon: Folder,
    defaultName: 'Tabs',
    defaultWidth: 12,
    defaultHeight: 3,
    isContainer: true,
    description: 'Multi-tab container',
    defaultProperties: {
      tabs: [
        { name: 'Tab 1', label: 'Tab 1' },
        { name: 'Tab 2', label: 'Tab 2' }
      ],
      defaultTab: 0
    }
  },

  accord: {
    type: 'accord',
    label: 'Accordion',
    category: COMPONENT_CATEGORIES.LAYOUT,
    icon: ChevronDown,
    defaultName: 'Accordion',
    defaultWidth: 12,
    defaultHeight: 4,
    isContainer: true,
    description: 'Collapsible sections',
    defaultProperties: {
      panels: [
        { title: 'Panel 1', expanded: true },
        { title: 'Panel 2', expanded: false }
      ]
    }
  },

  dynamicList: {
    type: 'dynamicList',
    label: 'Dynamic List',
    category: COMPONENT_CATEGORIES.LAYOUT,
    icon: List,
    defaultName: 'Dynamic List',
    defaultWidth: 24,
    defaultHeight: 15,
    isContainer: true,
    description: 'Repeatable list of elements',
    defaultProperties: {
      minItems: 1,
      maxItems: 10,
      template: []
    }
  },

  wizard: {
    type: 'wizard',
    label: 'Wizard',
    category: COMPONENT_CATEGORIES.LAYOUT,
    icon: Wand2,
    defaultName: 'Wizard',
    defaultWidth: 24,
    defaultHeight: 3,
    isContainer: true,
    description: 'Multi-step form',
    defaultProperties: {
      steps: [
        { name: 'Step 1', label: 'Step 1' },
        { name: 'Step 2', label: 'Step 2' }
      ],
      showProgress: true
    }
  },

  tableView: {
    type: 'tableView',
    label: 'Table View',
    category: COMPONENT_CATEGORIES.LAYOUT,
    icon: Table,
    defaultName: 'Table View',
    defaultWidth: 70,
    defaultHeight: 5,
    description: 'Display data in table format',
    defaultProperties: {
      columns: [],
      rows: []
    }
  },

  // CARDS (2 components)
  card: {
    type: 'card',
    label: 'Card',
    category: COMPONENT_CATEGORIES.CARDS,
    icon: CreditCard,
    defaultName: 'Card',
    defaultWidth: 24,
    defaultHeight: 3,
    isContainer: true,
    description: 'Card-style container',
    defaultProperties: {
      headerText: 'Card Title',
      backgroundColor: '#ffffff',
      borderRadius: '8px'
    }
  },

  ImageCard: {
    type: 'ImageCard',
    label: 'Image Card',
    category: COMPONENT_CATEGORIES.CARDS,
    icon: Image,
    defaultName: 'Image Card',
    defaultWidth: 24,
    defaultHeight: 3,
    isContainer: true,
    description: 'Card with image',
    defaultProperties: {
      imageUrl: '',
      title: 'Card Title',
      description: ''
    }
  },

  // ADVANCED ELEMENTS (37 components) - First 15
  imagebox: {
    type: 'imagebox',
    label: 'Image Box',
    category: COMPONENT_CATEGORIES.ADVANCED,
    icon: Image,
    defaultName: 'Image Box',
    defaultWidth: 48,
    defaultHeight: 8,
    description: 'Display images with advanced controls',
    defaultProperties: {
      imageUrl: '',
      fit: 'contain',
      border: false
    }
  },

  esign: {
    type: 'esign',
    label: 'E-Signature',
    category: COMPONENT_CATEGORIES.ADVANCED,
    icon: PenTool,
    defaultName: 'E-Signature',
    defaultWidth: 4,
    defaultHeight: 4,
    description: 'Digital signature capture',
    defaultProperties: {
      penColor: '#000000',
      canvasWidth: 400,
      canvasHeight: 200
    }
  },

  timer: {
    type: 'timer',
    label: 'Timer',
    category: COMPONENT_CATEGORIES.ADVANCED,
    icon: Timer,
    defaultName: 'Timer',
    defaultWidth: 24,
    defaultHeight: 4,
    description: 'Countdown or count-up timer',
    defaultProperties: {
      duration: 300,
      countDown: true,
      autoSubmit: false
    }
  },

  link: {
    type: 'link',
    label: 'Link',
    category: COMPONENT_CATEGORIES.ADVANCED,
    icon: Link,
    defaultName: 'Link',
    defaultWidth: 8,
    defaultHeight: 3,
    description: 'Clickable hyperlinks',
    defaultProperties: {
      url: '#',
      linkText: 'Click here',
      openNewTab: true
    }
  },

  qrcode: {
    type: 'qrcode',
    label: 'QR Code',
    category: COMPONENT_CATEGORIES.ADVANCED,
    icon: QrCode,
    defaultName: 'QR Code',
    defaultWidth: 5,
    defaultHeight: 4,
    description: 'Generate QR codes',
    defaultProperties: {
      data: '',
      size: 200,
      color: '#000000'
    }
  },

  barcode: {
    type: 'barcode',
    label: 'Bar Code',
    category: COMPONENT_CATEGORIES.ADVANCED,
    icon: Barcode,
    defaultName: 'Bar Code',
    defaultWidth: 24,
    defaultHeight: 3,
    description: 'Generate barcodes',
    defaultProperties: {
      value: '',
      format: 'CODE128',
      width: 2
    }
  },

  scanner: {
    type: 'scanner',
    label: 'Scanner',
    category: COMPONENT_CATEGORIES.ADVANCED,
    icon: Camera,
    defaultName: 'Scanner',
    defaultWidth: 24,
    defaultHeight: 3,
    description: 'Scan QR/barcodes',
    defaultProperties: {
      scannerType: 'both',
      autoSubmit: false
    }
  },

  mathexp: {
    type: 'mathexp',
    label: 'Math Expression',
    category: COMPONENT_CATEGORIES.ADVANCED,
    icon: Calculator,
    defaultName: 'Math Expression',
    defaultWidth: 24,
    defaultHeight: 3,
    description: 'Calculate values using formulas',
    defaultProperties: {
      formula: '',
      displayFormat: 'number'
    }
  },

  search: {
    type: 'search',
    label: 'Search',
    category: COMPONENT_CATEGORIES.ADVANCED,
    icon: Search,
    defaultName: 'Search',
    defaultWidth: 24,
    defaultHeight: 3,
    description: 'Search functionality',
    defaultProperties: {
      placeholder: 'Search...',
      searchTarget: null
    }
  },

  roster: {
    type: 'roster',
    label: 'Roster',
    category: COMPONENT_CATEGORIES.ADVANCED,
    icon: Users,
    defaultName: 'Roster',
    defaultWidth: 10,
    defaultHeight: 7,
    description: 'Manage rosters or schedules',
    defaultProperties: {
      slots: [],
      dateRange: 7
    }
  },

  slot: {
    type: 'slot',
    label: 'Slot',
    category: COMPONENT_CATEGORIES.ADVANCED,
    icon: Clock,
    defaultName: 'Slot',
    defaultWidth: 24,
    defaultHeight: 5,
    description: 'Time slot selection',
    defaultProperties: {
      availableSlots: [],
      duration: 30
    }
  },

  calendar: {
    type: 'calendar',
    label: 'Calendar',
    category: COMPONENT_CATEGORIES.ADVANCED,
    icon: Calendar,
    defaultName: 'Calendar',
    defaultWidth: 24,
    defaultHeight: 10,
    description: 'Full calendar view',
    defaultProperties: {
      viewMode: 'month',
      events: []
    }
  },

  widget: {
    type: 'widget',
    label: 'Widget',
    category: COMPONENT_CATEGORIES.ADVANCED,
    icon: Package,
    defaultName: 'Widget',
    defaultWidth: 12,
    defaultHeight: 4,
    description: 'Custom embeddable widgets',
    defaultProperties: {
      widgetType: 'custom',
      config: {}
    }
  },

  geolocation: {
    type: 'geolocation',
    label: 'Geo Location',
    category: COMPONENT_CATEGORIES.ADVANCED,
    icon: MapPin,
    defaultName: 'Geo Location',
    defaultWidth: 12,
    defaultHeight: 3,
    description: 'Capture device location',
    defaultProperties: {
      autoCapture: false,
      showMap: true
    }
  },

  geolocationmap: {
    type: 'geolocationmap',
    label: 'Geo Location Map',
    category: COMPONENT_CATEGORIES.ADVANCED,
    icon: Map,
    defaultName: 'Geo Location Map',
    defaultWidth: 48,
    defaultHeight: 8,
    description: 'Display interactive map',
    defaultProperties: {
      mapProvider: 'google',
      zoom: 12,
      markers: []
    }
  },

  ocr: {
    type: 'ocr',
    label: 'OCR',
    category: COMPONENT_CATEGORIES.ADVANCED,
    icon: ScanText,
    defaultName: 'OCR',
    defaultWidth: 24,
    defaultHeight: 3,
    description: 'Optical Character Recognition',
    defaultProperties: {
      allowedTypes: ['pdf', 'jpg', 'png'],
      fieldMapping: []
    }
  },

  addressblock: {
    type: 'addressblock',
    label: 'Address Block',
    category: COMPONENT_CATEGORIES.ADVANCED,
    icon: Home,
    defaultName: 'Address Block',
    defaultWidth: 24,
    defaultHeight: 14,
    description: 'Structured address input',
    defaultProperties: {
      includeCountry: true,
      includeState: true
    }
  },

  pdfViewer: {
    type: 'pdfViewer',
    label: 'PDF Viewer',
    category: COMPONENT_CATEGORIES.ADVANCED,
    icon: FileText,
    defaultName: 'PDF Viewer',
    defaultWidth: 24,
    defaultHeight: 3,
    description: 'Display PDF documents',
    defaultProperties: {
      pdfUrl: '',
      showControls: true
    }
  },

  phoneInput: {
    type: 'phoneInput',
    label: 'Phone Input',
    category: COMPONENT_CATEGORIES.ADVANCED,
    icon: Phone,
    defaultName: 'Phone Input',
    defaultWidth: 24,
    defaultHeight: 3,
    description: 'Phone number input',
    defaultProperties: {
      defaultCountry: 'US',
      format: 'international'
    }
  },

  paymentButton: {
    type: 'paymentButton',
    label: 'Payment Button',
    category: COMPONENT_CATEGORIES.ADVANCED,
    icon: CreditCard,
    defaultName: 'Payment Button',
    defaultWidth: 24,
    defaultHeight: 3,
    description: 'Payment gateway integration',
    defaultProperties: {
      gateway: 'stripe',
      currency: 'USD',
      amount: 0
    }
  }
};

// Group components by category
export const getComponentsByCategory = () => {
  const categorized = {};

  Object.values(COMPONENT_CATEGORIES).forEach(category => {
    categorized[category] = Object.values(COMPONENT_DEFINITIONS).filter(
      comp => comp.category === category
    );
  });

  return categorized;
};

// Get component definition by type
export const getComponentDefinition = (type) => {
  return COMPONENT_DEFINITIONS[type] || null;
};
