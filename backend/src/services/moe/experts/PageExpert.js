/**
 * Page Expert
 * Generates pages individually or in batches
 */

const Anthropic = require('@anthropic-ai/sdk');

class PageExpert {
  constructor() {
    this.name = 'PageExpert';
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    // Component catalog - matches PageBuilderPro component palette (enhanced with Shadcn mappings)
    this.componentCatalog = {
      'Basic Elements': [
        { type: 'heading', description: 'Title or heading text', config: { text: 'Heading', variant: 'h1|h2|h3|h4' }, shadcn: { component: 'div', className: 'scroll-m-20 text-4xl font-extrabold tracking-tight' } },
        { type: 'text', description: 'Paragraph content', config: { text: 'Text content', variant: 'body|caption|subtitle' }, shadcn: { component: 'p', className: 'leading-7 [&:not(:first-child)]:mt-6' } },
        { type: 'button', description: 'Clickable button', config: { label: 'Button', variant: 'default|destructive|outline|secondary|ghost|link', icon: 'icon-name' }, shadcn: { component: 'Button', imports: ['Button'] } },
        { type: 'link', description: 'Navigation link', config: { text: 'Link text', href: '/route' }, shadcn: { component: 'Link', className: 'text-primary underline-offset-4 hover:underline' } },
        { type: 'image', description: 'Display image', config: { src: 'url', alt: 'description', width: '100%' }, shadcn: { component: 'AspectRatio', imports: ['AspectRatio'] } },
        { type: 'divider', description: 'Horizontal separator', config: {}, shadcn: { component: 'Separator', imports: ['Separator'] } },
        { type: 'spacer', description: 'Vertical spacing', config: { height: '24px' }, shadcn: { component: 'div', className: 'h-6' } }
      ],
      'Layout': [
        { type: 'container', description: 'Content wrapper - can contain children components', config: { padding: '16px', maxWidth: '1200px', children: [] }, shadcn: { component: 'div', className: 'container mx-auto px-4' } },
        { type: 'card', description: 'Content card - can contain children, actions', config: { title: 'Card Title', description: 'Description', shadow: 'sm|md|lg', hoverElevation: true, children: [], actions: [] }, shadcn: { component: 'Card', imports: ['Card', 'CardHeader', 'CardTitle', 'CardDescription', 'CardContent', 'CardFooter'], microInteractions: { hover: 'hover:shadow-lg transition-shadow duration-200' } } },
        { type: 'grid', description: 'Multi-column layout', config: { columns: 2|3|4, gap: '16px' }, shadcn: { component: 'div', className: 'grid grid-cols-{{columns}} gap-4' } },
        { type: 'section', description: 'Page section with title - can contain children', config: { title: 'Section Title', subtitle: 'Optional subtitle', padding: '32px', children: [] }, shadcn: { component: 'section', className: 'py-8 space-y-4' } },
        { type: 'header', description: 'Page header', config: { title: 'Page Header', sticky: false }, shadcn: { component: 'header', className: 'sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60' } },
        { type: 'footer', description: 'Page footer', config: { text: 'Footer content' }, shadcn: { component: 'footer', className: 'border-t py-6' } },
        { type: 'hero', description: 'Hero section with title, subtitle, and CTA buttons', config: { title: 'Welcome', subtitle: 'Description text', buttons: [{ label: 'Primary Action', variant: 'default' }, { label: 'Secondary Action', variant: 'outline' }] }, shadcn: { component: 'section', className: 'py-20 lg:py-32' } }
      ],
      'Navigation': [
        { type: 'navbar', description: 'Navigation bar', config: { brand: 'Brand', items: [{ label: 'Home', route: '/' }] }, shadcn: { component: 'NavigationMenu', imports: ['NavigationMenu', 'NavigationMenuList', 'NavigationMenuItem', 'NavigationMenuLink'] } },
        { type: 'breadcrumb', description: 'Breadcrumb trail', config: { items: ['Home', 'Page'] }, shadcn: { component: 'Breadcrumb', imports: ['Breadcrumb', 'BreadcrumbList', 'BreadcrumbItem', 'BreadcrumbLink', 'BreadcrumbSeparator'] } },
        {
          type: 'tabs',
          description: 'Tab navigation with nested content - tabs can contain forms, alerts, cards inside content array',
          config: {
            variant: 'underline|pills',
            orientation: 'horizontal|vertical',
            tabs: [
              { id: 'tab-id', label: 'Tab Label', icon: 'icon-name', content: [/* nested components */] }
            ]
          },
          shadcn: { component: 'Tabs', imports: ['Tabs', 'TabsList', 'TabsTrigger', 'TabsContent'] }
        },
        { type: 'buttonGroup', description: 'Group of buttons', config: { buttons: [{ label: 'Action', variant: 'default|outline' }] }, shadcn: { component: 'div', className: 'flex items-center gap-2' } }
      ],
      'Form Elements': [
        { type: 'input', description: 'Single line input', config: { label: 'Label', placeholder: 'Enter text...', type: 'text|email|password|number', required: false }, shadcn: { component: 'Input', imports: ['Input', 'Label'] } },
        { type: 'textarea', description: 'Multi-line input', config: { label: 'Label', placeholder: 'Enter text...', rows: 4 }, shadcn: { component: 'Textarea', imports: ['Textarea', 'Label'] } },
        { type: 'select', description: 'Dropdown select', config: { label: 'Label', options: [{ label: 'Option', value: '1' }] }, shadcn: { component: 'Select', imports: ['Select', 'SelectTrigger', 'SelectValue', 'SelectContent', 'SelectItem', 'Label'] } },
        { type: 'checkbox', description: 'Checkbox input', config: { label: 'Checkbox label' }, shadcn: { component: 'Checkbox', imports: ['Checkbox', 'Label'] } },
        { type: 'radio', description: 'Radio options', config: { label: 'Select one', options: [{ label: 'Option 1', value: '1' }] }, shadcn: { component: 'RadioGroup', imports: ['RadioGroup', 'RadioGroupItem', 'Label'] } },
        { type: 'toggle', description: 'Toggle switch for boolean settings', config: { label: 'Toggle label', name: 'settingName', defaultValue: false }, shadcn: { component: 'Switch', imports: ['Switch', 'Label'] } },
        { type: 'search', description: 'Search input', config: { placeholder: 'Search...' }, shadcn: { component: 'Input', imports: ['Input'], icon: 'Search' } }
      ],
      'Data Display': [
        { type: 'table', description: 'Data table', config: { columns: [{ key: 'name', label: 'Name' }], dataBinding: 'items' }, shadcn: { component: 'Table', imports: ['Table', 'TableHeader', 'TableBody', 'TableRow', 'TableHead', 'TableCell'] } },
        { type: 'stat-card', description: 'Metric display card for dashboards', config: { title: 'Metric', value: '{{value}}', icon: 'trending-up|users|package|clock', iconColor: 'primary|success|warning|error', trend: '+12%', trendDirection: 'up|down' }, shadcn: { component: 'Card', imports: ['Card', 'CardHeader', 'CardTitle', 'CardContent'], microInteractions: { hover: 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200' } } },
        { type: 'chart', description: 'Data visualization', config: { chartType: 'bar|line|pie|area', title: 'Chart', height: 300 }, shadcn: { component: 'ChartContainer', recharts: true } },
        { type: 'avatar', description: 'User avatar', config: { src: 'url', initials: 'JD', size: 'sm|md|lg' }, shadcn: { component: 'Avatar', imports: ['Avatar', 'AvatarImage', 'AvatarFallback'] } },
        { type: 'badge', description: 'Status badge', config: { text: 'Badge', variant: 'default|secondary|destructive|outline' }, shadcn: { component: 'Badge', imports: ['Badge'] } },
        {
          type: 'progress',
          description: 'Progress indicator - bar or wizard steps',
          config: {
            variant: 'bar|steps',
            value: 60,
            label: 'Progress',
            showPercent: true,
            steps: ['Step 1', 'Step 2', 'Step 3'],
            currentStep: 1
          },
          shadcn: { component: 'Progress', imports: ['Progress'] }
        },
        { type: 'skeleton', description: 'Loading placeholder', config: { width: '100%', height: '20px' }, shadcn: { component: 'Skeleton', imports: ['Skeleton'] } }
      ],
      'Feedback': [
        {
          type: 'alert',
          description: 'Alert/notification message',
          config: {
            variant: 'default|destructive',
            title: 'Alert Title',
            message: 'Alert message text',
            dismissible: true
          },
          shadcn: { component: 'Alert', imports: ['Alert', 'AlertTitle', 'AlertDescription'] }
        },
        {
          type: 'spinner',
          description: 'Loading spinner with optional label',
          config: {
            size: 'small|medium|large',
            label: 'Loading...'
          },
          shadcn: { component: 'div', className: 'animate-spin rounded-full border-2 border-muted border-t-primary' }
        },
        { type: 'accordion', description: 'Collapsible sections', config: { items: [{ title: 'Section 1', content: 'Content' }] }, shadcn: { component: 'Accordion', imports: ['Accordion', 'AccordionItem', 'AccordionTrigger', 'AccordionContent'] } },
        { type: 'toast', description: 'Toast notification', config: { title: 'Toast', description: 'Message' }, shadcn: { component: 'Toast', imports: ['useToast', 'Toaster'] } },
        { type: 'dialog', description: 'Modal dialog', config: { title: 'Dialog', description: 'Content' }, shadcn: { component: 'Dialog', imports: ['Dialog', 'DialogTrigger', 'DialogContent', 'DialogHeader', 'DialogTitle', 'DialogDescription', 'DialogFooter'] } }
      ],
      'Media': [
        { type: 'video', description: 'Video player', config: { src: 'url', poster: 'thumbnail-url', autoplay: false }, shadcn: { component: 'AspectRatio', imports: ['AspectRatio'] } },
        { type: 'carousel', description: 'Image carousel', config: { images: ['url1', 'url2'], autoSlide: true, interval: 5000 }, shadcn: { component: 'Carousel', imports: ['Carousel', 'CarouselContent', 'CarouselItem', 'CarouselPrevious', 'CarouselNext'] } }
      ],
      'Forms': [
        {
          type: 'form',
          description: 'Form reference ONLY - NEVER create input/button/textarea directly in pages! Use formRef to link to existing forms created by FormExpert',
          config: { title: 'Optional form title' },
          formRef: 'existing-form-id',
          example: { type: 'form', formRef: 'user-registration-form', config: { title: 'Sign Up' } },
          shadcn: { component: 'Form', imports: ['Form', 'FormItem', 'FormLabel', 'FormControl', 'FormDescription', 'FormMessage'] }
        }
      ],
      'Interactive': [
        { type: 'dropdown-menu', description: 'Dropdown menu with actions', config: { trigger: 'Menu', items: [{ label: 'Item', action: 'action' }] }, shadcn: { component: 'DropdownMenu', imports: ['DropdownMenu', 'DropdownMenuTrigger', 'DropdownMenuContent', 'DropdownMenuItem'] } },
        { type: 'popover', description: 'Popover with content', config: { trigger: 'Info', content: 'Popover content' }, shadcn: { component: 'Popover', imports: ['Popover', 'PopoverTrigger', 'PopoverContent'] } },
        { type: 'tooltip', description: 'Hover tooltip', config: { content: 'Tooltip text' }, shadcn: { component: 'Tooltip', imports: ['Tooltip', 'TooltipTrigger', 'TooltipContent', 'TooltipProvider'] } },
        { type: 'sheet', description: 'Side sheet/drawer', config: { title: 'Sheet', side: 'right' }, shadcn: { component: 'Sheet', imports: ['Sheet', 'SheetTrigger', 'SheetContent', 'SheetHeader', 'SheetTitle', 'SheetDescription'] } }
      ]
    };

    // Shadcn micro-interaction classes
    this.microInteractions = {
      button: {
        press: 'active:scale-95 transition-transform duration-100',
        hover: 'hover:bg-primary/90 transition-colors duration-200'
      },
      card: {
        hover: 'hover:shadow-lg transition-shadow duration-200',
        hoverLift: 'hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200'
      },
      input: {
        focus: 'focus:border-primary focus:ring-2 focus:ring-ring transition-all'
      }
    };
  }

  /**
   * Get formatted component catalog for prompts
   */
  getComponentCatalogPrompt() {
    let catalog = '**AVAILABLE PAGE COMPONENTS** (use ONLY these types):\n\n';

    for (const [category, components] of Object.entries(this.componentCatalog)) {
      catalog += `**${category}**:\n`;
      for (const comp of components) {
        const configKeys = Object.keys(comp.config).join(', ');
        catalog += `- \`${comp.type}\`: ${comp.description}\n`;
        catalog += `  Config: { ${configKeys} }\n`;
      }
      catalog += '\n';
    }

    return catalog;
  }

  /**
   * Check if error is a network/connection error that should trigger retry
   */
  isNetworkError(error) {
    const networkErrorCodes = [
      'ENOTFOUND', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT',
      'ENETUNREACH', 'EHOSTUNREACH', 'EPIPE', 'EAI_AGAIN',
      'CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
    ];
    const errorCode = error.code || error.cause?.code;
    if (errorCode && networkErrorCodes.includes(errorCode)) return true;
    if (error.name === 'APIConnectionError' ||
        error.message?.includes('Connection error') ||
        error.message?.includes('fetch failed') ||
        error.message?.includes('ENOTFOUND') ||
        error.message?.includes('getaddrinfo')) return true;
    return false;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute API call with network retry and exponential backoff
   */
  async executeWithNetworkRetry(apiCall, maxRetries = 3, baseDelayMs = 1000) {
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error;
        if (this.isNetworkError(error)) {
          const delay = baseDelayMs * Math.pow(2, attempt - 1);
          console.warn(`[${this.name}] Network error on attempt ${attempt}/${maxRetries}: ${error.message}`);
          if (attempt < maxRetries) {
            console.log(`[${this.name}] Retrying in ${delay}ms...`);
            await this.sleep(delay);
          } else {
            console.error(`[${this.name}] All ${maxRetries} network retry attempts failed`);
          }
        } else {
          throw error;
        }
      }
    }
    throw lastError;
  }

  /**
   * Generate a single page
   */
  async generateSingle(spec, componentPlan, existingComponents) {
    console.log(`[PageExpert] Generating page: ${spec.name}...`);

    const prompt = this.buildSinglePrompt(spec, componentPlan, existingComponents);

    const response = await this.executeWithNetworkRetry(async () => {
      return await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
    });

    // Check for truncation
    if (response.stop_reason === 'max_tokens') {
      console.warn(`[PageExpert] Response truncated for ${spec.name}, retrying with stricter constraints...`);
      return await this.generateSimplifiedPage(spec, componentPlan, existingComponents);
    }

    const pageText = response.content[0].text;
    const page = this.parsePage(pageText);

    // Preserve pageAssociation metadata for later linking by ComponentOrchestrator
    if (spec.pageAssociation) {
      page._pageAssociation = spec.pageAssociation;
      page._specName = spec.name; // Original spec name for matching
    }

    console.log(`[PageExpert] Generated page: ${page.name}`);
    return page;
  }

  /**
   * Generate a simplified page when main generation is truncated
   */
  async generateSimplifiedPage(spec, componentPlan, existingComponents) {
    console.log(`[PageExpert] Generating SIMPLIFIED page: ${spec.name}...`);

    const simplifiedPrompt = `Generate a MINIMAL page for: ${spec.name}

Purpose: ${spec.purpose}

STRICT CONSTRAINTS:
- MAX 3 components only across all sections
- Use minimal config
- Keep descriptions to 1 sentence
- Include basic navigation if applicable

Return ONLY valid JSON:
{
  "id": "page-id",
  "name": "${spec.name}",
  "title": "Page Title",
  "description": "One sentence",
  "route": "/${spec.name.toLowerCase().replace(/\s+/g, '-')}",
  "type": "list|detail|form|dashboard",
  "platform": "both",
  "sections": [
    {
      "id": "header",
      "type": "header",
      "components": [
        {
          "type": "text",
          "config": {
            "text": "${spec.name}",
            "variant": "h1"
          }
        }
      ]
    },
    {
      "id": "main",
      "type": "main",
      "components": [
        {
          "type": "card|table|form",
          "config": {
            "title": "Content"
          }
        }
      ]
    }
  ],
  "navigation": {
    "onAction": {},
    "menu": []
  },
  "layout": {
    "type": "single-column",
    "responsive": true
  }
}`;

    const response = await this.executeWithNetworkRetry(async () => {
      return await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8000,
        temperature: 0.2,
        messages: [{
          role: 'user',
          content: simplifiedPrompt
        }]
      });
    });

    const pageText = response.content[0].text;
    const page = this.parsePage(pageText);

    console.log(`[PageExpert] Generated simplified page: ${page.name}`);
    return page;
  }

  /**
   * Generate multiple pages in one call (for parallel strategy)
   */
  async generateBatch(specs, componentPlan, existingComponents = {}) {
    if (specs.length === 0) return [];
    if (specs.length === 1) return [await this.generateSingle(specs[0], componentPlan, existingComponents)];

    console.log(`[PageExpert] Generating ${specs.length} pages in batch...`);

    const prompt = this.buildBatchPrompt(specs, componentPlan, existingComponents);

    const response = await this.executeWithNetworkRetry(async () => {
      return await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
    });

    const pagesText = response.content[0].text;
    const pages = this.parsePages(pagesText);

    // Build spec map for matching back associations
    const specMap = new Map();
    specs.forEach(spec => {
      specMap.set(spec.name.toLowerCase(), spec);
      specMap.set(spec.name.toLowerCase().replace(/[^a-z0-9]/g, ''), spec);
    });

    // Attach _pageAssociation metadata to each generated page
    pages.forEach(page => {
      const normalizedName = page.name?.toLowerCase() || '';
      const normalizedNoSpecial = normalizedName.replace(/[^a-z0-9]/g, '');

      // Try to find matching spec
      let matchingSpec = specMap.get(normalizedName) || specMap.get(normalizedNoSpecial);

      // Fallback: fuzzy match
      if (!matchingSpec) {
        for (const [key, spec] of specMap.entries()) {
          if (normalizedName.includes(key) || key.includes(normalizedName)) {
            matchingSpec = spec;
            break;
          }
        }
      }

      if (matchingSpec && matchingSpec.pageAssociation) {
        page._pageAssociation = matchingSpec.pageAssociation;
        page._specName = matchingSpec.name;
      }
    });

    console.log(`[PageExpert] Generated ${pages.length} pages`);
    return pages;
  }

  buildSinglePrompt(spec, componentPlan, existingComponents) {
    // Extract available pages for navigation
    const otherPages = componentPlan.componentSpecs
      .filter(c => c.type === 'page' && c.name !== spec.name)
      .map(p => ({ name: p.name, route: `/${p.name.toLowerCase().replace(/\s+/g, '-')}` }));

    // Extract design system if available
    const designSystem = componentPlan.designSystem;
    const designGuidelines = designSystem ? this.formatDesignGuidelines(designSystem) : '';

    // Extract page association context from spec (for plan-based linking)
    const pageAssociation = spec.pageAssociation || {};
    const associationContext = pageAssociation.forWorkflow || pageAssociation.pageType ? `
**PAGE ASSOCIATION CONTEXT**:
- For Workflow: ${pageAssociation.forWorkflow || 'N/A'}
- Page Type: ${pageAssociation.pageType || 'list'}
${pageAssociation.displaysForms && pageAssociation.displaysForms.length > 0 ? `- Displays Forms: ${pageAssociation.displaysForms.join(', ')}` : ''}
${pageAssociation.displaysDataModels && pageAssociation.displaysDataModels.length > 0 ? `- Displays Data Models: ${pageAssociation.displaysDataModels.join(', ')}` : ''}
${pageAssociation.navigationFlow ? `- Navigation Flow: Previous=${pageAssociation.navigationFlow.previousPage || 'None'}, Next=${pageAssociation.navigationFlow.nextPage || 'None'}` : ''}

IMPORTANT: Design this page specifically for its role in the application:
${pageAssociation.pageType === 'dashboard' ? '- This is a DASHBOARD page - show summary metrics, charts, and quick actions.' : ''}
${pageAssociation.pageType === 'list' ? '- This is a LIST page - display a table/list of items with search, filter, and CRUD actions.' : ''}
${pageAssociation.pageType === 'detail' ? '- This is a DETAIL page - show full details of a single item with edit/delete options.' : ''}
${pageAssociation.pageType === 'form' ? '- This is a FORM page - embed a form for data entry or editing.' : ''}
${pageAssociation.pageType === 'report' ? '- This is a REPORT page - display charts, analytics, and data summaries.' : ''}
` : '';

    // Get component catalog
    const componentCatalog = this.getComponentCatalogPrompt();

    return `You are an EXPERT UX/UI DESIGNER with 15+ years of experience designing world-class applications.

**YOUR DESIGN PHILOSOPHY**:
You follow the design principles of the world's best design teams:

**Apple Human Interface Guidelines**:
- Clarity: Text is legible, icons are precise, adornments are subtle and appropriate
- Deference: Fluid motion and crisp interface help understand content without competing with it
- Depth: Visual layers and realistic motion convey hierarchy and facilitate understanding

**Google Material Design**:
- Material is the metaphor: Surfaces and edges provide visual cues grounded in reality
- Bold, graphic, intentional: Typography, grids, space, scale, color create hierarchy and meaning
- Motion provides meaning: Attention is focused and continuity is maintained through subtle feedback

**Meta (Facebook) Design Principles**:
- Universal: Design for a diverse, global audience with accessibility in mind
- Human: Warm, approachable interfaces that feel personal not robotic
- Clean: Remove unnecessary elements, every pixel should have a purpose
- Consistent: Familiar patterns reduce cognitive load

**YOUR DESIGN STANDARDS**:
- White space is not wasted space - use generous padding and margins
- Visual hierarchy through size, weight, and color contrast
- Group related elements, separate unrelated ones
- Consistent alignment and grid-based layouts
- Subtle shadows and elevation for depth (not flat, not skeuomorphic)
- Smooth micro-interactions and state transitions
- Touch-friendly tap targets (min 44px)
- Accessible color contrast (WCAG AA minimum)
- Progressive disclosure - show what's needed, hide complexity
- Clear visual feedback for all interactive elements

---

Generate a page for: ${spec.name}

Purpose: ${spec.purpose}
${spec.description ? `Description: ${spec.description}` : ''}
${associationContext}
Context:
- Application: ${componentPlan.overview.name}
- Domain: ${componentPlan.overview.category || 'General'}
${existingComponents.dataModels ? `- Available data models: ${existingComponents.dataModels.map(dm => dm.name).join(', ')}` : ''}
${existingComponents.forms ? `- Available forms: ${existingComponents.forms.map(f => `${f.name} (ID: ${f.id})`).join(', ')}` : ''}
${existingComponents.workflows ? `- Available workflows: ${existingComponents.workflows.map(w => w.name).join(', ')}` : ''}
${otherPages.length > 0 ? `- Other pages in app: ${otherPages.map(p => p.name).join(', ')}` : ''}

${componentCatalog}

${designGuidelines}

CRITICAL Requirements:
1. **USE ONLY CATALOG COMPONENTS**: Only use component types listed in the AVAILABLE PAGE COMPONENTS section above
2. **POPULATE FORMS ARRAY**: Add relevant form IDs to the "forms" array based on page purpose (e.g., list pages get create forms, detail pages get edit forms)
3. **ADD NAVIGATION**: Include navigation.menu with links to other pages in the app
4. Structure pages using SECTIONS (header, main, footer) with components inside sections
5. **NEVER DUPLICATE FORM FIELDS**: If a page needs a form, use ONLY { "type": "form", "formRef": "existing-form-id" }. NEVER create input/textarea/select/button components directly in the page - those belong in forms only!
6. Include actual content in components (text, labels, data bindings)
7. Use appropriate page type (list, detail, form, dashboard, auth, confirmation)
${designSystem ? '8. CRITICAL: Apply the design system specifications above to ALL styling properties' : ''}

**MODERN PAGE DESIGN PATTERNS**:

**For DASHBOARD pages**, use this structure:
{
  "sections": [
    {
      "id": "stats",
      "type": "stats-row",
      "layout": "grid-4",
      "components": [
        { "type": "stat-card", "config": { "title": "Total Items", "value": "{{totalCount}}", "icon": "package", "iconColor": "primary", "trend": "+12%", "trendDirection": "up" } },
        { "type": "stat-card", "config": { "title": "Pending", "value": "{{pendingCount}}", "icon": "clock", "iconColor": "warning" } },
        { "type": "stat-card", "config": { "title": "Completed", "value": "{{completedCount}}", "icon": "check-circle", "iconColor": "success" } },
        { "type": "stat-card", "config": { "title": "Active Users", "value": "{{activeUsers}}", "icon": "users", "iconColor": "primary" } }
      ]
    },
    {
      "id": "main",
      "type": "two-column",
      "components": [
        { "type": "chart", "config": { "chartType": "line", "title": "Activity Overview", "height": 300 } },
        { "type": "activity-feed", "config": { "title": "Recent Activity", "limit": 5 } }
      ]
    },
    {
      "id": "actions",
      "type": "quick-actions",
      "components": [
        { "type": "button", "config": { "label": "Create New", "variant": "primary", "icon": "plus" } },
        { "type": "button", "config": { "label": "View Reports", "variant": "secondary", "icon": "chart-bar" } }
      ]
    }
  ]
}

**For LIST pages**, use card grids with hover effects:
{
  "sections": [
    {
      "id": "header",
      "type": "header",
      "components": [
        { "type": "text", "config": { "text": "Items", "variant": "h1" } },
        { "type": "button", "config": { "label": "Add New", "variant": "primary", "icon": "plus" } }
      ]
    },
    {
      "id": "main",
      "type": "card-grid",
      "layout": "grid-3",
      "components": [
        {
          "type": "card",
          "config": {
            "title": "{{item.name}}",
            "description": "{{item.description}}",
            "footer": "{{item.date}}",
            "actions": [{ "label": "View", "icon": "eye" }, { "label": "Edit", "icon": "edit" }]
          },
          "style": { "shadow": "md", "hoverElevation": true, "borderRadius": "lg" },
          "dataBinding": "items"
        }
      ]
    }
  ]
}

**For TABBED FORM pages** (multi-step, settings, profiles):
{
  "sections": [
    {
      "id": "header",
      "type": "header",
      "components": [
        { "type": "heading", "config": { "text": "User Profile", "variant": "h1" } },
        { "type": "text", "config": { "text": "Manage your account settings", "variant": "subtitle" } }
      ]
    },
    {
      "id": "tabs-section",
      "type": "tabs",
      "components": [
        {
          "type": "tabs",
          "config": {
            "variant": "underline",
            "tabs": [
              {
                "id": "personal",
                "label": "Personal Info",
                "icon": "user",
                "content": [
                  { "type": "form", "formRef": "personal-info-form", "config": { "title": "Personal Information" } },
                  { "type": "button", "config": { "label": "Save Changes", "variant": "primary" } }
                ]
              },
              {
                "id": "security",
                "label": "Security",
                "icon": "shield",
                "content": [
                  { "type": "alert", "config": { "variant": "info", "title": "Two-Factor Authentication", "message": "Enhance your account security" } },
                  { "type": "form", "formRef": "security-form", "config": { "title": "Password & Security" } }
                ]
              },
              {
                "id": "notifications",
                "label": "Notifications",
                "icon": "bell",
                "content": [
                  { "type": "form", "formRef": "notification-settings-form", "config": { "title": "Notification Preferences" } }
                ]
              }
            ]
          }
        }
      ]
    }
  ]
}

**For WIZARD/MULTI-STEP pages** with progress:
{
  "sections": [
    {
      "id": "header",
      "type": "header",
      "components": [
        { "type": "heading", "config": { "text": "Create New Order", "variant": "h1" } }
      ]
    },
    {
      "id": "progress-section",
      "type": "progress",
      "components": [
        {
          "type": "progress",
          "config": {
            "variant": "steps",
            "steps": ["Customer Info", "Order Details", "Payment", "Confirmation"],
            "currentStep": 1
          }
        }
      ]
    },
    {
      "id": "step-content",
      "type": "main",
      "components": [
        { "type": "form", "formRef": "customer-info-form", "config": { "title": "Customer Information" } }
      ]
    },
    {
      "id": "navigation",
      "type": "footer",
      "components": [
        { "type": "button", "config": { "label": "Back", "variant": "secondary" } },
        { "type": "button", "config": { "label": "Continue", "variant": "primary" } }
      ]
    }
  ]
}

**For DETAIL pages** with alerts and status:
{
  "sections": [
    {
      "id": "status-alerts",
      "type": "alerts",
      "components": [
        { "type": "alert", "config": { "variant": "success", "title": "Order Confirmed", "message": "Your order has been successfully placed", "dismissible": true } }
      ]
    },
    {
      "id": "header",
      "type": "header",
      "components": [
        { "type": "heading", "config": { "text": "Order #{{orderId}}", "variant": "h1" } },
        { "type": "badge", "config": { "text": "{{status}}", "variant": "success" } }
      ]
    },
    {
      "id": "loading-state",
      "type": "conditional",
      "showWhen": "isLoading",
      "components": [
        { "type": "spinner", "config": { "size": "large", "label": "Loading order details..." } }
      ]
    },
    {
      "id": "main",
      "type": "two-column",
      "components": [
        {
          "type": "card",
          "config": {
            "title": "Order Summary",
            "children": [
              { "type": "table", "config": { "columns": ["Item", "Qty", "Price"], "dataBinding": "orderItems" } }
            ]
          }
        },
        {
          "type": "card",
          "config": {
            "title": "Customer Details",
            "children": [
              { "type": "text", "config": { "text": "{{customer.name}}", "variant": "body" } },
              { "type": "text", "config": { "text": "{{customer.email}}", "variant": "caption" } }
            ]
          }
        }
      ]
    }
  ]
}

**For SETTINGS pages** with toggles and sections:
{
  "sections": [
    {
      "id": "header",
      "type": "header",
      "components": [
        { "type": "heading", "config": { "text": "Settings", "variant": "h1" } }
      ]
    },
    {
      "id": "tabs-section",
      "type": "tabs",
      "components": [
        {
          "type": "tabs",
          "config": {
            "variant": "pills",
            "orientation": "vertical",
            "tabs": [
              {
                "id": "general",
                "label": "General",
                "icon": "settings",
                "content": [
                  { "type": "card", "config": { "title": "Application Settings", "children": [
                    { "type": "toggle", "config": { "label": "Dark Mode", "name": "darkMode" } },
                    { "type": "toggle", "config": { "label": "Notifications", "name": "notifications" } },
                    { "type": "select", "config": { "label": "Language", "options": ["English", "Spanish", "French"] } }
                  ]}}
                ]
              },
              {
                "id": "integrations",
                "label": "Integrations",
                "icon": "plug",
                "content": [
                  { "type": "alert", "config": { "variant": "warning", "title": "API Key Required", "message": "Some integrations require an API key" } },
                  { "type": "card", "config": { "title": "Connected Services", "children": [
                    { "type": "table", "config": { "columns": ["Service", "Status", "Actions"], "dataBinding": "integrations" } }
                  ]}}
                ]
              }
            ]
          }
        }
      ]
    },
    {
      "id": "save-section",
      "type": "footer",
      "components": [
        { "type": "button", "config": { "label": "Save All Settings", "variant": "primary", "fullWidth": false } }
      ]
    }
  ]
}

**COMPONENT NESTING RULES**:
IMPORTANT: Use "children" arrays to nest components within containers for rich layouts.

- **container**: Wrapper component that can hold any children. Use for grouping related components:
  { "type": "container", "config": { "padding": "24px", "children": [
    { "type": "heading", "config": { "text": "Section Title", "variant": "h2" } },
    { "type": "text", "config": { "text": "Description text here" } },
    { "type": "button", "config": { "label": "Action", "variant": "primary" } }
  ] } }

- **section**: Page section that can contain children. Use for major page divisions:
  { "type": "section", "config": { "padding": "32px", "children": [
    { "type": "stat-card", "config": { "title": "Users", "value": "1,234" } },
    { "type": "chart", "config": { "chartType": "bar", "title": "Analytics" } }
  ] } }

- **card**: Content card with children array for nested content:
  { "type": "card", "config": { "title": "Card Title", "shadow": "md", "children": [
    { "type": "text", "config": { "text": "Card content" } },
    { "type": "input", "config": { "label": "Email", "type": "email" } },
    { "type": "button", "config": { "label": "Submit", "variant": "primary" } }
  ], "actions": [{ "label": "Save", "action": "submit" }] } }

- **tabs**: Nested content inside each tab's "content" array:
  { "type": "tabs", "config": { "variant": "underline", "tabs": [
    { "id": "tab1", "label": "Overview", "content": [
      { "type": "stat-card", "config": { "title": "Total", "value": "500" } }
    ] },
    { "id": "tab2", "label": "Settings", "content": [
      { "type": "toggle", "config": { "label": "Notifications", "name": "notify" } }
    ] }
  ] } }

- **form**: Reference forms using "formRef" to embed full form definitions
  CRITICAL: ONLY use { "type": "form", "formRef": "form-id" } - NEVER create input/textarea/select/checkbox/radio/button components in pages!
  Example: { "type": "form", "formRef": "login-form", "config": { "title": "Sign In" } }
- **progress**: Use variant "steps" for wizards with "steps" array and "currentStep"
- **spinner**: Use "size" (small|medium|large) and optional "label"
- **alert**: Use "variant" (info|success|warning|error), "title", "message", "dismissible"
- **toggle**: For boolean settings with "label" and "name"

- **hero**: Hero sections MUST use "buttons" array for CTA buttons:
  { "type": "hero", "config": {
    "title": "Why Join Us?",
    "subtitle": "Start your journey today",
    "buttons": [
      { "label": "Create Account", "variant": "primary" },
      { "label": "Learn More", "variant": "secondary" }
    ]
  } }

- **section**: Sections can have titles and subtitles displayed above their children:
  { "type": "section", "config": {
    "title": "Features",
    "subtitle": "What we offer",
    "padding": "32px",
    "children": [
      { "type": "card", "config": { "title": "Feature 1" } },
      { "type": "card", "config": { "title": "Feature 2" } }
    ]
  } }

ALWAYS use children arrays when you need to group multiple components together!

**Style Guidelines (Material/Tailwind)**:
- Shadows: Use "shadow": "sm|md|lg" for depth
- Border radius: "borderRadius": "md" (8px) for cards, "lg" (12px) for modals
- Hover effects: "hoverElevation": true for interactive cards
- Spacing: Use consistent 16px/24px/32px scale
- Transitions: All interactive elements should have smooth transitions

Return ONLY valid JSON in this format:
{
  "id": "unique-id",
  "name": "${spec.name}",
  "title": "Page Title",
  "description": "Brief description",
  "route": "/${spec.name.toLowerCase().replace(/\s+/g, '-')}",
  "type": "list|detail|form|dashboard|auth|confirmation",
  "platform": "both",
  "forms": ["relevant-form-id-1", "relevant-form-id-2"],
  "sections": [
    {
      "id": "header",
      "type": "header",
      "components": [
        {
          "type": "text",
          "config": {
            "text": "Page Title",
            "variant": "h1"
          }
        }
      ]
    },
    {
      "id": "main",
      "type": "main",
      "components": [
        {
          "type": "card|table|form|button|list",
          "config": {
            "title": "Component Title"
          },
          "dataBinding": "modelName.query",
          "formRef": "form-id-if-applicable"
        }
      ]
    }
  ],
  "navigation": {
    "onAction": {
      "submit": { "type": "navigate", "target": "/target-page-route" },
      "view": { "type": "navigate", "target": "/details-page" }
    },
    "menu": [
      { "label": "Other Page", "route": "/other-page" },
      { "label": "Dashboard", "route": "/dashboard" }
    ]
  },
  "layout": {
    "type": "single-column|two-column|grid|dashboard",
    "responsive": true,
    "spacing": "normal"
  }
}`;
  }

  buildBatchPrompt(specs, componentPlan, existingComponents = {}) {
    // Build detailed spec list with association context
    const specList = specs.map(s => {
      const assoc = s.pageAssociation || {};
      let specInfo = `- ${s.name}: ${s.purpose}`;
      if (assoc.forWorkflow) {
        specInfo += `\n    For Workflow: ${assoc.forWorkflow}`;
      }
      if (assoc.pageType) {
        specInfo += `\n    Page Type: ${assoc.pageType}`;
      }
      if (assoc.displaysForms && assoc.displaysForms.length > 0) {
        specInfo += `\n    Displays Forms: ${assoc.displaysForms.join(', ')}`;
      }
      if (assoc.displaysDataModels && assoc.displaysDataModels.length > 0) {
        specInfo += `\n    Displays Data Models: ${assoc.displaysDataModels.join(', ')}`;
      }
      if (assoc.navigationFlow) {
        specInfo += `\n    Nav Flow: Prev=${assoc.navigationFlow.previousPage || 'None'}, Next=${assoc.navigationFlow.nextPage || 'None'}`;
      }
      return specInfo;
    }).join('\n');

    const allPageNames = specs.map(s => s.name);

    // Extract design system if available
    const designSystem = componentPlan.designSystem;
    const designGuidelines = designSystem ? this.formatDesignGuidelines(designSystem) : '';

    // Get component catalog
    const componentCatalog = this.getComponentCatalogPrompt();

    return `You are an EXPERT UX/UI DESIGNER with 15+ years of experience designing world-class applications.

**YOUR DESIGN PHILOSOPHY**:
You follow the design principles of the world's best design teams:

**Apple Human Interface Guidelines**:
- Clarity: Text is legible, icons are precise, adornments are subtle and appropriate
- Deference: Fluid motion and crisp interface help understand content without competing with it
- Depth: Visual layers and realistic motion convey hierarchy and facilitate understanding

**Google Material Design**:
- Material is the metaphor: Surfaces and edges provide visual cues grounded in reality
- Bold, graphic, intentional: Typography, grids, space, scale, color create hierarchy and meaning
- Motion provides meaning: Attention is focused and continuity is maintained through subtle feedback

**Meta (Facebook) Design Principles**:
- Universal: Design for a diverse, global audience with accessibility in mind
- Human: Warm, approachable interfaces that feel personal not robotic
- Clean: Remove unnecessary elements, every pixel should have a purpose
- Consistent: Familiar patterns reduce cognitive load

**YOUR DESIGN STANDARDS**:
- White space is not wasted space - use generous padding and margins
- Visual hierarchy through size, weight, and color contrast
- Group related elements, separate unrelated ones
- Consistent alignment and grid-based layouts
- Subtle shadows and elevation for depth (not flat, not skeuomorphic)
- Smooth micro-interactions and state transitions
- Touch-friendly tap targets (min 44px)
- Accessible color contrast (WCAG AA minimum)
- Progressive disclosure - show what's needed, hide complexity
- Clear visual feedback for all interactive elements

---

Generate ${specs.length} pages for: ${componentPlan.overview.name}

Pages to generate (with their workflow/form associations):
${specList}

${componentCatalog}

${designGuidelines}

**COMPONENT NESTING - USE CHILDREN ARRAYS**:
IMPORTANT: Use "children" arrays to create rich nested layouts.

- **container**: { "type": "container", "config": { "padding": "24px", "children": [components...] } }
- **section**: Sections have title/subtitle displayed ABOVE children:
  { "type": "section", "config": { "title": "Section Title", "subtitle": "Description", "padding": "32px", "children": [components...] } }
- **card**: { "type": "card", "config": { "title": "Title", "children": [components...], "actions": [...] } }
- **tabs**: { "type": "tabs", "config": { "tabs": [{ "id": "t1", "label": "Tab", "content": [components...] }] } }
- **hero**: Hero sections MUST use "buttons" array for CTA buttons:
  { "type": "hero", "config": { "title": "Why Join Us?", "subtitle": "Description", "buttons": [{ "label": "Create Account", "variant": "primary" }, { "label": "Learn More", "variant": "secondary" }] } }

Example nested structure:
{ "type": "card", "config": { "title": "Settings", "shadow": "md", "children": [
  { "type": "heading", "config": { "text": "Preferences", "variant": "h3" } },
  { "type": "toggle", "config": { "label": "Notifications", "name": "notify" } },
  { "type": "toggle", "config": { "label": "Dark Mode", "name": "darkMode" } },
  { "type": "button", "config": { "label": "Save", "variant": "primary" } }
] } }

Context:
${existingComponents.forms ? `- Available forms: ${existingComponents.forms.map(f => `${f.name} (ID: ${f.id})`).join(', ')}` : '- No forms available yet'}
${existingComponents.dataModels ? `- Available data models: ${existingComponents.dataModels.map(dm => dm.name).join(', ')}` : ''}

CRITICAL Requirements for EACH page:
1. **USE ONLY CATALOG COMPONENTS**: Only use component types listed in the AVAILABLE PAGE COMPONENTS section above
2. **POPULATE FORMS ARRAY**: Add relevant form IDs to the "forms" array (list pages get create forms, detail pages get edit forms)
3. **ADD NAVIGATION MENU**: Include navigation.menu with links to ALL other pages in the app
4. Structure with SECTIONS (header, main) containing components
5. Include actual content in components (not empty)
6. **NEVER DUPLICATE FORM FIELDS**: If a page needs a form, use ONLY { "type": "form", "formRef": "existing-form-id" }. NEVER create input/textarea/select/button components directly in the page - those belong in forms only!
7. Use appropriate page types (list, detail, form, dashboard, auth, confirmation)
${designSystem ? '8. CRITICAL: Apply the design system specifications above to ALL styling properties' : ''}

Available pages for navigation: ${allPageNames.join(', ')}

Return ONLY valid JSON array:
[
  {
    "id": "unique-id",
    "name": "PageName",
    "title": "Page Title",
    "description": "Brief description",
    "route": "/page-name",
    "type": "list|detail|form|dashboard|auth|confirmation",
    "platform": "both",
    "forms": ["form-id-1", "form-id-2"],
    "sections": [
      {
        "id": "header",
        "type": "header",
        "components": [{ "type": "text", "config": { "text": "Title", "variant": "h1" } }]
      },
      {
        "id": "main",
        "type": "main",
        "components": [{ "type": "card|table|form", "config": { "title": "Content" }, "dataBinding": "model.query" }]
      }
    ],
    "navigation": {
      "onAction": {
        "action": { "type": "navigate", "target": "/other-page" }
      },
      "menu": [
        { "label": "Page 1", "route": "/page-1" },
        { "label": "Page 2", "route": "/page-2" }
      ]
    },
    "layout": {
      "type": "single-column|grid|dashboard",
      "responsive": true,
      "spacing": "normal"
    }
  }
]`;
  }

  parsePage(text) {
    try {
      // Extract JSON from markdown code blocks if present
      let jsonText = text.trim();
      if (jsonText.includes('```json')) {
        const match = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) jsonText = match[1].trim();
      } else if (jsonText.includes('```')) {
        const match = jsonText.match(/```\s*([\s\S]*?)\s*```/);
        if (match) jsonText = match[1].trim();
      }

      // Find JSON object
      if (!jsonText.startsWith('{')) {
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) jsonText = jsonMatch[0];
      }

      // Try to repair common JSON issues
      jsonText = this.repairJSON(jsonText);

      return JSON.parse(jsonText);
    } catch (error) {
      console.error('[PageExpert] Parse error:', error);
      console.error('[PageExpert] Text:', text.substring(0, 500));
      // Return fallback instead of throwing
      console.warn('[PageExpert] Returning fallback page');
      return this.createFallbackPage();
    }
  }

  /**
   * Create fallback page when parsing fails
   */
  createFallbackPage() {
    return {
      id: `page_fallback_${Date.now()}`,
      name: 'GeneratedPage',
      title: 'Generated Page',
      description: 'Auto-generated page',
      route: '/generated-page',
      type: 'list',
      platform: 'both',
      forms: [],
      sections: [
        {
          id: 'header',
          type: 'header',
          components: [{ type: 'text', config: { text: 'Generated Page', variant: 'h1' } }]
        },
        {
          id: 'main',
          type: 'main',
          components: [{ type: 'card', config: { title: 'Content' } }]
        }
      ],
      navigation: { onAction: {}, menu: [] },
      layout: { type: 'single-column', responsive: true, spacing: 'normal' }
    };
  }

  parsePages(text) {
    try {
      let jsonText = text.trim();
      if (jsonText.includes('```json')) {
        const match = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) jsonText = match[1].trim();
      } else if (jsonText.includes('```')) {
        const match = jsonText.match(/```\s*([\s\S]*?)\s*```/);
        if (match) jsonText = match[1].trim();
      }

      // Find JSON array
      if (!jsonText.startsWith('[')) {
        const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
        if (jsonMatch) jsonText = jsonMatch[0];
      }

      // Attempt to repair common JSON issues
      jsonText = this.repairJSON(jsonText);

      return JSON.parse(jsonText);
    } catch (error) {
      console.error('[PageExpert] Parse error:', error);

      // Enhanced error logging with context
      if (error.message.includes('position')) {
        const posMatch = error.message.match(/position (\d+)/);
        if (posMatch) {
          const position = parseInt(posMatch[1]);
          const start = Math.max(0, position - 200);
          const end = Math.min(text.length, position + 200);
          const context = text.substring(start, end);

          console.error('[PageExpert] Error context (200 chars before/after):');
          console.error(context);
          console.error('[PageExpert] Error position marker:', ' '.repeat(Math.min(200, position - start)) + '^');
        }
      }

      console.error('[PageExpert] Full response length:', text.length);
      console.error('[PageExpert] First 1000 chars:', text.substring(0, 1000));
      console.error('[PageExpert] Last 1000 chars:', text.substring(Math.max(0, text.length - 1000)));

      // Return fallback instead of throwing
      console.warn('[PageExpert] Returning fallback pages array');
      return [this.createFallbackPage()];
    }
  }

  /**
   * Attempt to repair common JSON formatting issues
   */
  repairJSON(jsonText) {
    let repaired = jsonText;

    // Remove trailing commas before closing brackets/braces
    repaired = repaired.replace(/,(\s*[\]}])/g, '$1');

    // Fix missing commas between array elements
    repaired = repaired.replace(/\}(\s*)\{/g, '},$1{');

    // Fix missing commas between object properties (common when truncated)
    repaired = repaired.replace(/"(\s*)"(\w+)":/g, '",$1"$2":');

    // Remove any text after the final closing bracket
    const lastBracket = repaired.lastIndexOf(']');
    if (lastBracket !== -1 && lastBracket < repaired.length - 1) {
      const afterBracket = repaired.substring(lastBracket + 1).trim();
      if (afterBracket && !afterBracket.match(/^[\s\n]*$/)) {
        console.warn('[PageExpert] Removing text after final bracket:', afterBracket.substring(0, 100));
        repaired = repaired.substring(0, lastBracket + 1);
      }
    }

    // Fix truncated JSON by closing unclosed arrays/objects
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/\]/g) || []).length;

    if (openBraces > closeBraces) {
      console.warn(`[PageExpert] Closing ${openBraces - closeBraces} unclosed braces`);
      repaired += '}'.repeat(openBraces - closeBraces);
    }

    if (openBrackets > closeBrackets) {
      console.warn(`[PageExpert] Closing ${openBrackets - closeBrackets} unclosed brackets`);
      repaired += ']'.repeat(openBrackets - closeBrackets);
    }

    return repaired;
  }

  /**
   * Format design system into prompt-friendly text
   */
  formatDesignGuidelines(designSystem) {
    if (!designSystem) return '';

    let guidelines = '**DESIGN SYSTEM - APPLY TO ALL PAGES**:\n\n';

    // Colors
    if (designSystem.colors) {
      guidelines += '**Colors**:\n';
      if (designSystem.colors.primary) guidelines += `- Primary: ${designSystem.colors.primary}\n`;
      if (designSystem.colors.secondary) guidelines += `- Secondary: ${designSystem.colors.secondary}\n`;
      if (designSystem.colors.background) guidelines += `- Background: ${designSystem.colors.background}\n`;
      if (designSystem.colors.text) guidelines += `- Text: ${designSystem.colors.text}\n`;
      if (designSystem.colors.border) guidelines += `- Border: ${designSystem.colors.border}\n`;
      guidelines += '\n';
    }

    // Typography
    if (designSystem.typography) {
      guidelines += '**Typography**:\n';
      if (designSystem.typography.fontFamily) guidelines += `- Font: ${designSystem.typography.fontFamily}\n`;
      if (designSystem.typography.fontSize) {
        guidelines += `- Base size: ${designSystem.typography.fontSize.base}\n`;
        guidelines += `- Heading sizes: H1=${designSystem.typography.fontSize.h1 || '24px'}, H2=${designSystem.typography.fontSize.h2 || '20px'}\n`;
        guidelines += `- Label size: ${designSystem.typography.fontSize.label}\n`;
      }
      if (designSystem.typography.fontWeight) {
        guidelines += `- Title weight: ${designSystem.typography.fontWeight.title || '600'}\n`;
        guidelines += `- Label weight: ${designSystem.typography.fontWeight.label}\n`;
      }
      guidelines += '\n';
    }

    // Spacing
    if (designSystem.spacing) {
      guidelines += '**Spacing**:\n';
      if (designSystem.spacing.container) guidelines += `- Container padding: ${designSystem.spacing.container}\n`;
      if (designSystem.spacing.sectionGap) guidelines += `- Section gap: ${designSystem.spacing.sectionGap}\n`;
      if (designSystem.spacing.componentGap) guidelines += `- Component gap: ${designSystem.spacing.componentGap || '16px'}\n`;
      guidelines += '\n';
    }

    // Components (Cards)
    if (designSystem.components?.card) {
      const card = designSystem.components.card;
      guidelines += '**Cards**:\n';
      if (card.borderRadius) guidelines += `- Border radius: ${card.borderRadius}\n`;
      if (card.shadow) guidelines += `- Shadow: ${card.shadow}\n`;
      if (card.padding) guidelines += `- Padding: ${card.padding}\n`;
      guidelines += '\n';
    }

    // Components (Buttons)
    if (designSystem.components?.button) {
      const button = designSystem.components.button;
      guidelines += '**Buttons**:\n';
      if (button.primary) {
        guidelines += `- Primary: bg=${button.primary.background}, color=${button.primary.color}, padding=${button.primary.padding}\n`;
      }
      if (button.secondary) {
        guidelines += `- Secondary: bg=${button.secondary.background}, color=${button.secondary.color}, border=${button.secondary.border}\n`;
      }
      guidelines += '\n';
    }

    // Layout
    if (designSystem.layout) {
      guidelines += '**Layout**:\n';
      if (designSystem.layout.maxWidth) guidelines += `- Max width: ${designSystem.layout.maxWidth}\n`;
      if (designSystem.layout.columns) {
        guidelines += `- Desktop columns: ${designSystem.layout.columns.desktop}\n`;
        guidelines += `- Mobile columns: ${designSystem.layout.columns.mobile}\n`;
      }
      guidelines += '\n';
    }

    return guidelines;
  }
}

module.exports = PageExpert;
