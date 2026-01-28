import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Monitor, Smartphone, Tablet, ZoomIn, ZoomOut,
  RotateCcw, RotateCw, Eye, ChevronDown, ChevronUp,
  Square, Trash2, X, ChevronLeft, ChevronRight, Move, AlignJustify,
  // Component icons
  Type, Image, MousePointer, Link, Minus, ArrowUpDown,
  LayoutGrid, CreditCard, Grid3X3, Layers, PanelTop, PanelBottom, Sparkles,
  Navigation, MoreHorizontal, FolderTree, ToggleLeft,
  TextCursor, AlignLeft, ListFilter, CheckSquare, Circle, ToggleRight, Search as SearchIcon,
  Table, BarChart3, UserCircle, Tag, TrendingUp,
  AlertCircle, Loader, ChevronsUpDown, Video, GalleryHorizontal,
  // Additional Shadcn icons
  MessageSquare, Bell, Settings, Menu, MoreVertical
} from 'lucide-react';
import './PageBuilderPro.css';

// Shadcn-style utility function
const cn = (...classes) => classes.filter(Boolean).join(' ');

// Shadcn-inspired component styles
const shadcnStyles = {
  button: {
    default: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '500',
      height: '40px',
      padding: '0 16px',
      transition: 'all 0.2s',
      cursor: 'pointer',
      border: 'none'
    },
    variants: {
      default: { backgroundColor: 'hsl(222.2, 47.4%, 11.2%)', color: 'white' },
      destructive: { backgroundColor: 'hsl(0, 84.2%, 60.2%)', color: 'white' },
      outline: { backgroundColor: 'transparent', border: '1px solid hsl(214.3, 31.8%, 91.4%)', color: 'hsl(222.2, 47.4%, 11.2%)' },
      secondary: { backgroundColor: 'hsl(210, 40%, 96.1%)', color: 'hsl(222.2, 47.4%, 11.2%)' },
      ghost: { backgroundColor: 'transparent', color: 'hsl(222.2, 47.4%, 11.2%)' },
      link: { backgroundColor: 'transparent', color: 'hsl(222.2, 47.4%, 11.2%)', textDecoration: 'underline' }
    }
  },
  card: {
    base: {
      borderRadius: '8px',
      border: '1px solid hsl(214.3, 31.8%, 91.4%)',
      backgroundColor: 'white',
      boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
      transition: 'box-shadow 0.2s, transform 0.2s'
    },
    hover: {
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      transform: 'translateY(-2px)'
    }
  },
  input: {
    base: {
      display: 'flex',
      height: '40px',
      width: '100%',
      borderRadius: '6px',
      border: '1px solid hsl(214.3, 31.8%, 91.4%)',
      backgroundColor: 'white',
      padding: '8px 12px',
      fontSize: '14px',
      outline: 'none',
      transition: 'border-color 0.2s, box-shadow 0.2s'
    },
    focus: {
      borderColor: 'hsl(222.2, 47.4%, 11.2%)',
      boxShadow: '0 0 0 2px hsl(222.2, 47.4%, 11.2%, 0.2)'
    }
  },
  badge: {
    base: {
      display: 'inline-flex',
      alignItems: 'center',
      borderRadius: '9999px',
      border: '1px solid transparent',
      padding: '2px 10px',
      fontSize: '12px',
      fontWeight: '600',
      transition: 'background-color 0.2s'
    },
    variants: {
      default: { backgroundColor: 'hsl(222.2, 47.4%, 11.2%)', color: 'white' },
      secondary: { backgroundColor: 'hsl(210, 40%, 96.1%)', color: 'hsl(222.2, 47.4%, 11.2%)' },
      destructive: { backgroundColor: 'hsl(0, 84.2%, 60.2%)', color: 'white' },
      outline: { backgroundColor: 'transparent', borderColor: 'hsl(214.3, 31.8%, 91.4%)', color: 'hsl(222.2, 47.4%, 11.2%)' },
      success: { backgroundColor: 'hsl(142, 76%, 36%)', color: 'white' },
      warning: { backgroundColor: 'hsl(38, 92%, 50%)', color: 'white' }
    }
  },
  alert: {
    base: {
      position: 'relative',
      width: '100%',
      borderRadius: '8px',
      border: '1px solid',
      padding: '16px',
      fontSize: '14px'
    },
    variants: {
      default: { backgroundColor: 'white', borderColor: 'hsl(214.3, 31.8%, 91.4%)', color: 'hsl(222.2, 47.4%, 11.2%)' },
      info: { backgroundColor: 'hsl(214, 95%, 97%)', borderColor: 'hsl(214, 95%, 80%)', color: 'hsl(214, 95%, 30%)' },
      success: { backgroundColor: 'hsl(142, 76%, 97%)', borderColor: 'hsl(142, 76%, 70%)', color: 'hsl(142, 76%, 25%)' },
      warning: { backgroundColor: 'hsl(38, 92%, 97%)', borderColor: 'hsl(38, 92%, 70%)', color: 'hsl(38, 92%, 30%)' },
      error: { backgroundColor: 'hsl(0, 84%, 97%)', borderColor: 'hsl(0, 84%, 70%)', color: 'hsl(0, 84%, 30%)' },
      destructive: { backgroundColor: 'hsl(0, 84%, 97%)', borderColor: 'hsl(0, 84%, 70%)', color: 'hsl(0, 84%, 30%)' }
    }
  },
  tabs: {
    list: {
      display: 'inline-flex',
      height: '40px',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '8px',
      backgroundColor: 'hsl(210, 40%, 96.1%)',
      padding: '4px'
    },
    trigger: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      whiteSpace: 'nowrap',
      borderRadius: '6px',
      padding: '6px 12px',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s',
      cursor: 'pointer',
      border: 'none',
      backgroundColor: 'transparent',
      color: 'hsl(215.4, 16.3%, 46.9%)'
    },
    triggerActive: {
      backgroundColor: 'white',
      color: 'hsl(222.2, 47.4%, 11.2%)',
      boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
    }
  },
  avatar: {
    base: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderRadius: '9999px',
      backgroundColor: 'hsl(210, 40%, 96.1%)',
      color: 'hsl(222.2, 47.4%, 11.2%)',
      fontWeight: '500'
    },
    sizes: {
      sm: { width: '32px', height: '32px', fontSize: '12px' },
      md: { width: '40px', height: '40px', fontSize: '14px' },
      lg: { width: '48px', height: '48px', fontSize: '16px' }
    }
  },
  progress: {
    track: {
      position: 'relative',
      height: '8px',
      width: '100%',
      overflow: 'hidden',
      borderRadius: '9999px',
      backgroundColor: 'hsl(210, 40%, 96.1%)'
    },
    indicator: {
      height: '100%',
      width: '100%',
      flex: '1 1 0%',
      backgroundColor: 'hsl(222.2, 47.4%, 11.2%)',
      transition: 'transform 0.3s'
    }
  },
  separator: {
    horizontal: {
      height: '1px',
      width: '100%',
      backgroundColor: 'hsl(214.3, 31.8%, 91.4%)'
    },
    vertical: {
      height: '100%',
      width: '1px',
      backgroundColor: 'hsl(214.3, 31.8%, 91.4%)'
    }
  }
};

const PageBuilderPro = ({ pageId, onBack }) => {
  const [page, setPage] = useState({ name: 'Landing Page' });
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [components, setComponents] = useState([]);
  const [deviceMode, setDeviceMode] = useState('desktop');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [loading, setLoading] = useState(true);

  // Forms and data models for WYSIWYG rendering
  const [forms, setForms] = useState({});
  const [dataModels, setDataModels] = useState({});
  // Default design system for consistent styling
  const defaultDesignSystem = {
    colors: {
      primary: '#4f46e5',
      secondary: '#7c3aed',
      background: '#f8fafc',
      cardBackground: '#ffffff',
      text: '#1e293b',
      textSecondary: '#64748b',
      border: '#e2e8f0',
      label: '#475569',
      primaryLight: '#eef2ff'
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif'
    }
  };
  const [designSystem, setDesignSystem] = useState(defaultDesignSystem);
  const [generatedCSS, setGeneratedCSS] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    content: true,
    layout: false,
    typography: false,
    background: false,
    bordersAndShadows: false,
    actions: false
  });

  // Palette collapsed state
  const [isPaletteCollapsed, setIsPaletteCollapsed] = useState(false);

  // Resize and position state
  // eslint-disable-next-line no-unused-vars
  const [isResizing, setIsResizing] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [resizeHandle, setResizeHandle] = useState(null);
  const [positionMode, setPositionMode] = useState('flow'); // 'flow' or 'absolute'

  // Component palette with icons and descriptions (similar to NodePalette)
  // Enhanced configs to match PageExpert generation patterns
  const componentCategories = [
    {
      category: 'Basic Elements',
      components: [
        { type: 'heading', label: 'Heading', icon: Type, description: 'Title or heading text', config: { text: 'Heading', variant: 'h2' } },
        { type: 'text', label: 'Text', icon: AlignLeft, description: 'Paragraph content', config: { text: 'Text content goes here', variant: 'body' } },
        { type: 'button', label: 'Button', icon: MousePointer, description: 'Clickable button', config: { label: 'Button', variant: 'primary', icon: null } },
        { type: 'link', label: 'Link', icon: Link, description: 'Navigation link', config: { text: 'Link text', href: '#' } },
        { type: 'image', label: 'Image', icon: Image, description: 'Display image', config: { alt: 'Image', src: '', width: '100%' } },
        { type: 'divider', label: 'Divider', icon: Minus, description: 'Horizontal separator', config: {} },
        { type: 'spacer', label: 'Spacer', icon: ArrowUpDown, description: 'Vertical spacing', config: { height: '24px' } }
      ]
    },
    {
      category: 'Layout',
      components: [
        { type: 'container', label: 'Container', icon: LayoutGrid, description: 'Content wrapper with children', config: { padding: '16px', maxWidth: '1200px' }, children: [] },
        { type: 'card', label: 'Card', icon: CreditCard, description: 'Content card with children', config: { title: 'Card Title', description: 'Card description', shadow: 'md', hoverElevation: true }, children: [] },
        { type: 'grid', label: 'Grid', icon: Grid3X3, description: 'Multi-column layout', config: { columns: 3, gap: '16px' } },
        { type: 'section', label: 'Section', icon: Layers, description: 'Page section', config: { padding: '32px' }, children: [] },
        { type: 'header', label: 'Header', icon: PanelTop, description: 'Page header', config: { title: 'Page Header', sticky: false } },
        { type: 'footer', label: 'Footer', icon: PanelBottom, description: 'Page footer', config: { text: 'Footer content' } },
        { type: 'hero', label: 'Hero', icon: Sparkles, description: 'Hero section with CTA', config: { title: 'Welcome', subtitle: 'Description text', ctaLabel: 'Get Started', ctaRoute: '/start' } }
      ]
    },
    {
      category: 'Navigation',
      components: [
        { type: 'navbar', label: 'Navbar', icon: Navigation, description: 'Navigation bar', config: { brand: 'Brand', items: [{ label: 'Home', route: '/' }, { label: 'About', route: '/about' }] } },
        { type: 'breadcrumb', label: 'Breadcrumb', icon: FolderTree, description: 'Breadcrumb trail', config: { items: ['Home', 'Page'] } },
        {
          type: 'tabs',
          label: 'Tabs',
          icon: ToggleLeft,
          description: 'Tab navigation with content',
          config: {
            variant: 'underline',
            orientation: 'horizontal',
            tabs: [
              { id: 'tab1', label: 'Tab 1', icon: null, content: [] },
              { id: 'tab2', label: 'Tab 2', icon: null, content: [] },
              { id: 'tab3', label: 'Tab 3', icon: null, content: [] }
            ]
          }
        },
        { type: 'buttonGroup', label: 'Button Group', icon: MoreHorizontal, description: 'Group of buttons', config: { buttons: [{ label: 'Primary', variant: 'primary' }, { label: 'Secondary', variant: 'secondary' }] } }
      ]
    },
    {
      category: 'Form Elements',
      components: [
        { type: 'input', label: 'Text Input', icon: TextCursor, description: 'Single line input', config: { label: 'Label', placeholder: 'Enter text...', type: 'text', required: false } },
        { type: 'textarea', label: 'Textarea', icon: AlignLeft, description: 'Multi-line input', config: { label: 'Label', placeholder: 'Enter text...', rows: 4 } },
        { type: 'select', label: 'Select', icon: ListFilter, description: 'Dropdown select', config: { label: 'Label', options: [{ label: 'Option 1', value: '1' }, { label: 'Option 2', value: '2' }] } },
        { type: 'checkbox', label: 'Checkbox', icon: CheckSquare, description: 'Checkbox input', config: { label: 'Checkbox label' } },
        { type: 'radio', label: 'Radio Group', icon: Circle, description: 'Radio options', config: { label: 'Select one', options: [{ label: 'Option 1', value: '1' }, { label: 'Option 2', value: '2' }] } },
        { type: 'toggle', label: 'Toggle', icon: ToggleRight, description: 'Toggle switch', config: { label: 'Toggle label', name: 'toggleName', defaultValue: false } },
        { type: 'search', label: 'Search', icon: SearchIcon, description: 'Search input', config: { placeholder: 'Search...' } }
      ]
    },
    {
      category: 'Data Display',
      components: [
        { type: 'table', label: 'Table', icon: Table, description: 'Data table', config: { columns: [{ key: 'col1', label: 'Column 1' }, { key: 'col2', label: 'Column 2' }], dataBinding: 'items' } },
        { type: 'stat-card', label: 'Stat Card', icon: TrendingUp, description: 'Metric display', config: { title: 'Metric', value: '100', icon: 'trending-up', trend: '+12%', trendDirection: 'up' } },
        { type: 'chart', label: 'Chart', icon: BarChart3, description: 'Data visualization', config: { chartType: 'bar', title: 'Chart', height: 300 } },
        { type: 'avatar', label: 'Avatar', icon: UserCircle, description: 'User avatar', config: { initials: 'JD', size: 'md', src: '' } },
        { type: 'badge', label: 'Badge', icon: Tag, description: 'Status badge', config: { text: 'Badge', variant: 'success' } },
        { type: 'progress', label: 'Progress Bar', icon: Loader, description: 'Progress bar', config: { variant: 'bar', value: 60, label: 'Progress', showPercent: true } },
        {
          type: 'progress',
          label: 'Step Progress',
          icon: Loader,
          description: 'Wizard steps indicator',
          config: {
            variant: 'steps',
            steps: ['Step 1', 'Step 2', 'Step 3', 'Step 4'],
            currentStep: 1
          }
        }
      ]
    },
    {
      category: 'Feedback',
      components: [
        { type: 'alert', label: 'Info Alert', icon: AlertCircle, description: 'Info message', config: { variant: 'info', title: 'Information', message: 'This is an info message', dismissible: true } },
        { type: 'alert', label: 'Success Alert', icon: AlertCircle, description: 'Success message', config: { variant: 'success', title: 'Success', message: 'Operation completed successfully', dismissible: true } },
        { type: 'alert', label: 'Warning Alert', icon: AlertCircle, description: 'Warning message', config: { variant: 'warning', title: 'Warning', message: 'Please review before continuing', dismissible: true } },
        { type: 'alert', label: 'Error Alert', icon: AlertCircle, description: 'Error message', config: { variant: 'error', title: 'Error', message: 'Something went wrong', dismissible: true } },
        { type: 'spinner', label: 'Spinner Small', icon: Loader, description: 'Small loading spinner', config: { size: 'small', label: '' } },
        { type: 'spinner', label: 'Spinner Large', icon: Loader, description: 'Large loading spinner', config: { size: 'large', label: 'Loading...' } },
        { type: 'accordion', label: 'Accordion', icon: ChevronsUpDown, description: 'Collapsible sections', config: { items: [{ title: 'Section 1', content: 'Content 1' }, { title: 'Section 2', content: 'Content 2' }] } }
      ]
    },
    {
      category: 'Media',
      components: [
        { type: 'video', label: 'Video', icon: Video, description: 'Video player', config: { src: '', poster: '', autoplay: false } },
        { type: 'carousel', label: 'Carousel', icon: GalleryHorizontal, description: 'Image carousel', config: { images: [], autoSlide: true, interval: 5000 } }
      ]
    }
  ];

  // Get all components flattened for collapsed view
  const allComponents = componentCategories.flatMap(cat => cat.components);

  // Fetch page data on component mount
  useEffect(() => {
    if (pageId) {
      fetchPage();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  const fetchPage = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/pages/${pageId}`);
      const data = await response.json();

      if (data.success && data.page) {
        setPage(data.page);

        // Fetch application data for forms and data models
        if (data.page.applicationId) {
          try {
            const appResponse = await fetch(`http://localhost:5000/api/applications/${data.page.applicationId}`);
            const appData = await appResponse.json();

            if (appData.success || appData.application) {
              const app = appData.application || appData;

              // Build forms lookup by ID
              const formsMap = {};
              (app.resources?.forms || []).forEach(form => {
                formsMap[form.id] = form;
              });
              setForms(formsMap);

              // Build data models lookup by ID and name
              const modelsMap = {};
              (app.resources?.dataModels || []).forEach(model => {
                modelsMap[model.id] = model;
                modelsMap[model.name] = model;
              });
              setDataModels(modelsMap);

              // Get generated CSS from designAnalysis (theme/Figma design)
              // Check multiple locations: root, resources, and metadata (where it's persisted to DB)
              const designAnalysis = app.designAnalysis || app.resources?.designAnalysis || app.metadata?.designAnalysis;
              if (designAnalysis?.generatedCSS) {
                setGeneratedCSS(designAnalysis.generatedCSS);
                console.log('[PageBuilder] Loaded generated CSS from theme:', designAnalysis.source || 'unknown');
              }

              // Get design system if available - check multiple sources
              const ds = app.metadata?.designSystem || designAnalysis?.designSystem || app.designSystem;
              if (ds) {
                setDesignSystem(ds);
                console.log('[PageBuilder] Loaded design system:', ds.colors ? 'with colors' : 'without colors');
              } else if (designAnalysis?.generatedCSS) {
                // Try to extract colors from generated CSS as fallback
                const cssColors = {};
                const cssText = designAnalysis.generatedCSS;
                const colorMatches = cssText.match(/--color-(\w+):\s*([^;]+)/g);
                if (colorMatches) {
                  colorMatches.forEach(match => {
                    const [, name, value] = match.match(/--color-(\w+):\s*([^;]+)/) || [];
                    if (name && value) {
                      // Convert CSS var names to camelCase
                      const camelName = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
                      cssColors[camelName] = value.trim();
                    }
                  });
                  if (Object.keys(cssColors).length > 0) {
                    setDesignSystem({ colors: cssColors });
                    console.log('[PageBuilder] Extracted design system from CSS:', Object.keys(cssColors));
                  }
                }
              }
            }
          } catch (appError) {
            console.error('Failed to fetch application data:', appError);
          }
        }

        // Extract all components from sections or use flat components array
        const allComponents = [];

        // Helper function to extract components from section-like structures
        const extractComponents = (sections, sourceName) => {
          sections.forEach((section, sectionIndex) => {
            // Check if this is a section container with nested components
            if (section.components && Array.isArray(section.components)) {
              section.components.forEach((comp, compIndex) => {
                allComponents.push({
                  id: comp.id || `comp-${sectionIndex}-${compIndex}`,
                  sectionId: section.id,
                  sectionType: section.type,
                  ...comp
                });
              });
            } else {
              // This is a flat component (no nested components array)
              allComponents.push({
                id: section.id || `comp-${sectionIndex}`,
                sectionId: section.sectionId || 'main',
                sectionType: section.sectionType || section.type || 'content',
                ...section
              });
            }
          });
        };

        // First try sections (explicit nested structure)
        if (data.page.sections && data.page.sections.length > 0) {
          console.log('[PageBuilderPro] Using sections:', data.page.sections.length);
          extractComponents(data.page.sections, 'sections');
        }
        // Fall back to components array (may be section-like or flat)
        else if (data.page.components && data.page.components.length > 0) {
          console.log('[PageBuilderPro] Using components:', data.page.components.length);
          extractComponents(data.page.components, 'components');
        }

        // Add form components from page.forms array (forms linked to this page)
        if (data.page.forms && Array.isArray(data.page.forms) && data.page.forms.length > 0) {
          console.log('[PageBuilderPro] Page has linked forms:', data.page.forms);

          // Recursive function to check if formId exists anywhere in components (including nested children)
          const formExistsInComponents = (components, formId) => {
            for (const c of components) {
              // Check direct formRef
              if (c.formRef === formId || c.config?.formId === formId || c.config?.formRef === formId) {
                return true;
              }
              // Check if it's a form type component
              if (c.type === 'form' && (c.formRef === formId || c.config?.formRef === formId)) {
                return true;
              }
              // Check nested children recursively
              const children = c.config?.children || c.children || [];
              if (Array.isArray(children) && children.length > 0) {
                if (formExistsInComponents(children, formId)) {
                  return true;
                }
              }
              // Check tabs content
              if (c.config?.tabs && Array.isArray(c.config.tabs)) {
                for (const tab of c.config.tabs) {
                  if (tab.content && Array.isArray(tab.content)) {
                    if (formExistsInComponents(tab.content, formId)) {
                      return true;
                    }
                  }
                }
              }
            }
            return false;
          };

          data.page.forms.forEach((formId, index) => {
            // Check if a form component with this formRef already exists (including nested)
            if (!formExistsInComponents(allComponents, formId)) {
              // Add a form component for this linked form
              allComponents.push({
                id: `page-form-${formId}-${index}`,
                type: 'form',
                sectionId: 'main',
                sectionType: 'main',
                formRef: formId,
                config: {
                  formId: formId,
                  title: 'Form'
                }
              });
              console.log('[PageBuilderPro] Added form component for:', formId);
            } else {
              console.log('[PageBuilderPro] Form already exists in components:', formId);
            }
          });
        }

        console.log('[PageBuilderPro] Extracted components:', allComponents.length, allComponents.map(c => ({ type: c.type, sectionType: c.sectionType })));
        setComponents(allComponents);
      }
    } catch (error) {
      console.error('Failed to fetch page:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleDragStart = (item) => {
    setDraggedItem(item);
  };

  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null); // Track which container we're dropping into
  const [draggedNestedComponent, setDraggedNestedComponent] = useState(null); // Track component being reordered
  const [dropPosition, setDropPosition] = useState(null); // { containerId, index } for reorder position

  // Helper function to recursively add a component to a nested container
  const addComponentToContainer = (components, containerId, newComponent) => {
    return components.map(comp => {
      if (comp.id === containerId) {
        // Found the container - add child to its children array
        const existingChildren = comp.config?.children || comp.children || [];
        return {
          ...comp,
          config: {
            ...comp.config,
            children: [...existingChildren, newComponent]
          },
          children: [...existingChildren, newComponent]
        };
      }
      // Check nested children recursively
      if (comp.config?.children || comp.children) {
        const childrenArray = comp.config?.children || comp.children || [];
        const updatedChildren = addComponentToContainer(childrenArray, containerId, newComponent);
        return {
          ...comp,
          config: { ...comp.config, children: updatedChildren },
          children: updatedChildren
        };
      }
      return comp;
    });
  };

  // Handle drop on the main canvas (root level)
  const handleDrop = (e) => {
    e.preventDefault();

    // If dropping into a container, don't add to root level
    // The container's onDrop handler will handle it
    if (dropTargetId) {
      return;
    }

    if (draggedItem) {
      const newComponent = {
        id: `comp-${Date.now()}`,
        type: draggedItem.type,
        sectionType: 'main',
        config: { ...(draggedItem.config || {}), children: draggedItem.children || [] }
      };
      setComponents([...components, newComponent]);
      setDraggedItem(null);
    }
  };

  // Handle drop into a container
  const handleDropIntoContainer = (e, containerId) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItem) {
      const newComponent = {
        id: `comp-${Date.now()}`,
        type: draggedItem.type,
        config: { ...(draggedItem.config || {}), children: draggedItem.children || [] }
      };
      setComponents(prevComponents => addComponentToContainer(prevComponents, containerId, newComponent));
      setDraggedItem(null);
      setDropTargetId(null);
    }
  };

  // Handle drag over container (to show drop indicator)
  const handleDragOverContainer = (e, containerId) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetId(containerId);
  };

  // Handle drag leave container
  const handleDragLeaveContainer = (e) => {
    e.preventDefault();
    setDropTargetId(null);
  };

  // Helper function to reorder children within a container
  const reorderChildrenInContainer = (components, containerId, fromIndex, toIndex) => {
    return components.map(comp => {
      if (comp.id === containerId) {
        const children = [...(comp.config?.children || comp.children || [])];
        const [movedItem] = children.splice(fromIndex, 1);
        children.splice(toIndex, 0, movedItem);
        return {
          ...comp,
          config: { ...comp.config, children },
          children
        };
      }
      // Check nested children recursively
      if (comp.config?.children || comp.children) {
        const childrenArray = comp.config?.children || comp.children || [];
        const updatedChildren = reorderChildrenInContainer(childrenArray, containerId, fromIndex, toIndex);
        return {
          ...comp,
          config: { ...comp.config, children: updatedChildren },
          children: updatedChildren
        };
      }
      return comp;
    });
  };

  // Handle drag start for nested component (reordering)
  const handleNestedDragStart = (e, component, containerId, index) => {
    e.stopPropagation();
    setDraggedNestedComponent({ component, containerId, index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', component.id);
  };

  // Handle drag over a drop zone between components
  const handleDragOverPosition = (e, containerId, index) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedNestedComponent && draggedNestedComponent.containerId === containerId) {
      setDropPosition({ containerId, index });
    }
  };

  // Handle drop for reordering
  const handleReorderDrop = (e, containerId, toIndex) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedNestedComponent && draggedNestedComponent.containerId === containerId) {
      const fromIndex = draggedNestedComponent.index;
      if (fromIndex !== toIndex && fromIndex !== toIndex - 1) {
        // Adjust toIndex if moving down (since removing shifts indices)
        const adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
        setComponents(prev => reorderChildrenInContainer(prev, containerId, fromIndex, adjustedToIndex));
      }
    }
    setDraggedNestedComponent(null);
    setDropPosition(null);
  };

  // Handle drag end (cleanup)
  const handleNestedDragEnd = () => {
    setDraggedNestedComponent(null);
    setDropPosition(null);
  };

  // ============ RESIZE HANDLERS ============
  // Using refs to avoid closure issues with event listeners

  const resizeRef = useRef({
    isResizing: false,
    handle: null,
    startX: 0,
    startY: 0,
    startWidth: 100,
    startHeight: 100,
    componentId: null
  });

  const positionRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
    componentId: null
  });


  // Start resizing a component
  const handleResizeStart = (e, handle, componentId) => {
    e.preventDefault();
    e.stopPropagation();

    const comp = components.find(c => c.id === componentId);
    if (!comp) return;

    const style = comp.config?.style || {};
    const currentWidth = parseInt(style.width) || 100;
    const currentHeight = parseInt(style.height) || 100;

    // Store in ref for event handlers
    resizeRef.current = {
      isResizing: true,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: currentWidth,
      startHeight: currentHeight,
      componentId
    };

    setIsResizing(true);
    setResizeHandle(handle);

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  // Handle resize mouse move - uses ref to get current values
  const handleResizeMove = useCallback((e) => {
    const ref = resizeRef.current;
    if (!ref.isResizing || !ref.componentId) return;

    const deltaX = e.clientX - ref.startX;
    const deltaY = e.clientY - ref.startY;

    let newWidth = ref.startWidth;
    let newHeight = ref.startHeight;

    // Calculate new dimensions based on handle
    if (ref.handle.includes('e')) {
      newWidth = Math.max(10, ref.startWidth + (deltaX / 5)); // Scale down for percentage
    }
    if (ref.handle.includes('w')) {
      newWidth = Math.max(10, ref.startWidth - (deltaX / 5));
    }
    if (ref.handle.includes('s')) {
      newHeight = Math.max(30, ref.startHeight + deltaY);
    }
    if (ref.handle.includes('n')) {
      newHeight = Math.max(30, ref.startHeight - deltaY);
    }

    // Update component style using the components state setter
    setComponents(prev => prev.map(comp =>
      comp.id === ref.componentId
        ? {
            ...comp,
            config: {
              ...comp.config,
              style: {
                ...(comp.config?.style || {}),
                width: `${Math.min(100, Math.max(10, newWidth))}%`,
                height: (ref.handle.includes('s') || ref.handle.includes('n')) ? `${newHeight}px` : 'auto'
              }
            }
          }
        : comp
    ));
  }, []);

  // End resize
  const handleResizeEnd = useCallback(() => {
    resizeRef.current.isResizing = false;
    setIsResizing(false);
    setResizeHandle(null);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  }, [handleResizeMove]);

  // ============ POSITION HANDLERS (for absolute mode) ============

  // eslint-disable-next-line no-unused-vars
  const [isDraggingPosition, setIsDraggingPosition] = useState(false);

  // Start dragging component position
  const handlePositionDragStart = (e, componentId) => {
    if (positionMode !== 'absolute') return;
    e.preventDefault();
    e.stopPropagation();

    const comp = components.find(c => c.id === componentId);
    if (!comp) return;

    const style = comp.config?.style || {};

    // Store in ref for event handlers
    positionRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: parseInt(style.left) || 0,
      startTop: parseInt(style.top) || 0,
      componentId
    };

    setIsDraggingPosition(true);

    document.addEventListener('mousemove', handlePositionDragMove);
    document.addEventListener('mouseup', handlePositionDragEnd);
  };

  // Handle position drag move - uses ref
  const handlePositionDragMove = useCallback((e) => {
    const ref = positionRef.current;
    if (!ref.isDragging || !ref.componentId) return;

    const deltaX = e.clientX - ref.startX;
    const deltaY = e.clientY - ref.startY;

    setComponents(prev => prev.map(comp =>
      comp.id === ref.componentId
        ? {
            ...comp,
            config: {
              ...comp.config,
              style: {
                ...(comp.config?.style || {}),
                position: 'absolute',
                left: `${Math.max(0, ref.startLeft + deltaX)}px`,
                top: `${Math.max(0, ref.startTop + deltaY)}px`
              }
            }
          }
        : comp
    ));
  }, []);

  // End position drag
  const handlePositionDragEnd = useCallback(() => {
    positionRef.current.isDragging = false;
    setIsDraggingPosition(false);
    document.removeEventListener('mousemove', handlePositionDragMove);
    document.removeEventListener('mouseup', handlePositionDragEnd);
  }, [handlePositionDragMove]);

  // ============ END RESIZE/POSITION HANDLERS ============

  // Update component config
  const updateComponent = (componentId, updates) => {
    setComponents(prevComponents =>
      prevComponents.map(comp =>
        comp.id === componentId
          ? { ...comp, config: { ...comp.config, ...updates } }
          : comp
      )
    );
    // Also update selectedComponent if it's the one being edited
    if (selectedComponent?.id === componentId) {
      setSelectedComponent(prev => ({
        ...prev,
        config: { ...prev.config, ...updates }
      }));
    }
  };

  // Update component style
  const updateComponentStyle = (componentId, styleUpdates) => {
    setComponents(prevComponents =>
      prevComponents.map(comp =>
        comp.id === componentId
          ? { ...comp, config: { ...comp.config, style: { ...(comp.config?.style || {}), ...styleUpdates } } }
          : comp
      )
    );
    if (selectedComponent?.id === componentId) {
      setSelectedComponent(prev => ({
        ...prev,
        config: { ...prev.config, style: { ...(prev.config?.style || {}), ...styleUpdates } }
      }));
    }
  };

  // Helper function to recursively delete a component (from root or nested)
  const deleteComponentRecursive = (components, componentId) => {
    // First try to filter at current level
    const filtered = components.filter(c => c.id !== componentId);
    if (filtered.length !== components.length) {
      // Found and removed at this level
      return filtered;
    }
    // Not found at this level, search in children
    return components.map(comp => {
      if (comp.config?.children || comp.children) {
        const childrenArray = comp.config?.children || comp.children || [];
        const updatedChildren = deleteComponentRecursive(childrenArray, componentId);
        return {
          ...comp,
          config: { ...comp.config, children: updatedChildren },
          children: updatedChildren
        };
      }
      return comp;
    });
  };

  // Delete component (works for both root and nested)
  const deleteComponent = (componentId) => {
    setComponents(prevComponents => deleteComponentRecursive(prevComponents, componentId));
    if (selectedComponent?.id === componentId) {
      setSelectedComponent(null);
    }
  };

  // Get component-specific property fields
  const getComponentPropertyFields = (component) => {
    const type = component.type;
    const config = component.config || {};

    const commonFields = {
      text: ['heading', 'text', 'button', 'link', 'badge', 'alert'],
      label: ['input', 'textarea', 'select', 'checkbox', 'radio', 'toggle', 'stat-card', 'progress'],
      placeholder: ['input', 'textarea', 'search', 'select'],
      title: ['card', 'header', 'footer', 'hero', 'chart', 'accordion'],
      subtitle: ['hero'],
      items: ['breadcrumb', 'tabs', 'navbar', 'sidebar', 'accordion'],
      buttons: ['buttonGroup'],
      options: ['select', 'radio'],
      value: ['stat-card', 'progress'],
      src: ['image', 'avatar', 'video'],
      alt: ['image'],
      href: ['link'],
      variant: ['heading', 'button', 'alert'],
      type: ['alert', 'chart'],
      columns: ['grid'],
      rows: ['textarea'],
      checked: ['checkbox', 'toggle'],
      brand: ['navbar'],
      message: ['alert']
    };

    const fields = [];

    // Add text/content field based on component type
    if (commonFields.text.includes(type)) {
      fields.push({ key: 'text', label: 'Text', type: 'text', value: config.text || config.label || '' });
    }
    if (commonFields.label.includes(type)) {
      fields.push({ key: 'label', label: 'Label', type: 'text', value: config.label || '' });
    }
    if (commonFields.title.includes(type)) {
      fields.push({ key: 'title', label: 'Title', type: 'text', value: config.title || '' });
    }
    if (commonFields.subtitle.includes(type)) {
      fields.push({ key: 'subtitle', label: 'Subtitle', type: 'text', value: config.subtitle || '' });
    }
    if (commonFields.placeholder.includes(type)) {
      fields.push({ key: 'placeholder', label: 'Placeholder', type: 'text', value: config.placeholder || '' });
    }
    if (commonFields.message.includes(type)) {
      fields.push({ key: 'message', label: 'Message', type: 'textarea', value: config.message || '' });
    }
    if (commonFields.value.includes(type)) {
      fields.push({ key: 'value', label: 'Value', type: 'text', value: config.value || '' });
    }
    if (commonFields.src.includes(type)) {
      fields.push({ key: 'src', label: 'Source URL', type: 'text', value: config.src || '' });
    }
    if (commonFields.alt.includes(type)) {
      fields.push({ key: 'alt', label: 'Alt Text', type: 'text', value: config.alt || '' });
    }
    if (commonFields.href.includes(type)) {
      fields.push({ key: 'href', label: 'Link URL', type: 'text', value: config.href || '' });
    }
    if (commonFields.brand.includes(type)) {
      fields.push({ key: 'brand', label: 'Brand Name', type: 'text', value: config.brand || '' });
    }
    if (commonFields.columns.includes(type)) {
      fields.push({ key: 'columns', label: 'Columns', type: 'number', value: config.columns || 3 });
    }
    if (commonFields.rows.includes(type)) {
      fields.push({ key: 'rows', label: 'Rows', type: 'number', value: config.rows || 4 });
    }
    if (commonFields.checked.includes(type)) {
      fields.push({ key: 'checked', label: 'Checked', type: 'checkbox', value: config.checked || false });
    }

    // Variant/Type selects
    if (type === 'heading') {
      fields.push({ key: 'variant', label: 'Variant', type: 'select', value: config.variant || 'h2', options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] });
    }
    if (type === 'button') {
      fields.push({ key: 'variant', label: 'Variant', type: 'select', value: config.variant || 'primary', options: ['primary', 'secondary', 'text', 'ghost'] });
    }
    if (type === 'alert') {
      fields.push({ key: 'type', label: 'Type', type: 'select', value: config.type || 'info', options: ['info', 'success', 'warning', 'error'] });
    }
    if (type === 'chart') {
      fields.push({ key: 'type', label: 'Chart Type', type: 'select', value: config.type || 'bar', options: ['bar', 'line', 'pie', 'doughnut', 'area'] });
    }

    return fields;
  };

  // Render a form field based on its type
  const renderFormField = (field, index) => {
    // Get design system for form fields
    const ds = designSystem || {};
    const dsColors = ds.colors || {};
    const dsTypography = ds.typography || {};
    const dsFontFamily = dsTypography.fontFamily || 'Inter, system-ui, sans-serif';

    const fieldStyle = {
      marginBottom: '16px'
    };
    const labelStyle = {
      display: 'block',
      marginBottom: '6px',
      fontSize: '14px',
      fontWeight: '500',
      color: dsColors.text || '#374151',
      fontFamily: dsFontFamily
    };
    const inputStyle = {
      width: '100%',
      padding: '10px 12px',
      fontSize: '14px',
      border: `1px solid ${dsColors.border || '#d1d5db'}`,
      borderRadius: '6px',
      backgroundColor: dsColors.cardBackground || '#fff',
      color: dsColors.text || '#1e293b',
      boxSizing: 'border-box',
      fontFamily: dsFontFamily
    };

    const fieldType = field.type || field.fieldType || 'text';
    const label = field.label || field.fieldName || `Field ${index + 1}`;
    const placeholder = field.placeholder || `Enter ${label.toLowerCase()}`;

    return (
      <div key={field.id || index} style={fieldStyle}>
        <label style={labelStyle}>
          {label}
          {field.required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
        </label>
        {fieldType === 'textarea' ? (
          <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder={placeholder} readOnly />
        ) : fieldType === 'select' || fieldType === 'dropdown' ? (
          <select style={inputStyle}>
            <option value="">{placeholder || 'Select an option'}</option>
            {(field.options || []).map((opt, i) => (
              <option key={i} value={opt.value || opt}>{opt.label || opt}</option>
            ))}
          </select>
        ) : fieldType === 'checkbox' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" style={{ width: '16px', height: '16px', accentColor: dsColors.primary || '#4f46e5' }} />
            <span style={{ fontSize: '14px', color: dsColors.text || '#374151', fontFamily: dsFontFamily }}>{label}</span>
          </div>
        ) : fieldType === 'radio' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(field.options || [{ label: 'Option 1' }, { label: 'Option 2' }]).map((opt, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: dsColors.text || '#374151', fontFamily: dsFontFamily }}>
                <input type="radio" name={field.fieldName || `radio-${index}`} style={{ accentColor: dsColors.primary || '#4f46e5' }} />
                {opt.label || opt}
              </label>
            ))}
          </div>
        ) : fieldType === 'date' ? (
          <input type="date" style={inputStyle} />
        ) : fieldType === 'number' || fieldType === 'currency' ? (
          <input type="number" style={inputStyle} placeholder={placeholder} readOnly />
        ) : fieldType === 'email' ? (
          <input type="email" style={inputStyle} placeholder={placeholder} readOnly />
        ) : fieldType === 'password' ? (
          <input type="password" style={inputStyle} placeholder="********" readOnly />
        ) : fieldType === 'file' || fieldType === 'file-upload' ? (
          <div style={{ ...inputStyle, backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', cursor: 'pointer' }}>
            Click to upload file
          </div>
        ) : (
          <input type="text" style={inputStyle} placeholder={placeholder} readOnly />
        )}
      </div>
    );
  };

  // Render a complete form
  const renderForm = (formRef) => {
    const form = forms[formRef];

    // Get design system for form styling
    const ds = designSystem || {};
    const dsColors = ds.colors || {};
    const dsTypography = ds.typography || {};
    const dsFontFamily = dsTypography.fontFamily || 'Inter, system-ui, sans-serif';

    if (!form) {
      return (
        <div style={{ padding: '16px', backgroundColor: '#fef3c7', borderRadius: '8px', fontSize: '14px', color: '#92400e', fontFamily: dsFontFamily }}>
          Form not found: {formRef}
        </div>
      );
    }

    const formFields = form.fields || form.components || [];

    return (
      <div style={{ padding: '4px 0' }}>
        {formFields.length === 0 ? (
          <div style={{ padding: '16px', backgroundColor: dsColors.background || '#f5f5f5', borderRadius: '8px', fontSize: '14px', color: dsColors.textSecondary || '#666', fontFamily: dsFontFamily }}>
            No fields in form
          </div>
        ) : (
          formFields.map((field, index) => renderFormField(field, index))
        )}
        <button style={{
          width: '100%',
          padding: '12px 24px',
          backgroundColor: dsColors.primary || '#4f46e5',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          marginTop: '8px',
          fontFamily: dsFontFamily
        }}>
          {form.submitLabel || 'Submit'}
        </button>
      </div>
    );
  };

  // Render a data table
  const renderDataTable = (config) => {
    // Get design system for table styling
    const ds = designSystem || {};
    const dsColors = ds.colors || {};
    const dsTypography = ds.typography || {};
    const dsFontFamily = dsTypography.fontFamily || 'Inter, system-ui, sans-serif';

    const modelName = config.dataBinding || config.model || config.entity;
    const model = dataModels[modelName];
    const title = config.title || config.label || modelName || 'Data Table';

    // Get columns from config or model
    let columns = config.columns || [];
    if (columns.length === 0 && model?.fields) {
      columns = model.fields.slice(0, 5).map(f => ({
        key: f.name || f.fieldName,
        label: f.label || f.name || f.fieldName,
        type: f.type
      }));
    }
    if (columns.length === 0) {
      columns = [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'status', label: 'Status' },
        { key: 'date', label: 'Date' }
      ];
    }

    // Sample data rows
    const sampleRows = [
      { id: '001', name: 'Sample Item 1', status: 'Active', date: '2024-01-15', amount: '$100.00' },
      { id: '002', name: 'Sample Item 2', status: 'Pending', date: '2024-01-14', amount: '$250.00' },
      { id: '003', name: 'Sample Item 3', status: 'Completed', date: '2024-01-13', amount: '$75.00' }
    ];

    const tableStyle = {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '14px',
      fontFamily: dsFontFamily
    };
    const thStyle = {
      textAlign: 'left',
      padding: '12px 16px',
      backgroundColor: dsColors.background || '#f9fafb',
      borderBottom: `2px solid ${dsColors.border || '#e5e7eb'}`,
      fontWeight: '600',
      color: dsColors.text || '#374151'
    };
    const tdStyle = {
      padding: '12px 16px',
      borderBottom: `1px solid ${dsColors.border || '#e5e7eb'}`,
      color: dsColors.text || '#1f2937'
    };

    return (
      <div style={{ backgroundColor: dsColors.cardBackground || '#fff', borderRadius: '8px', border: `1px solid ${dsColors.border || '#e5e7eb'}`, overflow: 'hidden' }}>
        {title && (
          <div style={{ padding: '16px', borderBottom: `1px solid ${dsColors.border || '#e5e7eb'}`, fontWeight: '600', fontSize: '16px', color: dsColors.text || '#1f2937', fontFamily: dsFontFamily }}>
            {title}
          </div>
        )}
        <table style={tableStyle}>
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={i} style={thStyle}>{col.label || col.key}</th>
              ))}
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sampleRows.map((row, rowIndex) => (
              <tr key={rowIndex} style={{ backgroundColor: rowIndex % 2 === 0 ? (dsColors.cardBackground || '#fff') : (dsColors.background || '#f9fafb') }}>
                {columns.map((col, colIndex) => (
                  <td key={colIndex} style={tdStyle}>
                    {col.key === 'status' ? (
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: row[col.key] === 'Active' ? '#dcfce7' : row[col.key] === 'Pending' ? '#fef3c7' : '#e0e7ff',
                        color: row[col.key] === 'Active' ? '#166534' : row[col.key] === 'Pending' ? '#92400e' : '#3730a3'
                      }}>
                        {row[col.key] || '-'}
                      </span>
                    ) : (
                      row[col.key] || '-'
                    )}
                  </td>
                ))}
                <td style={tdStyle}>
                  <button style={{ padding: '4px 8px', marginRight: '4px', fontSize: '12px', border: `1px solid ${dsColors.border || '#d1d5db'}`, borderRadius: '4px', backgroundColor: dsColors.cardBackground || '#fff', color: dsColors.text || '#374151', cursor: 'pointer', fontFamily: dsFontFamily }}>View</button>
                  <button style={{ padding: '4px 8px', fontSize: '12px', border: `1px solid ${dsColors.border || '#d1d5db'}`, borderRadius: '4px', backgroundColor: dsColors.cardBackground || '#fff', color: dsColors.text || '#374151', cursor: 'pointer', fontFamily: dsFontFamily }}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderComponentPreview = (component) => {
    const config = component.config || {};
    const customStyle = config.style || {};

    // Get design system defaults
    const ds = designSystem || {};
    const dsColors = ds.colors || {};
    const dsTypography = ds.typography || {};
    const dsFontFamily = dsTypography.fontFamily || 'Inter, system-ui, sans-serif';

    switch (component.type) {
      case 'text':
        const textStyle = {
          color: customStyle.color || dsColors.text || '#333',
          fontSize: customStyle.fontSize || '16px',
          fontFamily: customStyle.fontFamily || dsFontFamily,
          fontWeight: customStyle.fontWeight || '400',
          textAlign: config.align || 'left',
          marginBottom: customStyle.marginBottom || '0',
          marginTop: customStyle.marginTop || '0',
          ...customStyle
        };
        return <div style={textStyle}>{config.text || component.content || 'Text content'}</div>;

      case 'heading':
        const headingStyle = {
          color: customStyle.color || dsColors.text || '#1a1a1a',
          fontSize: customStyle.fontSize || (config.variant === 'h1' ? '32px' : config.variant === 'h2' ? '24px' : '20px'),
          fontFamily: customStyle.fontFamily || dsFontFamily,
          fontWeight: customStyle.fontWeight || '700',
          textAlign: config.align || 'left',
          margin: '0',
          ...customStyle
        };
        return <div style={headingStyle}>{config.text || component.content || 'Heading'}</div>;

      case 'button':
        // Use Shadcn-style button with variant support
        const variant = config.variant || 'default';
        const buttonVariant = shadcnStyles.button.variants[variant] || shadcnStyles.button.variants.default;
        const buttonStyle = {
          ...shadcnStyles.button.default,
          ...buttonVariant,
          ...(customStyle.padding && { padding: customStyle.padding }),
          ...(customStyle.borderRadius && { borderRadius: customStyle.borderRadius }),
          ...(customStyle.fontSize && { fontSize: customStyle.fontSize }),
          ...(customStyle.fontFamily && { fontFamily: customStyle.fontFamily }),
          ...customStyle
        };
        return <button style={buttonStyle}>{config.label || config.text || 'Button'}</button>;

      case 'card':
        const isCardDropTarget = dropTargetId === component.id;
        // Use Shadcn-style card with hover effects
        const cardStyle = {
          ...shadcnStyles.card.base,
          padding: customStyle.padding || '24px',
          maxWidth: customStyle.maxWidth || '100%',
          margin: customStyle.margin || '0',
          ...(isCardDropTarget && { border: '2px dashed #3b82f6' }),
          ...customStyle
        };
        const cardChildren = config.children || component.children || [];
        const cardId = component.id;

        // Drop zone for card children reordering
        const CardDropZone = ({ index }) => {
          const isActive = dropPosition?.containerId === cardId && dropPosition?.index === index;
          return (
            <div
              onDragOver={(e) => handleDragOverPosition(e, cardId, index)}
              onDrop={(e) => handleReorderDrop(e, cardId, index)}
              style={{
                height: isActive ? '4px' : '2px',
                backgroundColor: isActive ? '#3b82f6' : 'transparent',
                margin: '4px 0',
                borderRadius: '2px',
                transition: 'all 0.2s'
              }}
            />
          );
        };

        return (
          <div
            style={cardStyle}
            onDrop={(e) => {
              if (draggedNestedComponent) {
                handleReorderDrop(e, cardId, cardChildren.length);
              } else {
                handleDropIntoContainer(e, component.id);
              }
            }}
            onDragOver={(e) => handleDragOverContainer(e, component.id)}
            onDragLeave={handleDragLeaveContainer}
          >
            {config.title && <div style={{fontWeight: 600, marginBottom: '16px', fontSize: '18px', color: dsColors.text || '#1a1a1a'}}>{config.title}</div>}
            {config.description && <div style={{color: '#6b7280', fontSize: '14px', marginBottom: '16px', lineHeight: '1.5'}}>{config.description}</div>}
            {/* Only render formRef if not already in children */}
            {component.formRef && !cardChildren.some(c => c.type === 'form' && (c.formRef === component.formRef || c.config?.formRef === component.formRef)) && renderForm(component.formRef)}
            {config.content && <div style={{color: '#374151', lineHeight: '1.6'}}>{config.content}</div>}
            {Array.isArray(cardChildren) && cardChildren.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: config.title || config.description ? '16px' : 0 }}>
                <CardDropZone index={0} />
                {cardChildren.map((child, idx) => {
                  const childComp = { ...child, id: child.id || `card-child-${idx}` };
                  const isDragging = draggedNestedComponent?.component?.id === childComp.id;
                  return (
                    <React.Fragment key={childComp.id}>
                      <div
                        draggable
                        onDragStart={(e) => handleNestedDragStart(e, childComp, cardId, idx)}
                        onDragEnd={handleNestedDragEnd}
                        className={`nested-component ${selectedComponent?.id === childComp.id ? 'selected' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setSelectedComponent(childComp); }}
                        style={{
                          position: 'relative',
                          padding: '4px',
                          borderRadius: '4px',
                          border: selectedComponent?.id === childComp.id ? '2px solid #3b82f6' : '1px solid transparent',
                          backgroundColor: selectedComponent?.id === childComp.id ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                          opacity: isDragging ? 0.5 : 1,
                          cursor: 'grab'
                        }}
                      >
                        {/* Drag handle */}
                        <div
                          style={{
                            position: 'absolute',
                            left: '-20px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '16px',
                            height: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            cursor: 'grab',
                            color: '#9ca3af',
                            opacity: selectedComponent?.id === childComp.id ? 1 : 0
                          }}
                          title="Drag to reorder"
                        >
                          <span style={{ fontSize: '10px', lineHeight: '6px' }}>&#8942;&#8942;</span>
                        </div>
                        <button
                          className="nested-delete-btn"
                          onClick={(e) => { e.stopPropagation(); deleteComponent(childComp.id); }}
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            display: selectedComponent?.id === childComp.id ? 'flex' : 'none',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            zIndex: 10
                          }}
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                        {renderComponentPreview(childComp)}
                      </div>
                      <CardDropZone index={idx + 1} />
                    </React.Fragment>
                  );
                })}
              </div>
            ) : (
              <div style={{
                padding: '16px',
                color: isCardDropTarget ? '#3b82f6' : '#9ca3af',
                textAlign: 'center',
                border: isCardDropTarget ? '2px dashed #3b82f6' : '1px dashed #e5e7eb',
                borderRadius: '8px',
                backgroundColor: isCardDropTarget ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                marginTop: config.title || config.description ? '16px' : 0,
                transition: 'all 0.2s'
              }}>
                {isCardDropTarget ? 'Release to drop component here' : 'Drop components here'}
              </div>
            )}
            {config.actions && Array.isArray(config.actions) && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${dsColors.border || '#e5e7eb'}` }}>
                {config.actions.map((action, idx) => (
                  <button key={idx} style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '500',
                    borderRadius: '6px',
                    border: `1px solid ${dsColors.border || '#e5e7eb'}`,
                    backgroundColor: idx === 0 ? (dsColors.primary || '#4f46e5') : (dsColors.cardBackground || '#fff'),
                    color: idx === 0 ? '#fff' : (dsColors.text || '#374151'),
                    cursor: 'pointer'
                  }}>
                    {action.label || action.text || 'Action'}
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case 'form':
        // Standalone form component
        const formId = component.formRef || config.formId || config.formRef;
        if (formId) {
          return renderForm(formId);
        }
        return (
          <div style={{ padding: '24px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Form component (no form reference)</div>
          </div>
        );

      case 'table':
      case 'data-table':
      case 'data-grid':
      case 'list':
        return renderDataTable(config);

      case 'image':
        const imageStyle = {
          width: customStyle.width || '100%',
          height: customStyle.height || 'auto',
          borderRadius: customStyle.borderRadius || '8px',
          objectFit: 'cover',
          ...customStyle
        };
        return config.src ? (
          <img src={config.src} alt={config.alt || ''} style={imageStyle} />
        ) : (
          <div style={{...imageStyle, height: '150px', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af'}}>
            Image Placeholder
          </div>
        );

      case 'container':
      case 'section':
        const isDropTarget = dropTargetId === component.id;
        const containerStyle = {
          padding: customStyle.padding || '16px',
          backgroundColor: customStyle.backgroundColor || 'transparent',
          borderRadius: customStyle.borderRadius || '8px',
          border: isDropTarget ? '2px dashed #3b82f6' : '1px dashed #d1d5db',
          minHeight: '80px',
          transition: 'border-color 0.2s, background-color 0.2s',
          ...(isDropTarget && { backgroundColor: 'rgba(59, 130, 246, 0.05)' }),
          ...customStyle
        };
        // Handle nested children components
        const containerChildren = config.children || component.children || [];
        const containerId = component.id;

        // Drop zone component for reordering
        const DropZone = ({ index }) => {
          const isActive = dropPosition?.containerId === containerId && dropPosition?.index === index;
          return (
            <div
              onDragOver={(e) => handleDragOverPosition(e, containerId, index)}
              onDrop={(e) => handleReorderDrop(e, containerId, index)}
              style={{
                height: isActive ? '4px' : '2px',
                backgroundColor: isActive ? '#3b82f6' : 'transparent',
                margin: '4px 0',
                borderRadius: '2px',
                transition: 'all 0.2s'
              }}
            />
          );
        };

        return (
          <div
            style={containerStyle}
            onDrop={(e) => {
              if (draggedNestedComponent) {
                handleReorderDrop(e, containerId, containerChildren.length);
              } else {
                handleDropIntoContainer(e, component.id);
              }
            }}
            onDragOver={(e) => handleDragOverContainer(e, component.id)}
            onDragLeave={handleDragLeaveContainer}
          >
            {/* Section title */}
            {config.title && (
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: dsColors.text || '#1a1a1a',
                marginBottom: '16px',
                marginTop: 0
              }}>
                {config.title}
              </h3>
            )}
            {config.subtitle && (
              <p style={{
                fontSize: '14px',
                color: dsColors.textSecondary || '#6b7280',
                marginBottom: '16px',
                marginTop: config.title ? '-8px' : 0
              }}>
                {config.subtitle}
              </p>
            )}
            {Array.isArray(containerChildren) && containerChildren.length > 0 ? (
              <>
                <DropZone index={0} />
                {containerChildren.map((child, idx) => {
                  const childComp = { ...child, id: child.id || `container-child-${idx}` };
                  const isDragging = draggedNestedComponent?.component?.id === childComp.id;
                  return (
                    <React.Fragment key={childComp.id}>
                      <div
                        draggable
                        onDragStart={(e) => handleNestedDragStart(e, childComp, containerId, idx)}
                        onDragEnd={handleNestedDragEnd}
                        className={`nested-component ${selectedComponent?.id === childComp.id ? 'selected' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setSelectedComponent(childComp); }}
                        style={{
                          position: 'relative',
                          padding: '4px',
                          borderRadius: '4px',
                          border: selectedComponent?.id === childComp.id ? '2px solid #3b82f6' : '1px solid transparent',
                          backgroundColor: selectedComponent?.id === childComp.id ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                          opacity: isDragging ? 0.5 : 1,
                          cursor: 'grab'
                        }}
                      >
                        {/* Drag handle */}
                        <div
                          style={{
                            position: 'absolute',
                            left: '-20px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '16px',
                            height: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            cursor: 'grab',
                            color: '#9ca3af',
                            opacity: selectedComponent?.id === childComp.id ? 1 : 0
                          }}
                          title="Drag to reorder"
                        >
                          <span style={{ fontSize: '10px', lineHeight: '6px' }}>&#8942;&#8942;</span>
                        </div>
                        <button
                          className="nested-delete-btn"
                          onClick={(e) => { e.stopPropagation(); deleteComponent(childComp.id); }}
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            display: selectedComponent?.id === childComp.id ? 'flex' : 'none',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            zIndex: 10
                          }}
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                        {renderComponentPreview(childComp)}
                      </div>
                      <DropZone index={idx + 1} />
                    </React.Fragment>
                  );
                })}
              </>
            ) : (
              <div style={{
                padding: '24px',
                color: isDropTarget ? '#3b82f6' : '#9ca3af',
                textAlign: 'center',
                border: isDropTarget ? '2px dashed #3b82f6' : '1px dashed #d1d5db',
                borderRadius: '8px',
                backgroundColor: isDropTarget ? 'rgba(59, 130, 246, 0.05)' : 'rgba(0,0,0,0.02)',
                transition: 'all 0.2s'
              }}>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>
                  {isDropTarget ? 'Release to drop component here' : 'Drop components here'}
                </div>
                <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
                  Drag from palette on the left
                </div>
              </div>
            )}
          </div>
        );

      case 'chart':
        return (
          <div style={{padding: '24px', backgroundColor: '#f9fafb', borderRadius: '8px', textAlign: 'center', border: '1px solid #e5e7eb'}}>
            <div style={{fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '16px'}}>{config.title || 'Chart'}</div>
            <div style={{height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', backgroundColor: '#fff', borderRadius: '8px'}}>
              [{config.type || 'bar'} chart visualization]
            </div>
          </div>
        );

      case 'stat-card':
      case 'metric':
        return (
          <div style={{
            padding: '20px',
            backgroundColor: customStyle.backgroundColor || '#fff',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            ...customStyle
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>{config.label || config.title || 'Metric'}</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: dsColors.text || '#1a1a1a' }}>{config.value || '0'}</div>
            {config.change && (
              <div style={{ fontSize: '12px', color: config.change > 0 ? '#10b981' : '#ef4444', marginTop: '4px' }}>
                {config.change > 0 ? '+' : ''}{config.change}%
              </div>
            )}
          </div>
        );

      case 'search':
      case 'search-bar':
        return (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            ...customStyle
          }}>
            <span style={{ color: '#9ca3af' }}>Search</span>
            <input
              type="text"
              placeholder={config.placeholder || 'Search...'}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '14px'
              }}
              readOnly
            />
          </div>
        );

      case 'filter':
      case 'filters':
        const filters = config.filters || [];
        return (
          <div style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            ...customStyle
          }}>
            {filters.length > 0 ? filters.map((filter, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#374151' }}>{filter.label}</label>
                <select style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}>
                  <option>All</option>
                </select>
              </div>
            )) : (
              <div style={{ color: '#6b7280', fontSize: '14px' }}>Filter controls</div>
            )}
          </div>
        );

      case 'input':
      case 'text-input':
        // Use Shadcn-style input
        return (
          <div style={{ marginBottom: '16px', ...customStyle }}>
            {config.label && <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: 'hsl(222.2, 47.4%, 11.2%)' }}>{config.label}</label>}
            <input
              type={config.inputType || 'text'}
              placeholder={config.placeholder || ''}
              style={shadcnStyles.input.base}
              readOnly
            />
          </div>
        );

      case 'select':
      case 'dropdown':
        return (
          <div style={{ marginBottom: '16px', ...customStyle }}>
            {config.label && <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#374151' }}>{config.label}</label>}
            <select style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
              backgroundColor: '#fff'
            }}>
              <option>{config.placeholder || 'Select...'}</option>
              {(config.options || []).map((opt, i) => (
                <option key={i} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        );

      case 'divider':
        return <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '16px 0' }} />;

      case 'spacer':
        return <div style={{ height: config.height || '24px' }} />;

      case 'header':
      case 'page-header':
        const headerStyle = {
          padding: customStyle.padding || '16px 24px',
          backgroundColor: customStyle.backgroundColor || dsColors.primary || '#1a1a2e',
          color: customStyle.color || '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: customStyle.borderRadius || '0',
          ...customStyle
        };
        return (
          <div style={headerStyle}>
            <div style={{ fontWeight: '600', fontSize: '18px' }}>
              {config.title || config.text || config.label || 'Page Header'}
            </div>
            {config.showNav !== false && (
              <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                {(config.navItems || ['Home', 'About', 'Contact']).map((item, i) => (
                  <span key={i} style={{ cursor: 'pointer', opacity: 0.9 }}>{typeof item === 'string' ? item : item.label}</span>
                ))}
              </div>
            )}
          </div>
        );

      case 'nav':
      case 'navigation':
      case 'navbar':
        const navStyle = {
          padding: customStyle.padding || '12px 24px',
          backgroundColor: customStyle.backgroundColor || '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          ...customStyle
        };
        return (
          <div style={navStyle}>
            <div style={{ fontWeight: '600', fontSize: '16px', color: dsColors.primary || '#4f46e5' }}>
              {config.brand || config.logo || 'Brand'}
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '14px', marginLeft: 'auto' }}>
              {(config.items || config.navItems || ['Dashboard', 'Settings', 'Profile']).map((item, i) => (
                <span key={i} style={{ cursor: 'pointer', color: '#4b5563' }}>{typeof item === 'string' ? item : item.label}</span>
              ))}
            </div>
          </div>
        );

      case 'main':
      case 'content':
      case 'main-content':
        const mainStyle = {
          padding: customStyle.padding || '24px',
          backgroundColor: customStyle.backgroundColor || '#f9fafb',
          minHeight: customStyle.minHeight || '200px',
          borderRadius: customStyle.borderRadius || '0',
          ...customStyle
        };
        return (
          <div style={mainStyle}>
            {config.title && (
              <div style={{ fontWeight: '600', fontSize: '20px', marginBottom: '16px', color: dsColors.text || '#1a1a1a' }}>
                {config.title}
              </div>
            )}
            {config.text || config.content ? (
              <div style={{ color: '#4b5563', fontSize: '14px', lineHeight: '1.6' }}>
                {config.text || config.content}
              </div>
            ) : (
              <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '40px' }}>
                Main content area - Drop components here
              </div>
            )}
          </div>
        );

      case 'footer':
      case 'page-footer':
        const footerStyle = {
          padding: customStyle.padding || '16px 24px',
          backgroundColor: customStyle.backgroundColor || '#1f2937',
          color: customStyle.color || '#9ca3af',
          fontSize: '14px',
          textAlign: config.align || 'center',
          ...customStyle
        };
        return (
          <div style={footerStyle}>
            {config.text || config.content || config.copyright || 'Footer content'}
          </div>
        );

      case 'sidebar':
        const sidebarStyle = {
          padding: customStyle.padding || '16px',
          backgroundColor: customStyle.backgroundColor || '#f3f4f6',
          minWidth: customStyle.minWidth || '200px',
          borderRight: '1px solid #e5e7eb',
          ...customStyle
        };
        return (
          <div style={sidebarStyle}>
            {config.title && (
              <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '16px', color: dsColors.text || '#1a1a1a' }}>
                {config.title}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(config.items || ['Menu Item 1', 'Menu Item 2', 'Menu Item 3']).map((item, i) => (
                <div key={i} style={{ padding: '8px 12px', fontSize: '14px', color: '#4b5563', cursor: 'pointer', borderRadius: '4px' }}>
                  {typeof item === 'string' ? item : item.label}
                </div>
              ))}
            </div>
          </div>
        );

      case 'hero':
      case 'hero-section':
        const heroStyle = {
          padding: customStyle.padding || '64px 24px',
          backgroundColor: customStyle.backgroundColor || dsColors.primary || '#4f46e5',
          color: customStyle.color || '#ffffff',
          textAlign: 'center',
          ...customStyle
        };
        const heroButtons = config.buttons || config.actions || [];
        const heroPrimaryButton = config.buttonText || config.ctaLabel || config.ctaText;
        return (
          <div style={heroStyle}>
            <div style={{ fontSize: '36px', fontWeight: '700', marginBottom: '16px' }}>
              {config.title || config.headline || 'Welcome'}
            </div>
            {(config.subtitle || config.description) && (
              <div style={{ fontSize: '18px', opacity: 0.9, maxWidth: '600px', margin: '0 auto' }}>
                {config.subtitle || config.description}
              </div>
            )}
            {/* Multiple buttons */}
            {heroButtons.length > 0 && (
              <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {heroButtons.map((btn, i) => (
                  <button key={i} style={{
                    padding: '12px 32px',
                    backgroundColor: i === 0 ? '#fff' : 'transparent',
                    color: i === 0 ? (dsColors.primary || '#4f46e5') : '#fff',
                    border: i === 0 ? 'none' : '2px solid #fff',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}>
                    {btn.label || btn.text || `Button ${i + 1}`}
                  </button>
                ))}
              </div>
            )}
            {/* Single button fallback */}
            {heroButtons.length === 0 && heroPrimaryButton && (
              <button style={{ marginTop: '24px', padding: '12px 32px', backgroundColor: '#fff', color: dsColors.primary || '#4f46e5', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                {heroPrimaryButton}
              </button>
            )}
          </div>
        );

      case 'buttonGroup':
      case 'button-group':
        const buttons = config.buttons || config.items || [{ label: 'Button 1' }, { label: 'Button 2' }];
        return (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', ...customStyle }}>
            {buttons.map((btn, i) => (
              <button
                key={i}
                style={{
                  padding: '10px 20px',
                  backgroundColor: i === 0 ? (dsColors.primary || '#4f46e5') : 'transparent',
                  color: i === 0 ? '#ffffff' : (dsColors.primary || '#4f46e5'),
                  border: i === 0 ? 'none' : `1px solid ${dsColors.primary || '#4f46e5'}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                {btn.label || btn.text || `Button ${i + 1}`}
              </button>
            ))}
          </div>
        );

      case 'breadcrumb':
      case 'breadCrumb':
      case 'breadcrumbs':
        const crumbs = config.items || config.breadcrumbs || ['Home', 'Category', 'Current Page'];
        return (
          <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', ...customStyle }}>
            {crumbs.map((crumb, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  color: i === crumbs.length - 1 ? (dsColors.text || '#1a1a1a') : (dsColors.textSecondary || '#6b7280'),
                  fontWeight: i === crumbs.length - 1 ? '500' : '400',
                  cursor: i === crumbs.length - 1 ? 'default' : 'pointer'
                }}>
                  {typeof crumb === 'string' ? crumb : crumb.label}
                </span>
                {i < crumbs.length - 1 && <span style={{ color: '#9ca3af' }}>/</span>}
              </span>
            ))}
          </nav>
        );

      case 'tabs':
      case 'tab-group':
        const tabsList = config.tabs || config.items || ['Tab 1', 'Tab 2', 'Tab 3'];
        const isVertical = config.orientation === 'vertical';
        const tabVariant = config.variant || 'underline'; // underline, pills, boxed

        // Get the first tab's content for preview
        const firstTab = tabsList[0];
        const firstTabContent = typeof firstTab === 'object' ? (firstTab.content || []) : [];

        return (
          <div style={{
            display: isVertical ? 'flex' : 'block',
            gap: isVertical ? '24px' : '0',
            ...customStyle
          }}>
            {/* Tab headers */}
            <div style={{
              display: 'flex',
              flexDirection: isVertical ? 'column' : 'row',
              borderBottom: !isVertical && tabVariant === 'underline' ? '2px solid #e5e7eb' : 'none',
              gap: tabVariant === 'pills' ? '8px' : '0',
              minWidth: isVertical ? '180px' : 'auto',
              borderRight: isVertical ? '1px solid #e5e7eb' : 'none',
              paddingRight: isVertical ? '24px' : '0'
            }}>
              {tabsList.map((tab, i) => {
                const tabLabel = typeof tab === 'string' ? tab : tab.label;
                const isActive = i === 0;

                const tabHeaderStyle = tabVariant === 'pills' ? {
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: isActive ? '#fff' : '#6b7280',
                  backgroundColor: isActive ? (dsColors.primary || '#4f46e5') : '#f3f4f6',
                  borderRadius: '8px',
                  cursor: 'pointer'
                } : {
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: isActive ? (dsColors.primary || '#4f46e5') : '#6b7280',
                  borderBottom: !isVertical && isActive ? `2px solid ${dsColors.primary || '#4f46e5'}` : 'none',
                  borderLeft: isVertical && isActive ? `2px solid ${dsColors.primary || '#4f46e5'}` : 'none',
                  marginBottom: !isVertical ? '-2px' : '0',
                  backgroundColor: isVertical && isActive ? '#f9fafb' : 'transparent',
                  cursor: 'pointer'
                };

                return (
                  <div key={i} style={tabHeaderStyle}>
                    {tabLabel}
                  </div>
                );
              })}
            </div>

            {/* Tab content - render first tab's content */}
            <div style={{ padding: '20px 0', flex: 1 }}>
              {Array.isArray(firstTabContent) && firstTabContent.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {firstTabContent.map((child, idx) => (
                    <div key={child.id || idx}>
                      {renderComponentPreview({ ...child, id: child.id || `tab-content-${idx}` })}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#9ca3af', fontSize: '14px', padding: '20px', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                  Tab content area
                </div>
              )}
            </div>
          </div>
        );

      case 'accordion':
        const accordionItems = config.items || [{ title: 'Section 1', content: 'Content' }];
        return (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', ...customStyle }}>
            {accordionItems.map((item, i) => (
              <div key={i} style={{ borderBottom: i < accordionItems.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                <div style={{
                  padding: '14px 16px',
                  backgroundColor: '#f9fafb',
                  fontWeight: '500',
                  fontSize: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}>
                  {item.title || `Section ${i + 1}`}
                  <span style={{ color: '#9ca3af' }}>+</span>
                </div>
              </div>
            ))}
          </div>
        );

      case 'alert':
      case 'notification':
        // Use Shadcn-style alert with variant support
        const alertType = config.type || config.variant || 'info';
        const alertVariantStyle = shadcnStyles.alert.variants[alertType] || shadcnStyles.alert.variants.info;
        return (
          <div style={{
            ...shadcnStyles.alert.base,
            ...alertVariantStyle,
            ...customStyle
          }}>
            {config.title && <div style={{ fontWeight: '500', marginBottom: '4px' }}>{config.title}</div>}
            {config.message || config.text || config.content || 'Alert message'}
          </div>
        );

      case 'badge':
      case 'tag':
      case 'chip':
        // Use Shadcn-style badge with variant support
        const badgeVariant = config.variant || 'default';
        const badgeVariantStyle = shadcnStyles.badge.variants[badgeVariant] || shadcnStyles.badge.variants.default;
        return (
          <span style={{
            ...shadcnStyles.badge.base,
            ...badgeVariantStyle,
            ...customStyle
          }}>
            {config.text || config.label || 'Badge'}
          </span>
        );

      case 'avatar':
        // Use Shadcn-style avatar with size support
        const avatarSize = config.size || 'md';
        const avatarSizeStyle = shadcnStyles.avatar.sizes[avatarSize] || shadcnStyles.avatar.sizes.md;
        return (
          <div style={{
            ...shadcnStyles.avatar.base,
            ...avatarSizeStyle,
            ...customStyle
          }}>
            {config.src ? (
              <img src={config.src} alt={config.alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              config.initials || config.text?.charAt(0)?.toUpperCase() || 'U'
            )}
          </div>
        );

      case 'progress':
      case 'progress-bar':
        const progressValue = config.value || config.progress || 60;
        const progressVariant = config.variant || 'bar';
        const progressSteps = config.steps || [];
        const currentStep = config.currentStep || 1;

        // Steps variant - for wizards
        if (progressVariant === 'steps' && progressSteps.length > 0) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0', ...customStyle }}>
              {progressSteps.map((step, idx) => {
                const stepNum = idx + 1;
                const isCompleted = stepNum < currentStep;
                const isActive = stepNum === currentStep;
                const isLast = idx === progressSteps.length - 1;

                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center' }}>
                    {/* Step circle */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: '600',
                        backgroundColor: isCompleted ? (dsColors.primary || '#4f46e5') : isActive ? '#fff' : '#f3f4f6',
                        color: isCompleted ? '#fff' : isActive ? (dsColors.primary || '#4f46e5') : '#9ca3af',
                        border: isActive ? `2px solid ${dsColors.primary || '#4f46e5'}` : 'none'
                      }}>
                        {isCompleted ? '\u2713' : stepNum}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        marginTop: '8px',
                        color: isActive ? (dsColors.primary || '#4f46e5') : isCompleted ? '#374151' : '#9ca3af',
                        fontWeight: isActive ? '600' : '400',
                        whiteSpace: 'nowrap'
                      }}>
                        {step}
                      </div>
                    </div>
                    {/* Connector line */}
                    {!isLast && (
                      <div style={{
                        width: '60px',
                        height: '2px',
                        backgroundColor: isCompleted ? (dsColors.primary || '#4f46e5') : '#e5e7eb',
                        margin: '0 8px',
                        marginBottom: '24px'
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          );
        }

        // Default bar variant - Use Shadcn-style progress
        return (
          <div style={{ ...customStyle }}>
            {config.label && <div style={{ fontSize: '14px', marginBottom: '6px', color: 'hsl(222.2, 47.4%, 11.2%)' }}>{config.label}</div>}
            <div style={shadcnStyles.progress.track}>
              <div style={{
                ...shadcnStyles.progress.indicator,
                transform: `translateX(-${100 - progressValue}%)`
              }} />
            </div>
            {(config.showValue || config.showPercent) && <div style={{ fontSize: '12px', marginTop: '4px', color: 'hsl(215.4, 16.3%, 46.9%)' }}>{progressValue}%</div>}
          </div>
        );

      case 'spinner':
      case 'loader':
      case 'loading':
        const spinnerSizes = { small: '20px', medium: '32px', large: '48px' };
        const spinnerSize = spinnerSizes[config.size] || config.size || '32px';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', gap: '12px', ...customStyle }}>
            <div style={{
              width: spinnerSize,
              height: spinnerSize,
              border: `3px solid #e5e7eb`,
              borderTopColor: dsColors.primary || '#4f46e5',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            {config.label && (
              <div style={{ fontSize: '14px', color: dsColors.textSecondary || '#6b7280' }}>{config.label}</div>
            )}
          </div>
        );

      case 'toggle':
      case 'switch':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', ...customStyle }}>
            {config.label && <span style={{ fontSize: '14px', color: dsColors.text || '#374151' }}>{config.label}</span>}
            <div style={{
              width: '44px',
              height: '24px',
              backgroundColor: config.checked ? (dsColors.primary || '#4f46e5') : '#d1d5db',
              borderRadius: '12px',
              padding: '2px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                backgroundColor: '#ffffff',
                borderRadius: '50%',
                transform: config.checked ? 'translateX(20px)' : 'translateX(0)',
                transition: 'transform 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }} />
            </div>
          </div>
        );

      case 'checkbox':
        return (
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', ...customStyle }}>
            <input type="checkbox" checked={config.checked} readOnly style={{ width: '18px', height: '18px', accentColor: dsColors.primary || '#4f46e5' }} />
            <span style={{ fontSize: '14px', color: dsColors.text || '#374151' }}>{config.label || 'Checkbox'}</span>
          </label>
        );

      case 'radio':
      case 'radio-group':
        const radioOptions = config.options || [{ label: 'Option 1' }, { label: 'Option 2' }];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', ...customStyle }}>
            {radioOptions.map((opt, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input type="radio" name="radio-group" checked={i === 0} readOnly style={{ width: '18px', height: '18px', accentColor: dsColors.primary || '#4f46e5' }} />
                <span style={{ fontSize: '14px', color: dsColors.text || '#374151' }}>{opt.label || `Option ${i + 1}`}</span>
              </label>
            ))}
          </div>
        );

      case 'textarea':
        return (
          <div style={{ marginBottom: '16px', ...customStyle }}>
            {config.label && <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#374151' }}>{config.label}</label>}
            <textarea
              placeholder={config.placeholder || ''}
              rows={config.rows || 4}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                resize: 'vertical'
              }}
              readOnly
            />
          </div>
        );

      case 'icon':
        return (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: config.size || '24px',
            height: config.size || '24px',
            color: customStyle.color || dsColors.text || '#374151',
            ...customStyle
          }}>
            <span style={{ fontSize: config.size || '24px' }}>{config.icon || config.name || '★'}</span>
          </div>
        );

      case 'link':
        return (
          <button
            type="button"
            style={{
              color: dsColors.primary || '#4f46e5',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              ...customStyle
            }}
            onClick={(e) => e.preventDefault()}
          >
            {config.text || config.label || 'Link'}
          </button>
        );

      case 'grid':
        const gridCols = config.columns || 3;
        return (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
            gap: config.gap || '16px',
            ...customStyle
          }}>
            {Array.from({ length: config.items || gridCols }).map((_, i) => (
              <div key={i} style={{
                padding: '24px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '1px dashed #d1d5db',
                textAlign: 'center',
                color: '#9ca3af',
                fontSize: '14px'
              }}>
                Grid Item {i + 1}
              </div>
            ))}
          </div>
        );

      default:
        // Check if component has children to render
        const defaultChildren = config.children || component.children || [];
        const hasChildren = Array.isArray(defaultChildren) && defaultChildren.length > 0;
        const displayText = config.text || config.title || config.label || config.content || '';

        return (
          <div style={{
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            {displayText && (
              <div style={{ fontSize: '14px', color: '#374151', marginBottom: hasChildren ? '12px' : 0 }}>
                {displayText}
              </div>
            )}
            {hasChildren ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {defaultChildren.map((child, idx) => (
                  <div key={child.id || idx}>
                    {renderComponentPreview({ ...child, id: child.id || `child-${idx}` })}
                  </div>
                ))}
              </div>
            ) : !displayText && (
              <div style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>
                {component.type || 'Unknown'} component
              </div>
            )}
          </div>
        );
    }
  };

  // Render component for theme preview - uses CSS variables from generated theme
  const renderPreviewComponent = (component) => {
    const config = component.config || {};
    const customStyle = config.style || {};

    // Use same design system as editor for consistency
    const ds = designSystem || {};
    const dsColors = ds.colors || {};
    const dsTypography = ds.typography || {};
    const dsFontFamily = dsTypography.fontFamily || 'Inter, system-ui, sans-serif';

    switch (component.type) {
      case 'text':
        return (
          <p style={{
            color: customStyle.color || dsColors.text || '#333',
            fontSize: customStyle.fontSize || '16px',
            fontFamily: dsFontFamily,
            margin: 0
          }}>
            {config.text || 'Text content'}
          </p>
        );

      case 'heading':
        const HeadingTag = config.variant || 'h2';
        const headingSize = config.variant === 'h1' ? '32px' : config.variant === 'h2' ? '24px' : '20px';
        return (
          <HeadingTag style={{
            color: customStyle.color || dsColors.text || '#1a1a1a',
            fontSize: customStyle.fontSize || headingSize,
            fontFamily: dsFontFamily,
            margin: 0,
            fontWeight: 600
          }}>
            {config.text || 'Heading'}
          </HeadingTag>
        );

      case 'button':
        return (
          <button style={{
            padding: '12px 24px',
            backgroundColor: config.variant === 'secondary' ? (dsColors.secondary || '#7c3aed') : (dsColors.primary || '#4f46e5'),
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer'
          }}>
            {config.label || 'Button'}
          </button>
        );

      case 'card':
        const previewCardChildren = config.children || component.children || [];
        return (
          <div style={{
            backgroundColor: dsColors.cardBackground || '#ffffff',
            border: `1px solid ${dsColors.border || '#e2e8f0'}`,
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}>
            {config.title && (
              <h3 style={{ color: dsColors.text || '#1a1a1a', marginTop: 0, marginBottom: '16px', fontFamily: dsFontFamily }}>
                {config.title}
              </h3>
            )}
            {config.description && <p style={{ color: dsColors.textSecondary || '#64748b', margin: '0 0 16px 0', fontFamily: dsFontFamily }}>{config.description}</p>}
            {config.content && <p style={{ color: dsColors.textSecondary || '#64748b', margin: 0, fontFamily: dsFontFamily }}>{config.content}</p>}
            {/* Only render formRef if not already in children */}
            {component.formRef && !previewCardChildren.some(c => c.type === 'form' && (c.formRef === component.formRef || c.config?.formRef === component.formRef)) && renderForm(component.formRef)}
            {Array.isArray(previewCardChildren) && previewCardChildren.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: config.title || config.description ? '16px' : 0 }}>
                {previewCardChildren.map((child, idx) => (
                  <div key={idx}>{renderPreviewComponent({ ...child, id: child.id || `card-p-${idx}` })}</div>
                ))}
              </div>
            )}
            {config.actions && Array.isArray(config.actions) && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${dsColors.border || '#e5e7eb'}` }}>
                {config.actions.map((action, idx) => (
                  <button key={idx} style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '500',
                    borderRadius: '6px',
                    border: `1px solid ${dsColors.border || '#e5e7eb'}`,
                    backgroundColor: idx === 0 ? (dsColors.primary || '#4f46e5') : (dsColors.cardBackground || '#fff'),
                    color: idx === 0 ? '#fff' : (dsColors.text || '#374151'),
                    cursor: 'pointer'
                  }}>
                    {action.label || action.text || 'Action'}
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case 'form':
        const formId = component.formRef || config.formId;
        if (formId) {
          return (
            <div style={{
              backgroundColor: dsColors.cardBackground || '#ffffff',
              border: `1px solid ${dsColors.border || '#e2e8f0'}`,
              borderRadius: '12px',
              padding: '24px'
            }}>
              {renderForm(formId)}
            </div>
          );
        }
        return <div style={{ color: dsColors.textSecondary || '#6b7280', padding: '16px' }}>Form (no reference)</div>;

      case 'input':
        return (
          <div style={{ marginBottom: '16px' }}>
            {config.label && (
              <label style={{
                display: 'block',
                color: dsColors.label || '#475569',
                fontSize: '14px',
                fontWeight: 500,
                marginBottom: '6px',
                fontFamily: dsFontFamily
              }}>
                {config.label}
              </label>
            )}
            <input
              type="text"
              placeholder={config.placeholder || ''}
              readOnly
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${dsColors.border || '#cbd5e1'}`,
                borderRadius: '8px',
                backgroundColor: dsColors.cardBackground || '#ffffff',
                color: dsColors.text || '#1e293b',
                fontSize: '14px',
                fontFamily: dsFontFamily
              }}
            />
          </div>
        );

      case 'stat-card':
      case 'metric':
        return (
          <div style={{
            padding: '20px',
            backgroundColor: dsColors.cardBackground || '#ffffff',
            border: `1px solid ${dsColors.border || '#e2e8f0'}`,
            borderRadius: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '14px', color: dsColors.textSecondary || '#64748b', marginBottom: '8px', fontFamily: dsFontFamily }}>
                  {config.title || config.label || 'Metric'}
                </div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: dsColors.text || '#1e293b', fontFamily: dsFontFamily }}>
                  {config.value || '0'}
                </div>
                {config.trend && (
                  <div style={{
                    fontSize: '13px',
                    marginTop: '8px',
                    color: config.trendDirection === 'down' ? '#ef4444' : '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {config.trendDirection === 'down' ? '↓' : '↑'} {config.trend}
                  </div>
                )}
              </div>
              {config.icon && (
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: dsColors.primaryLight || '#eef2ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: dsColors.primary || '#4f46e5',
                  fontSize: '18px'
                }}>
                  {config.icon === 'users' ? '👥' : config.icon === 'package' ? '📦' : config.icon === 'clock' ? '⏱' : '📈'}
                </div>
              )}
            </div>
          </div>
        );

      case 'alert':
        const pAlertColors = {
          info: { bg: '#f0f9ff', border: '#0284c7', text: '#0284c7' },
          success: { bg: '#f0fdf4', border: '#16a34a', text: '#16a34a' },
          warning: { bg: '#fffbeb', border: '#d97706', text: '#d97706' },
          error: { bg: '#fef2f2', border: '#dc2626', text: '#dc2626' }
        };
        const pAlertVariant = config.variant || config.type || 'info';
        const pAlertColor = pAlertColors[pAlertVariant] || pAlertColors.info;
        return (
          <div style={{
            padding: '16px',
            backgroundColor: pAlertColor.bg,
            borderLeft: `4px solid ${pAlertColor.border}`,
            borderRadius: '0 8px 8px 0',
            color: pAlertColor.text,
            fontFamily: dsFontFamily
          }}>
            {config.title && <div style={{ fontWeight: 600, marginBottom: '4px' }}>{config.title}</div>}
            <div>{config.message || config.text || 'Alert message'}</div>
          </div>
        );

      case 'spacer':
        return <div style={{ height: config.height || '24px' }} />;

      case 'divider':
        return <hr style={{ border: 'none', borderTop: `1px solid ${dsColors.border || '#e5e7eb'}`, margin: '16px 0' }} />;

      case 'container':
      case 'section':
        const previewContainerChildren = config.children || component.children || [];
        return (
          <div style={{ padding: config.padding || '16px', backgroundColor: config.backgroundColor || 'transparent' }}>
            {config.title && (
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: dsColors.text || '#1a1a1a',
                marginBottom: '16px',
                marginTop: 0,
                fontFamily: dsFontFamily
              }}>
                {config.title}
              </h3>
            )}
            {config.subtitle && (
              <p style={{
                fontSize: '14px',
                color: dsColors.textSecondary || '#6b7280',
                marginBottom: '16px',
                marginTop: config.title ? '-8px' : 0,
                fontFamily: dsFontFamily
              }}>
                {config.subtitle}
              </p>
            )}
            {Array.isArray(previewContainerChildren) && previewContainerChildren.length > 0
              ? previewContainerChildren.map((child, idx) => <div key={idx}>{renderPreviewComponent({ ...child, id: child.id || `p-${idx}` })}</div>)
              : null}
          </div>
        );

      case 'tabs':
        const pTabs = config.tabs || [];
        const pTabVariant = config.variant || 'underline';
        const pFirstTab = pTabs[0];
        const pFirstContent = typeof pFirstTab === 'object' ? (pFirstTab.content || []) : [];
        return (
          <div>
            <div style={{ display: 'flex', borderBottom: pTabVariant === 'underline' ? `2px solid ${dsColors.border || '#e5e7eb'}` : 'none', gap: pTabVariant === 'pills' ? '8px' : '0' }}>
              {pTabs.map((tab, i) => (
                <div key={i} style={{
                  padding: pTabVariant === 'pills' ? '10px 16px' : '12px 20px',
                  fontSize: '14px', fontWeight: '500',
                  fontFamily: dsFontFamily,
                  color: i === 0 ? (pTabVariant === 'pills' ? '#fff' : (dsColors.primary || '#4f46e5')) : '#6b7280',
                  backgroundColor: pTabVariant === 'pills' ? (i === 0 ? (dsColors.primary || '#4f46e5') : '#f3f4f6') : 'transparent',
                  borderRadius: pTabVariant === 'pills' ? '8px' : '0',
                  borderBottom: pTabVariant === 'underline' && i === 0 ? `2px solid ${dsColors.primary || '#4f46e5'}` : 'none',
                  marginBottom: pTabVariant === 'underline' ? '-2px' : '0'
                }}>
                  {typeof tab === 'string' ? tab : tab.label}
                </div>
              ))}
            </div>
            <div style={{ padding: '20px 0' }}>
              {Array.isArray(pFirstContent) && pFirstContent.length > 0
                ? pFirstContent.map((child, idx) => <div key={idx}>{renderPreviewComponent({ ...child, id: child.id || `t-${idx}` })}</div>)
                : <div style={{ color: '#9ca3af' }}>Tab content</div>}
            </div>
          </div>
        );

      case 'progress':
        const pProgressVariant = config.variant || 'bar';
        const pSteps = config.steps || [];
        const pCurrentStep = config.currentStep || 1;
        if (pProgressVariant === 'steps' && pSteps.length > 0) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
              {pSteps.map((step, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: '600',
                      backgroundColor: idx + 1 < pCurrentStep ? (dsColors.primary || '#4f46e5') : idx + 1 === pCurrentStep ? '#fff' : '#f3f4f6',
                      color: idx + 1 < pCurrentStep ? '#fff' : idx + 1 === pCurrentStep ? (dsColors.primary || '#4f46e5') : '#9ca3af',
                      border: idx + 1 === pCurrentStep ? `2px solid ${dsColors.primary || '#4f46e5'}` : 'none'
                    }}>
                      {idx + 1 < pCurrentStep ? '\u2713' : idx + 1}
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '8px', color: idx + 1 === pCurrentStep ? (dsColors.primary || '#4f46e5') : '#9ca3af', fontFamily: dsFontFamily }}>{step}</div>
                  </div>
                  {idx < pSteps.length - 1 && <div style={{ width: '60px', height: '2px', backgroundColor: idx + 1 < pCurrentStep ? (dsColors.primary || '#4f46e5') : '#e5e7eb', margin: '0 8px', marginBottom: '24px' }} />}
                </div>
              ))}
            </div>
          );
        }
        return (
          <div>
            {config.label && <div style={{ fontSize: '14px', marginBottom: '6px', fontFamily: dsFontFamily }}>{config.label}</div>}
            <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${config.value || 60}%`, height: '100%', backgroundColor: dsColors.primary || '#4f46e5', borderRadius: '4px' }} />
            </div>
            {config.showPercent && <div style={{ fontSize: '12px', marginTop: '4px', color: '#6b7280' }}>{config.value || 60}%</div>}
          </div>
        );

      case 'spinner':
        const pSpinnerSize = { small: '20px', medium: '32px', large: '48px' }[config.size] || '32px';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', gap: '12px' }}>
            <div style={{ width: pSpinnerSize, height: pSpinnerSize, border: '3px solid #e5e7eb', borderTopColor: dsColors.primary || '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            {config.label && <div style={{ fontSize: '14px', color: '#6b7280', fontFamily: dsFontFamily }}>{config.label}</div>}
          </div>
        );

      case 'toggle':
        return (
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '24px', backgroundColor: '#e5e7eb', borderRadius: '12px', position: 'relative' }}>
              <div style={{ width: '20px', height: '20px', backgroundColor: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
            <span style={{ fontSize: '14px', fontFamily: dsFontFamily }}>{config.label || 'Toggle'}</span>
          </label>
        );

      case 'buttonGroup':
      case 'button-group':
        const pBtnGrpButtons = config.buttons || config.items || [{ label: 'Button 1' }, { label: 'Button 2' }];
        return (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {pBtnGrpButtons.map((btn, i) => (
              <button
                key={i}
                style={{
                  padding: '10px 20px',
                  backgroundColor: i === 0 ? (dsColors.primary || '#4f46e5') : 'transparent',
                  color: i === 0 ? '#ffffff' : (dsColors.primary || '#4f46e5'),
                  border: i === 0 ? 'none' : `1px solid ${dsColors.primary || '#4f46e5'}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontFamily: dsFontFamily
                }}
              >
                {btn.label || btn.text || `Button ${i + 1}`}
              </button>
            ))}
          </div>
        );

      case 'badge':
        const pBadgeColors = { success: { bg: '#dcfce7', color: '#166534' }, warning: { bg: '#fef3c7', color: '#92400e' }, error: { bg: '#fee2e2', color: '#991b1b' }, info: { bg: '#dbeafe', color: '#1e40af' } };
        const pBadge = pBadgeColors[config.variant] || pBadgeColors.info;
        return <span style={{ display: 'inline-block', padding: '4px 12px', fontSize: '12px', fontWeight: '500', backgroundColor: pBadge.bg, color: pBadge.color, borderRadius: '9999px', fontFamily: dsFontFamily }}>{config.text || 'Badge'}</span>;

      case 'navbar':
        return (
          <nav style={{ padding: '12px 24px', backgroundColor: dsColors.cardBackground || '#fff', borderBottom: `1px solid ${dsColors.border || '#e5e7eb'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: '600', fontSize: '18px', color: dsColors.primary || '#4f46e5', fontFamily: dsFontFamily }}>{config.brand || 'Brand'}</div>
            <div style={{ display: 'flex', gap: '24px' }}>
              {(config.items || []).map((item, i) => <span key={i} style={{ fontSize: '14px', color: dsColors.textSecondary || '#6b7280', fontFamily: dsFontFamily }}>{typeof item === 'string' ? item : item.label}</span>)}
            </div>
          </nav>
        );

      case 'hero':
        const pHeroButtons = config.buttons || config.actions || [];
        const pHeroPrimaryButton = config.buttonText || config.ctaLabel || config.ctaText;
        return (
          <div style={{ padding: '64px 24px', textAlign: 'center', backgroundColor: dsColors.primary || '#4f46e5', borderRadius: '12px', color: '#fff' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '700', margin: '0 0 16px 0', color: '#fff', fontFamily: dsFontFamily }}>{config.title || config.headline || 'Welcome'}</h1>
            {(config.subtitle || config.description) && (
              <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.9)', margin: '0 0 24px 0', fontFamily: dsFontFamily }}>{config.subtitle || config.description}</p>
            )}
            {/* Multiple buttons */}
            {pHeroButtons.length > 0 && (
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {pHeroButtons.map((btn, i) => (
                  <button key={i} style={{
                    padding: '12px 32px',
                    backgroundColor: i === 0 ? '#fff' : 'transparent',
                    color: i === 0 ? (dsColors.primary || '#4f46e5') : '#fff',
                    border: i === 0 ? 'none' : '2px solid #fff',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    fontFamily: dsFontFamily
                  }}>
                    {btn.label || btn.text || `Button ${i + 1}`}
                  </button>
                ))}
              </div>
            )}
            {/* Single button fallback */}
            {pHeroButtons.length === 0 && pHeroPrimaryButton && (
              <button style={{ padding: '12px 32px', backgroundColor: '#fff', color: dsColors.primary || '#4f46e5', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '500', fontFamily: dsFontFamily }}>{pHeroPrimaryButton}</button>
            )}
          </div>
        );

      case 'header':
        return <header style={{ padding: '16px 24px', backgroundColor: dsColors.primary || '#1a1a2e', color: '#fff', fontWeight: '600', fontSize: '18px', fontFamily: dsFontFamily }}>{config.title || 'Page Header'}</header>;

      case 'footer':
        return <footer style={{ padding: '16px 24px', backgroundColor: '#1f2937', color: '#9ca3af', textAlign: 'center', fontSize: '14px', fontFamily: dsFontFamily }}>{config.text || 'Footer content'}</footer>;

      case 'table':
        const pColumns = config.columns || [];
        return (
          <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${dsColors.border || '#e5e7eb'}`, fontFamily: dsFontFamily }}>
            <thead><tr style={{ backgroundColor: dsColors.background || '#f9fafb' }}>{pColumns.map((col, i) => <th key={i} style={{ padding: '12px', textAlign: 'left', borderBottom: `2px solid ${dsColors.border || '#e5e7eb'}`, fontWeight: '600', color: dsColors.text || '#374151' }}>{typeof col === 'string' ? col : col.label || col.key}</th>)}</tr></thead>
            <tbody><tr>{pColumns.map((_, i) => <td key={i} style={{ padding: '12px', borderBottom: `1px solid ${dsColors.border || '#e5e7eb'}`, color: dsColors.text || '#374151' }}>Sample</td>)}</tr></tbody>
          </table>
        );

      case 'chart':
        return (
          <div style={{ padding: '24px', backgroundColor: dsColors.background || '#f9fafb', borderRadius: '8px', textAlign: 'center', border: `1px solid ${dsColors.border || '#e5e7eb'}` }}>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: dsColors.text || '#374151', fontFamily: dsFontFamily }}>{config.title || 'Chart'}</div>
            <div style={{ height: config.height || '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', backgroundColor: dsColors.cardBackground || '#fff', borderRadius: '8px' }}>[{config.chartType || 'bar'} chart]</div>
          </div>
        );

      case 'accordion':
        return (
          <div style={{ border: `1px solid ${dsColors.border || '#e5e7eb'}`, borderRadius: '8px', overflow: 'hidden' }}>
            {(config.items || []).map((item, i) => (
              <div key={i} style={{ borderBottom: i < (config.items?.length || 0) - 1 ? `1px solid ${dsColors.border || '#e5e7eb'}` : 'none' }}>
                <div style={{ padding: '14px 16px', backgroundColor: dsColors.background || '#f9fafb', fontWeight: '500', fontSize: '14px', display: 'flex', justifyContent: 'space-between', color: dsColors.text || '#374151', fontFamily: dsFontFamily }}>{item.title || `Section ${i + 1}`}<span style={{ color: '#9ca3af' }}>+</span></div>
              </div>
            ))}
          </div>
        );

      case 'grid':
        const pGridChildren = config.children || component.children || [];
        return (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${config.columns || 2}, 1fr)`, gap: config.gap || '16px' }}>
            {Array.isArray(pGridChildren) && pGridChildren.length > 0 ? pGridChildren.map((child, idx) => <div key={idx}>{renderPreviewComponent({ ...child, id: child.id || `g-${idx}` })}</div>) : null}
          </div>
        );

      case 'breadcrumb':
      case 'breadcrumbs':
        const pCrumbs = config.items || config.breadcrumbs || ['Home', 'Category', 'Current Page'];
        return (
          <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontFamily: dsFontFamily }}>
            {pCrumbs.map((crumb, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  color: i === pCrumbs.length - 1 ? (dsColors.text || '#1a1a1a') : (dsColors.textSecondary || '#6b7280'),
                  fontWeight: i === pCrumbs.length - 1 ? '500' : '400',
                  cursor: i === pCrumbs.length - 1 ? 'default' : 'pointer'
                }}>
                  {typeof crumb === 'string' ? crumb : crumb.label}
                </span>
                {i < pCrumbs.length - 1 && <span style={{ color: '#9ca3af' }}>/</span>}
              </span>
            ))}
          </nav>
        );

      case 'image':
        return (
          <img
            src={config.src || 'https://via.placeholder.com/400x200'}
            alt={config.alt || 'Image'}
            style={{
              maxWidth: '100%',
              borderRadius: '8px',
              display: 'block'
            }}
          />
        );

      case 'link':
        return (
          <a
            href={config.href || '#'}
            style={{
              color: dsColors.primary || '#4f46e5',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              fontFamily: dsFontFamily
            }}
          >
            {config.text || config.label || 'Link'}
          </a>
        );

      case 'select':
      case 'dropdown':
        return (
          <div style={{ marginBottom: '16px' }}>
            {config.label && (
              <label style={{
                display: 'block',
                color: dsColors.label || '#475569',
                fontSize: '14px',
                fontWeight: 500,
                marginBottom: '6px',
                fontFamily: dsFontFamily
              }}>
                {config.label}
              </label>
            )}
            <select style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${dsColors.border || '#cbd5e1'}`,
              borderRadius: '8px',
              backgroundColor: dsColors.cardBackground || '#ffffff',
              color: dsColors.text || '#1e293b',
              fontSize: '14px',
              fontFamily: dsFontFamily
            }}>
              {(config.options || []).map((opt, i) => (
                <option key={i} value={typeof opt === 'string' ? opt : opt.value}>
                  {typeof opt === 'string' ? opt : opt.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'textarea':
        return (
          <div style={{ marginBottom: '16px' }}>
            {config.label && (
              <label style={{
                display: 'block',
                color: dsColors.label || '#475569',
                fontSize: '14px',
                fontWeight: 500,
                marginBottom: '6px',
                fontFamily: dsFontFamily
              }}>
                {config.label}
              </label>
            )}
            <textarea
              placeholder={config.placeholder || ''}
              rows={config.rows || 4}
              readOnly
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${dsColors.border || '#cbd5e1'}`,
                borderRadius: '8px',
                backgroundColor: dsColors.cardBackground || '#ffffff',
                color: dsColors.text || '#1e293b',
                fontSize: '14px',
                resize: 'vertical',
                fontFamily: dsFontFamily
              }}
            />
          </div>
        );

      case 'checkbox':
        return (
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" style={{ width: '18px', height: '18px', accentColor: dsColors.primary || '#4f46e5' }} />
            <span style={{ fontSize: '14px', color: dsColors.text || '#374151', fontFamily: dsFontFamily }}>{config.label || 'Checkbox'}</span>
          </label>
        );

      case 'radio':
      case 'radio-group':
        const pRadioOptions = config.options || [{ label: 'Option 1' }, { label: 'Option 2' }];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pRadioOptions.map((opt, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="radio" name={`radio-${component.id}`} style={{ width: '18px', height: '18px', accentColor: dsColors.primary || '#4f46e5' }} />
                <span style={{ fontSize: '14px', color: dsColors.text || '#374151', fontFamily: dsFontFamily }}>{typeof opt === 'string' ? opt : opt.label}</span>
              </label>
            ))}
          </div>
        );

      case 'search':
      case 'search-bar':
        return (
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder={config.placeholder || 'Search...'}
              readOnly
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                border: `1px solid ${dsColors.border || '#cbd5e1'}`,
                borderRadius: '8px',
                backgroundColor: dsColors.cardBackground || '#ffffff',
                color: dsColors.text || '#1e293b',
                fontSize: '14px',
                fontFamily: dsFontFamily
              }}
            />
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
              &#128269;
            </span>
          </div>
        );

      case 'avatar':
        const pAvatarSize = config.size === 'small' ? '32px' : config.size === 'large' ? '64px' : '48px';
        return (
          <div style={{
            width: pAvatarSize,
            height: pAvatarSize,
            borderRadius: '50%',
            backgroundColor: dsColors.primary || '#4f46e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: '600',
            fontSize: config.size === 'small' ? '12px' : config.size === 'large' ? '24px' : '18px',
            overflow: 'hidden',
            fontFamily: dsFontFamily
          }}>
            {config.src ? (
              <img src={config.src} alt={config.alt || 'Avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              config.initials || config.name?.charAt(0) || 'U'
            )}
          </div>
        );

      case 'sidebar':
        const pSidebarItems = config.items || [];
        return (
          <div style={{
            width: config.width || '240px',
            backgroundColor: dsColors.cardBackground || '#fff',
            borderRight: `1px solid ${dsColors.border || '#e5e7eb'}`,
            padding: '16px 0',
            minHeight: '200px'
          }}>
            {pSidebarItems.map((item, i) => (
              <div key={i} style={{
                padding: '10px 16px',
                fontSize: '14px',
                fontFamily: dsFontFamily,
                color: i === 0 ? (dsColors.primary || '#4f46e5') : (dsColors.text || '#374151'),
                backgroundColor: i === 0 ? (dsColors.primaryLight || '#eef2ff') : 'transparent',
                borderLeft: i === 0 ? `3px solid ${dsColors.primary || '#4f46e5'}` : '3px solid transparent',
                cursor: 'pointer'
              }}>
                {typeof item === 'string' ? item : item.label}
              </div>
            ))}
          </div>
        );

      case 'icon':
        return (
          <span style={{ fontSize: config.size || '24px', color: config.color || (dsColors.text || '#374151') }}>
            {config.name || '*'}
          </span>
        );

      default:
        const pDefaultChildren = config.children || component.children || [];
        if (Array.isArray(pDefaultChildren) && pDefaultChildren.length > 0) {
          return <div>{pDefaultChildren.map((child, idx) => <div key={idx}>{renderPreviewComponent({ ...child, id: child.id || `d-${idx}` })}</div>)}</div>;
        }
        const pDisplayContent = config.text || config.title || config.content || config.label;
        if (pDisplayContent) {
          return <div style={{ padding: '12px', color: dsColors.text || '#374151', fontFamily: dsFontFamily }}>{pDisplayContent}</div>;
        }
        return <div style={{ padding: '12px', backgroundColor: dsColors.background || '#f9fafb', borderRadius: '8px', color: '#9ca3af', fontSize: '13px', fontStyle: 'italic', fontFamily: dsFontFamily }}>{component.type || 'Unknown'} component</div>;
    }
  };

  return (
    <div className="page-builder-pro">
      {/* Header */}
      <div className="builder-header">
        <div className="header-left">
          <div className="logo-section">
            <Square size={20} className="logo-icon" />
            <span className="logo-text">PageBuilder</span>
          </div>
          <div className="project-selector">
            <span className="project-label">Project:</span>
            <button className="project-dropdown">
              {page.name}
              <ChevronDown size={16} />
            </button>
          </div>
        </div>

        <div className="header-center">
          <div className="device-controls">
            <button
              className={`device-btn ${deviceMode === 'desktop' ? 'active' : ''}`}
              onClick={() => setDeviceMode('desktop')}
              title="Desktop"
            >
              <Monitor size={18} />
            </button>
            <button
              className={`device-btn ${deviceMode === 'tablet' ? 'active' : ''}`}
              onClick={() => setDeviceMode('tablet')}
              title="Tablet"
            >
              <Tablet size={18} />
            </button>
            <button
              className={`device-btn ${deviceMode === 'mobile' ? 'active' : ''}`}
              onClick={() => setDeviceMode('mobile')}
              title="Mobile"
            >
              <Smartphone size={18} />
            </button>
          </div>

          <div className="zoom-controls">
            <button className="zoom-btn" onClick={() => setZoomLevel(Math.max(25, zoomLevel - 25))}>
              <ZoomOut size={16} />
            </button>
            <span className="zoom-level">{zoomLevel}%</span>
            <button className="zoom-btn" onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}>
              <ZoomIn size={16} />
            </button>
          </div>

          {/* Position Mode Toggle */}
          <div className="position-mode-controls" style={{ display: 'flex', gap: '4px', marginLeft: '16px', padding: '4px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
            <button
              className={`position-mode-btn ${positionMode === 'flow' ? 'active' : ''}`}
              onClick={() => setPositionMode('flow')}
              title="Flow Layout - Components stack vertically"
              style={{
                padding: '6px 10px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: positionMode === 'flow' ? '#3b82f6' : 'transparent',
                color: positionMode === 'flow' ? '#fff' : '#6b7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 500
              }}
            >
              <AlignJustify size={14} />
              Flow
            </button>
            <button
              className={`position-mode-btn ${positionMode === 'absolute' ? 'active' : ''}`}
              onClick={() => setPositionMode('absolute')}
              title="Absolute Position - Drag to position freely"
              style={{
                padding: '6px 10px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: positionMode === 'absolute' ? '#3b82f6' : 'transparent',
                color: positionMode === 'absolute' ? '#fff' : '#6b7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 500
              }}
            >
              <Move size={14} />
              Free
            </button>
          </div>
        </div>

        <div className="header-right">
          <button className="history-btn" title="Undo">
            <RotateCcw size={18} />
          </button>
          <button className="history-btn" title="Redo">
            <RotateCw size={18} />
          </button>
          <button className="preview-btn" onClick={() => setShowPreview(true)}>
            <Eye size={18} />
            Preview
          </button>
          <button className="publish-btn">Publish</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="builder-content">
        {/* Left Sidebar - Component Palette (NodePalette style) */}
        <div className={`component-palette ${isPaletteCollapsed ? 'collapsed' : ''}`}>
          <button
            className="palette-toggle"
            onClick={() => setIsPaletteCollapsed(!isPaletteCollapsed)}
            title={isPaletteCollapsed ? 'Show Components' : 'Hide Components'}
          >
            {isPaletteCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>

          {isPaletteCollapsed ? (
            <div className="palette-collapsed-content">
              {allComponents.map((comp, idx) => {
                const IconComponent = comp.icon;
                return (
                  <div
                    key={`${comp.type}-${comp.label}-${idx}`}
                    className="comp-icon-item"
                    data-type={comp.type}
                    draggable
                    onDragStart={() => handleDragStart(comp)}
                    title={comp.label}
                  >
                    <div className="comp-icon-only">
                      <IconComponent size={18} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              <div className="palette-header">
                <h3>Components</h3>
                <p>Drag to canvas to build</p>
              </div>
              <div className="palette-items">
                {componentCategories.map((category) => (
                  <div key={category.category} className="palette-category">
                    <div className="category-title">{category.category}</div>
                    {category.components.map((comp, idx) => (
                      <div
                        key={`${comp.type}-${comp.label}-${idx}`}
                        className="palette-comp"
                        data-type={comp.type}
                        draggable
                        onDragStart={() => handleDragStart(comp)}
                      >
                        <div className="palette-comp-icon">
                          <comp.icon size={20} />
                        </div>
                        <div className="palette-comp-info">
                          <div className="palette-comp-label">{comp.label}</div>
                          <div className="palette-comp-desc">{comp.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Center Canvas */}
        <div className="canvas-area">
          <div
            className={`canvas-container canvas-${deviceMode}`}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            style={{ transform: `scale(${zoomLevel / 100})` }}
          >
            <div className="canvas-page" style={{ backgroundColor: '#ffffff', minHeight: '100%' }}>
              {loading ? (
                <div className="canvas-empty">
                  <p>Loading page...</p>
                </div>
              ) : components.length === 0 ? (
                <div className="canvas-empty">
                  <p>Drop components here to start building</p>
                </div>
              ) : (
                <div className="page-sections">
                  {/* Group components by section */}
                  {['header', 'main', 'footer'].map(sectionType => {
                    const sectionComponents = components.filter(c => c.sectionType === sectionType);
                    if (sectionComponents.length === 0) return null;

                    const sectionStyles = {
                      header: { padding: '24px 40px', borderBottom: '1px solid #eee' },
                      main: { padding: '40px', minHeight: '400px' },
                      footer: { padding: '24px 40px', borderTop: '1px solid #eee', backgroundColor: '#fafafa' }
                    };

                    return (
                      <div
                        key={sectionType}
                        className={`page-section section-${sectionType}`}
                        style={sectionStyles[sectionType]}
                      >
                        {sectionComponents.map((component) => {
                          const compStyle = component.config?.style || {};
                          const isSelected = selectedComponent?.id === component.id;
                          return (
                            <div
                              key={component.id}
                              className={`canvas-component ${isSelected ? 'selected' : ''} ${positionMode === 'absolute' ? 'absolute-mode' : ''}`}
                              onClick={() => setSelectedComponent(component)}
                              onMouseDown={(e) => positionMode === 'absolute' && isSelected && handlePositionDragStart(e, component.id)}
                              data-type={component.type}
                              style={{
                                marginBottom: positionMode === 'flow' ? '16px' : '0',
                                padding: '8px',
                                position: positionMode === 'absolute' ? 'absolute' : 'relative',
                                left: compStyle.left || 'auto',
                                top: compStyle.top || 'auto',
                                width: compStyle.width || 'auto',
                                height: compStyle.height || 'auto',
                                cursor: positionMode === 'absolute' && isSelected ? 'move' : 'pointer'
                              }}
                            >
                              {/* Delete button */}
                              <button
                                className="component-delete-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteComponent(component.id);
                                }}
                                title="Delete component"
                              >
                                <Trash2 size={14} />
                              </button>

                              {/* Resize handles - only show when selected */}
                              {isSelected && (
                                <>
                                  {/* East (right) */}
                                  <div
                                    className="resize-handle resize-e"
                                    onMouseDown={(e) => handleResizeStart(e, 'e', component.id)}
                                    style={{
                                      position: 'absolute',
                                      right: '-4px',
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      width: '8px',
                                      height: '24px',
                                      backgroundColor: '#3b82f6',
                                      borderRadius: '4px',
                                      cursor: 'ew-resize',
                                      zIndex: 20
                                    }}
                                  />
                                  {/* West (left) */}
                                  <div
                                    className="resize-handle resize-w"
                                    onMouseDown={(e) => handleResizeStart(e, 'w', component.id)}
                                    style={{
                                      position: 'absolute',
                                      left: '-4px',
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      width: '8px',
                                      height: '24px',
                                      backgroundColor: '#3b82f6',
                                      borderRadius: '4px',
                                      cursor: 'ew-resize',
                                      zIndex: 20
                                    }}
                                  />
                                  {/* South (bottom) */}
                                  <div
                                    className="resize-handle resize-s"
                                    onMouseDown={(e) => handleResizeStart(e, 's', component.id)}
                                    style={{
                                      position: 'absolute',
                                      bottom: '-4px',
                                      left: '50%',
                                      transform: 'translateX(-50%)',
                                      width: '24px',
                                      height: '8px',
                                      backgroundColor: '#3b82f6',
                                      borderRadius: '4px',
                                      cursor: 'ns-resize',
                                      zIndex: 20
                                    }}
                                  />
                                  {/* Southeast corner */}
                                  <div
                                    className="resize-handle resize-se"
                                    onMouseDown={(e) => handleResizeStart(e, 'se', component.id)}
                                    style={{
                                      position: 'absolute',
                                      right: '-4px',
                                      bottom: '-4px',
                                      width: '10px',
                                      height: '10px',
                                      backgroundColor: '#3b82f6',
                                      borderRadius: '2px',
                                      cursor: 'nwse-resize',
                                      zIndex: 20
                                    }}
                                  />
                                  {/* Southwest corner */}
                                  <div
                                    className="resize-handle resize-sw"
                                    onMouseDown={(e) => handleResizeStart(e, 'sw', component.id)}
                                    style={{
                                      position: 'absolute',
                                      left: '-4px',
                                      bottom: '-4px',
                                      width: '10px',
                                      height: '10px',
                                      backgroundColor: '#3b82f6',
                                      borderRadius: '2px',
                                      cursor: 'nesw-resize',
                                      zIndex: 20
                                    }}
                                  />
                                  {/* Size indicator */}
                                  <div
                                    style={{
                                      position: 'absolute',
                                      bottom: '-24px',
                                      right: '0',
                                      fontSize: '10px',
                                      color: '#6b7280',
                                      backgroundColor: '#f3f4f6',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {compStyle.width || '100%'} × {compStyle.height || 'auto'}
                                  </div>
                                </>
                              )}

                              {renderComponentPreview(component)}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        <div className="right-sidebar">
          {selectedComponent ? (
            <div className="properties-panel">
              <div className="properties-header">
                <h3>{selectedComponent.type.charAt(0).toUpperCase() + selectedComponent.type.slice(1)} Properties</h3>
                <p className="selected-component-id">ID: {selectedComponent.id}</p>
              </div>

              <div className="properties-content">
                {/* Content Section - Component-specific properties */}
                <div className="property-section">
                  <button
                    className="section-header"
                    onClick={() => toggleSection('content')}
                  >
                    <span>Content</span>
                    {expandedSections.content ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {(expandedSections.content !== false) && (
                    <div className="section-content">
                      {getComponentPropertyFields(selectedComponent).map((field, idx) => (
                        <div key={field.key} className="property-row">
                          <div className="property-field" style={{ width: '100%' }}>
                            <label>{field.label}</label>
                            {field.type === 'text' && (
                              <input
                                type="text"
                                value={field.value}
                                onChange={(e) => updateComponent(selectedComponent.id, { [field.key]: e.target.value })}
                                className="prop-input"
                              />
                            )}
                            {field.type === 'textarea' && (
                              <textarea
                                value={field.value}
                                onChange={(e) => updateComponent(selectedComponent.id, { [field.key]: e.target.value })}
                                className="prop-input"
                                rows={3}
                              />
                            )}
                            {field.type === 'number' && (
                              <input
                                type="number"
                                value={field.value}
                                onChange={(e) => updateComponent(selectedComponent.id, { [field.key]: parseInt(e.target.value) || 0 })}
                                className="prop-input"
                              />
                            )}
                            {field.type === 'checkbox' && (
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={(e) => updateComponent(selectedComponent.id, { [field.key]: e.target.checked })}
                                style={{ width: '18px', height: '18px' }}
                              />
                            )}
                            {field.type === 'select' && (
                              <select
                                value={field.value}
                                onChange={(e) => updateComponent(selectedComponent.id, { [field.key]: e.target.value })}
                                className="prop-select"
                              >
                                {field.options.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      ))}
                      {getComponentPropertyFields(selectedComponent).length === 0 && (
                        <p className="section-placeholder">No editable content properties</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Layout Section */}
                <div className="property-section">
                  <button
                    className="section-header"
                    onClick={() => toggleSection('layout')}
                  >
                    <span>Layout</span>
                    {expandedSections.layout ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {expandedSections.layout && (
                    <div className="section-content">
                      {/* Size Controls */}
                      <div className="property-row">
                        <div className="property-field">
                          <label>Width</label>
                          <input
                            type="text"
                            value={selectedComponent.config?.style?.width || 'auto'}
                            onChange={(e) => updateComponentStyle(selectedComponent.id, { width: e.target.value })}
                            className="prop-input"
                            placeholder="e.g., 100%, 200px"
                          />
                        </div>
                        <div className="property-field">
                          <label>Height</label>
                          <input
                            type="text"
                            value={selectedComponent.config?.style?.height || 'auto'}
                            onChange={(e) => updateComponentStyle(selectedComponent.id, { height: e.target.value })}
                            className="prop-input"
                            placeholder="e.g., auto, 100px"
                          />
                        </div>
                      </div>

                      {/* Quick Width Presets */}
                      <div className="property-row" style={{ marginBottom: '12px' }}>
                        <div className="property-field">
                          <label style={{ fontSize: '11px', color: '#9ca3af' }}>Quick Width</label>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {['25%', '33%', '50%', '75%', '100%'].map(w => (
                              <button
                                key={w}
                                onClick={() => updateComponentStyle(selectedComponent.id, { width: w })}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '4px',
                                  backgroundColor: selectedComponent.config?.style?.width === w ? '#3b82f6' : '#fff',
                                  color: selectedComponent.config?.style?.width === w ? '#fff' : '#374151',
                                  cursor: 'pointer'
                                }}
                              >
                                {w}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Position Controls - Only in Absolute Mode */}
                      {positionMode === 'absolute' && (
                        <>
                          <div className="property-row">
                            <div className="property-field">
                              <label>Left (X)</label>
                              <input
                                type="text"
                                value={selectedComponent.config?.style?.left || '0'}
                                onChange={(e) => updateComponentStyle(selectedComponent.id, { position: 'absolute', left: e.target.value })}
                                className="prop-input"
                                placeholder="e.g., 0, 100px"
                              />
                            </div>
                            <div className="property-field">
                              <label>Top (Y)</label>
                              <input
                                type="text"
                                value={selectedComponent.config?.style?.top || '0'}
                                onChange={(e) => updateComponentStyle(selectedComponent.id, { position: 'absolute', top: e.target.value })}
                                className="prop-input"
                                placeholder="e.g., 0, 50px"
                              />
                            </div>
                          </div>
                          <div className="property-row" style={{ marginBottom: '12px' }}>
                            <div className="property-field">
                              <label style={{ fontSize: '11px', color: '#9ca3af' }}>Z-Index (Layer)</label>
                              <input
                                type="number"
                                value={parseInt(selectedComponent.config?.style?.zIndex) || 1}
                                onChange={(e) => updateComponentStyle(selectedComponent.id, { zIndex: e.target.value })}
                                className="prop-input"
                                min="0"
                                max="100"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      <div className="property-row">
                        <div className="property-field">
                          <label>Padding</label>
                          <input
                            type="text"
                            value={selectedComponent.config?.style?.padding || '0'}
                            onChange={(e) => updateComponentStyle(selectedComponent.id, { padding: e.target.value })}
                            className="prop-input"
                            placeholder="e.g., 12px or 12px 24px"
                          />
                        </div>
                      </div>
                      <div className="property-row">
                        <div className="property-field">
                          <label>Margin</label>
                          <input
                            type="text"
                            value={selectedComponent.config?.style?.margin || '0'}
                            onChange={(e) => updateComponentStyle(selectedComponent.id, { margin: e.target.value })}
                            className="prop-input"
                            placeholder="e.g., 16px or 16px 0"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Typography Section */}
                <div className="property-section">
                  <button
                    className="section-header"
                    onClick={() => toggleSection('typography')}
                  >
                    <span>Typography</span>
                    {expandedSections.typography ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {expandedSections.typography && (
                    <div className="section-content">
                      <div className="property-row">
                        <div className="property-field">
                          <label>Font Size</label>
                          <input
                            type="text"
                            value={selectedComponent.config?.style?.fontSize || ''}
                            onChange={(e) => updateComponentStyle(selectedComponent.id, { fontSize: e.target.value })}
                            className="prop-input"
                            placeholder="e.g., 16px"
                          />
                        </div>
                        <div className="property-field">
                          <label>Weight</label>
                          <select
                            value={selectedComponent.config?.style?.fontWeight || '400'}
                            onChange={(e) => updateComponentStyle(selectedComponent.id, { fontWeight: e.target.value })}
                            className="prop-select"
                          >
                            <option value="300">Light</option>
                            <option value="400">Normal</option>
                            <option value="500">Medium</option>
                            <option value="600">Semi Bold</option>
                            <option value="700">Bold</option>
                          </select>
                        </div>
                      </div>
                      <div className="property-row">
                        <div className="property-field">
                          <label>Text Color</label>
                          <div className="color-input-group">
                            <input
                              type="color"
                              value={selectedComponent.config?.style?.color || '#000000'}
                              onChange={(e) => updateComponentStyle(selectedComponent.id, { color: e.target.value })}
                              className="color-picker"
                            />
                            <input
                              type="text"
                              value={selectedComponent.config?.style?.color || ''}
                              onChange={(e) => updateComponentStyle(selectedComponent.id, { color: e.target.value })}
                              className="prop-input"
                              placeholder="#000000"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="property-row">
                        <div className="property-field">
                          <label>Text Align</label>
                          <select
                            value={selectedComponent.config?.style?.textAlign || 'left'}
                            onChange={(e) => updateComponentStyle(selectedComponent.id, { textAlign: e.target.value })}
                            className="prop-select"
                          >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Background Section */}
                <div className="property-section">
                  <button
                    className="section-header"
                    onClick={() => toggleSection('background')}
                  >
                    <span>Background</span>
                    {expandedSections.background ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {expandedSections.background && (
                    <div className="section-content">
                      <div className="property-row">
                        <div className="property-field">
                          <label>Background Color</label>
                          <div className="color-input-group">
                            <input
                              type="color"
                              value={selectedComponent.config?.style?.backgroundColor || '#ffffff'}
                              onChange={(e) => updateComponentStyle(selectedComponent.id, { backgroundColor: e.target.value })}
                              className="color-picker"
                            />
                            <input
                              type="text"
                              value={selectedComponent.config?.style?.backgroundColor || ''}
                              onChange={(e) => updateComponentStyle(selectedComponent.id, { backgroundColor: e.target.value })}
                              className="prop-input"
                              placeholder="#ffffff"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Borders & Shadows Section */}
                <div className="property-section">
                  <button
                    className="section-header"
                    onClick={() => toggleSection('bordersAndShadows')}
                  >
                    <span>Borders & Shadows</span>
                    {expandedSections.bordersAndShadows ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {expandedSections.bordersAndShadows && (
                    <div className="section-content">
                      <div className="property-row">
                        <div className="property-field">
                          <label>Border Radius</label>
                          <input
                            type="text"
                            value={selectedComponent.config?.style?.borderRadius || ''}
                            onChange={(e) => updateComponentStyle(selectedComponent.id, { borderRadius: e.target.value })}
                            className="prop-input"
                            placeholder="e.g., 8px"
                          />
                        </div>
                      </div>
                      <div className="property-row">
                        <div className="property-field">
                          <label>Border</label>
                          <input
                            type="text"
                            value={selectedComponent.config?.style?.border || ''}
                            onChange={(e) => updateComponentStyle(selectedComponent.id, { border: e.target.value })}
                            className="prop-input"
                            placeholder="e.g., 1px solid #ccc"
                          />
                        </div>
                      </div>
                      <div className="property-row">
                        <div className="property-field">
                          <label>Box Shadow</label>
                          <input
                            type="text"
                            value={selectedComponent.config?.style?.boxShadow || ''}
                            onChange={(e) => updateComponentStyle(selectedComponent.id, { boxShadow: e.target.value })}
                            className="prop-input"
                            placeholder="e.g., 0 2px 4px rgba(0,0,0,0.1)"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Section */}
                <div className="property-section">
                  <button
                    className="section-header"
                    onClick={() => toggleSection('actions')}
                  >
                    <span>Actions</span>
                    {expandedSections.actions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {expandedSections.actions && (
                    <div className="section-content">
                      <button
                        className="delete-component-btn"
                        onClick={() => deleteComponent(selectedComponent.id)}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        <Trash2 size={16} />
                        Delete Component
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="properties-empty">
              <p>Select a component to edit its properties</p>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="preview-modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-header">
              <h3>Page Preview - {page.name || 'Untitled Page'}</h3>
              <div className="preview-header-actions">
                <div className="preview-device-switcher">
                  <button
                    className={`device-btn ${deviceMode === 'desktop' ? 'active' : ''}`}
                    onClick={() => setDeviceMode('desktop')}
                    title="Desktop"
                  >
                    <Monitor size={18} />
                  </button>
                  <button
                    className={`device-btn ${deviceMode === 'tablet' ? 'active' : ''}`}
                    onClick={() => setDeviceMode('tablet')}
                    title="Tablet"
                  >
                    <Tablet size={18} />
                  </button>
                  <button
                    className={`device-btn ${deviceMode === 'mobile' ? 'active' : ''}`}
                    onClick={() => setDeviceMode('mobile')}
                    title="Mobile"
                  >
                    <Smartphone size={18} />
                  </button>
                </div>
                <button className="preview-close-btn" onClick={() => setShowPreview(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="preview-modal-content">
              {/* Inject generated CSS into the preview */}
              {generatedCSS && (
                <style dangerouslySetInnerHTML={{ __html: generatedCSS }} />
              )}
              <div
                className={`preview-frame preview-${deviceMode}`}
                style={{
                  width: deviceMode === 'desktop' ? '100%' : deviceMode === 'tablet' ? '768px' : '375px',
                  margin: '0 auto',
                  backgroundColor: 'var(--color-background, #f8fafc)',
                  minHeight: '600px',
                  borderRadius: '8px',
                  overflow: 'auto'
                }}
              >
                {/* Render page content with theme */}
                <div className="preview-page-content">
                  {page.title && (
                    <header className="preview-header" style={{ padding: '24px', borderBottom: '1px solid var(--color-border, #e2e8f0)' }}>
                      <h1 style={{ color: 'var(--color-text, #1e293b)', margin: 0 }}>{page.title}</h1>
                      {page.description && (
                        <p style={{ color: 'var(--color-text-secondary, #64748b)', marginTop: '8px' }}>{page.description}</p>
                      )}
                    </header>
                  )}
                  <main style={{ padding: '24px' }}>
                    {components.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-secondary, #64748b)' }}>
                        <p>No components on this page yet.</p>
                        <p>Add components from the left panel to see them in preview.</p>
                      </div>
                    ) : (
                      <div className="preview-components">
                        {components.map((component) => (
                          <div key={component.id} className="preview-component" style={{ marginBottom: '16px' }}>
                            {renderPreviewComponent(component)}
                          </div>
                        ))}
                      </div>
                    )}
                  </main>
                </div>
              </div>
            </div>
            {!generatedCSS && (
              <div className="preview-no-theme-notice">
                No theme applied. Select a theme when generating the application with ARES.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PageBuilderPro;
