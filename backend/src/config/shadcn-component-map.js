/**
 * Shadcn/ui Component Mapping
 * Maps existing ARES components to Shadcn equivalents
 */

const SHADCN_COMPONENT_MAP = {
  // ============================================
  // FORM COMPONENTS (64 types mapped)
  // ============================================

  // Basic Inputs
  text: {
    shadcn: 'Input',
    imports: ['Input'],
    props: { type: 'text' },
    wrapper: 'FormField'
  },
  email: {
    shadcn: 'Input',
    imports: ['Input'],
    props: { type: 'email' },
    wrapper: 'FormField'
  },
  password: {
    shadcn: 'Input',
    imports: ['Input'],
    props: { type: 'password' },
    wrapper: 'FormField'
  },
  number: {
    shadcn: 'Input',
    imports: ['Input'],
    props: { type: 'number' },
    wrapper: 'FormField'
  },
  phone: {
    shadcn: 'Input',
    imports: ['Input'],
    props: { type: 'tel' },
    wrapper: 'FormField'
  },
  url: {
    shadcn: 'Input',
    imports: ['Input'],
    props: { type: 'url' },
    wrapper: 'FormField'
  },
  search: {
    shadcn: 'Input',
    imports: ['Input'],
    props: { type: 'search' },
    wrapper: 'FormField',
    icon: 'Search'
  },
  textarea: {
    shadcn: 'Textarea',
    imports: ['Textarea'],
    wrapper: 'FormField'
  },

  // Selection Components
  select: {
    shadcn: 'Select',
    imports: ['Select', 'SelectTrigger', 'SelectValue', 'SelectContent', 'SelectItem'],
    composition: `
<Select>
  <SelectTrigger>
    <SelectValue placeholder="{{placeholder}}" />
  </SelectTrigger>
  <SelectContent>
    {{#each options}}
    <SelectItem value="{{value}}">{{label}}</SelectItem>
    {{/each}}
  </SelectContent>
</Select>`,
    wrapper: 'FormField'
  },
  multiselect: {
    shadcn: 'Command',
    imports: ['Command', 'CommandInput', 'CommandList', 'CommandEmpty', 'CommandGroup', 'CommandItem', 'Popover', 'PopoverTrigger', 'PopoverContent'],
    pattern: 'combobox-multi'
  },
  checkbox: {
    shadcn: 'Checkbox',
    imports: ['Checkbox', 'Label'],
    composition: `
<div className="flex items-center space-x-2">
  <Checkbox id="{{id}}" />
  <Label htmlFor="{{id}}">{{label}}</Label>
</div>`
  },
  'checkbox-group': {
    shadcn: 'Checkbox',
    imports: ['Checkbox', 'Label'],
    multiple: true
  },
  radio: {
    shadcn: 'RadioGroup',
    imports: ['RadioGroup', 'RadioGroupItem', 'Label'],
    composition: `
<RadioGroup defaultValue="{{defaultValue}}">
  {{#each options}}
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="{{value}}" id="{{id}}" />
    <Label htmlFor="{{id}}">{{label}}</Label>
  </div>
  {{/each}}
</RadioGroup>`
  },
  toggle: {
    shadcn: 'Switch',
    imports: ['Switch', 'Label'],
    composition: `
<div className="flex items-center space-x-2">
  <Switch id="{{id}}" />
  <Label htmlFor="{{id}}">{{label}}</Label>
</div>`
  },

  // Date & Time
  date: {
    shadcn: 'DatePicker',
    imports: ['Popover', 'PopoverTrigger', 'PopoverContent', 'Calendar', 'Button'],
    pattern: 'date-picker',
    icon: 'Calendar'
  },
  'date-range': {
    shadcn: 'DateRangePicker',
    imports: ['Popover', 'PopoverTrigger', 'PopoverContent', 'Calendar', 'Button'],
    pattern: 'date-range-picker'
  },
  time: {
    shadcn: 'Input',
    imports: ['Input'],
    props: { type: 'time' }
  },
  datetime: {
    shadcn: 'DateTimePicker',
    imports: ['Popover', 'PopoverTrigger', 'PopoverContent', 'Calendar', 'Button', 'Input'],
    pattern: 'datetime-picker'
  },

  // Numeric Inputs
  slider: {
    shadcn: 'Slider',
    imports: ['Slider'],
    composition: `<Slider defaultValue={[{{defaultValue}}]} max={{max}} step={{step}} />`
  },
  'range-slider': {
    shadcn: 'Slider',
    imports: ['Slider'],
    props: { range: true }
  },
  rating: {
    shadcn: 'Custom',
    imports: ['Button'],
    pattern: 'star-rating',
    icon: 'Star'
  },
  stepper: {
    shadcn: 'Input',
    imports: ['Input', 'Button'],
    pattern: 'number-stepper'
  },

  // File & Media
  file: {
    shadcn: 'Input',
    imports: ['Input', 'Label'],
    props: { type: 'file' },
    pattern: 'file-upload'
  },
  'file-dropzone': {
    shadcn: 'Custom',
    imports: ['Card'],
    pattern: 'dropzone'
  },
  image: {
    shadcn: 'Custom',
    imports: ['Avatar', 'AvatarImage', 'AvatarFallback', 'Button'],
    pattern: 'image-upload'
  },
  signature: {
    shadcn: 'Custom',
    imports: ['Card'],
    pattern: 'signature-pad'
  },

  // Rich Text
  'rich-text': {
    shadcn: 'Custom',
    imports: ['Card'],
    pattern: 'rich-text-editor'
  },
  markdown: {
    shadcn: 'Textarea',
    imports: ['Textarea', 'Tabs', 'TabsList', 'TabsTrigger', 'TabsContent'],
    pattern: 'markdown-editor'
  },
  'code-editor': {
    shadcn: 'Custom',
    imports: ['Card'],
    pattern: 'code-editor'
  },

  // Special Inputs
  color: {
    shadcn: 'Popover',
    imports: ['Popover', 'PopoverTrigger', 'PopoverContent', 'Input'],
    pattern: 'color-picker'
  },
  otp: {
    shadcn: 'InputOTP',
    imports: ['InputOTP', 'InputOTPGroup', 'InputOTPSlot'],
    composition: `
<InputOTP maxLength={{length}}>
  <InputOTPGroup>
    {{#times length}}
    <InputOTPSlot index={{{@index}}} />
    {{/times}}
  </InputOTPGroup>
</InputOTP>`
  },
  tags: {
    shadcn: 'Custom',
    imports: ['Badge', 'Input', 'Button'],
    pattern: 'tag-input'
  },
  autocomplete: {
    shadcn: 'Command',
    imports: ['Command', 'CommandInput', 'CommandList', 'CommandEmpty', 'CommandGroup', 'CommandItem', 'Popover', 'PopoverTrigger', 'PopoverContent'],
    pattern: 'combobox'
  },
  address: {
    shadcn: 'Custom',
    imports: ['Input', 'Select', 'SelectTrigger', 'SelectValue', 'SelectContent', 'SelectItem'],
    pattern: 'address-form'
  },

  // Buttons
  button: {
    shadcn: 'Button',
    imports: ['Button'],
    variants: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    sizes: ['default', 'sm', 'lg', 'icon']
  },
  'submit-button': {
    shadcn: 'Button',
    imports: ['Button'],
    props: { type: 'submit' }
  },
  'reset-button': {
    shadcn: 'Button',
    imports: ['Button'],
    props: { type: 'reset', variant: 'outline' }
  },

  // Layout Form Elements
  'form-section': {
    shadcn: 'Card',
    imports: ['Card', 'CardHeader', 'CardTitle', 'CardDescription', 'CardContent'],
    composition: `
<Card>
  <CardHeader>
    <CardTitle>{{title}}</CardTitle>
    <CardDescription>{{description}}</CardDescription>
  </CardHeader>
  <CardContent>
    {{children}}
  </CardContent>
</Card>`
  },
  'field-group': {
    shadcn: 'div',
    className: 'space-y-4'
  },
  divider: {
    shadcn: 'Separator',
    imports: ['Separator']
  },
  spacer: {
    shadcn: 'div',
    className: 'h-{{size}}'
  },

  // ============================================
  // PAGE COMPONENTS (30+ types mapped)
  // ============================================

  // Layout Components
  card: {
    shadcn: 'Card',
    imports: ['Card', 'CardHeader', 'CardTitle', 'CardDescription', 'CardContent', 'CardFooter'],
    composition: `
<Card className="{{className}}">
  <CardHeader>
    <CardTitle>{{title}}</CardTitle>
    {{#if description}}<CardDescription>{{description}}</CardDescription>{{/if}}
  </CardHeader>
  <CardContent>
    {{children}}
  </CardContent>
  {{#if footer}}<CardFooter>{{footer}}</CardFooter>{{/if}}
</Card>`,
    microInteractions: {
      hover: 'hover:shadow-lg transition-shadow duration-200'
    }
  },
  'stat-card': {
    shadcn: 'Card',
    imports: ['Card', 'CardHeader', 'CardTitle', 'CardContent'],
    pattern: 'stat-card',
    microInteractions: {
      hover: 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200'
    }
  },
  tabs: {
    shadcn: 'Tabs',
    imports: ['Tabs', 'TabsList', 'TabsTrigger', 'TabsContent'],
    composition: `
<Tabs defaultValue="{{defaultTab}}" className="{{className}}">
  <TabsList>
    {{#each tabs}}
    <TabsTrigger value="{{value}}">{{label}}</TabsTrigger>
    {{/each}}
  </TabsList>
  {{#each tabs}}
  <TabsContent value="{{value}}">
    {{content}}
  </TabsContent>
  {{/each}}
</Tabs>`
  },
  accordion: {
    shadcn: 'Accordion',
    imports: ['Accordion', 'AccordionItem', 'AccordionTrigger', 'AccordionContent'],
    composition: `
<Accordion type="{{type}}" collapsible>
  {{#each items}}
  <AccordionItem value="{{value}}">
    <AccordionTrigger>{{title}}</AccordionTrigger>
    <AccordionContent>{{content}}</AccordionContent>
  </AccordionItem>
  {{/each}}
</Accordion>`
  },

  // Data Display
  table: {
    shadcn: 'Table',
    imports: ['Table', 'TableHeader', 'TableBody', 'TableFooter', 'TableHead', 'TableRow', 'TableCell', 'TableCaption'],
    pattern: 'data-table'
  },
  'data-table': {
    shadcn: 'DataTable',
    imports: ['Table', 'TableHeader', 'TableBody', 'TableHead', 'TableRow', 'TableCell', 'Button', 'Input', 'DropdownMenu', 'DropdownMenuTrigger', 'DropdownMenuContent', 'DropdownMenuItem'],
    pattern: 'data-table-advanced',
    features: ['sorting', 'filtering', 'pagination', 'row-selection']
  },
  list: {
    shadcn: 'div',
    className: 'space-y-2',
    itemComponent: 'Card'
  },
  grid: {
    shadcn: 'div',
    className: 'grid grid-cols-{{columns}} gap-{{gap}}'
  },

  // Feedback & Status
  alert: {
    shadcn: 'Alert',
    imports: ['Alert', 'AlertTitle', 'AlertDescription'],
    variants: ['default', 'destructive'],
    composition: `
<Alert variant="{{variant}}">
  {{#if icon}}<{{icon}} className="h-4 w-4" />{{/if}}
  <AlertTitle>{{title}}</AlertTitle>
  <AlertDescription>{{description}}</AlertDescription>
</Alert>`
  },
  badge: {
    shadcn: 'Badge',
    imports: ['Badge'],
    variants: ['default', 'secondary', 'destructive', 'outline']
  },
  progress: {
    shadcn: 'Progress',
    imports: ['Progress'],
    composition: `<Progress value={{value}} className="{{className}}" />`
  },
  skeleton: {
    shadcn: 'Skeleton',
    imports: ['Skeleton'],
    composition: `<Skeleton className="{{className}}" />`
  },
  spinner: {
    shadcn: 'Custom',
    imports: [],
    className: 'animate-spin rounded-full border-2 border-muted border-t-primary'
  },

  // Interactive Elements
  dialog: {
    shadcn: 'Dialog',
    imports: ['Dialog', 'DialogTrigger', 'DialogContent', 'DialogHeader', 'DialogTitle', 'DialogDescription', 'DialogFooter'],
    composition: `
<Dialog>
  <DialogTrigger asChild>{{trigger}}</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{{title}}</DialogTitle>
      <DialogDescription>{{description}}</DialogDescription>
    </DialogHeader>
    {{content}}
    <DialogFooter>{{footer}}</DialogFooter>
  </DialogContent>
</Dialog>`
  },
  'alert-dialog': {
    shadcn: 'AlertDialog',
    imports: ['AlertDialog', 'AlertDialogTrigger', 'AlertDialogContent', 'AlertDialogHeader', 'AlertDialogTitle', 'AlertDialogDescription', 'AlertDialogFooter', 'AlertDialogCancel', 'AlertDialogAction'],
    pattern: 'confirm-dialog'
  },
  sheet: {
    shadcn: 'Sheet',
    imports: ['Sheet', 'SheetTrigger', 'SheetContent', 'SheetHeader', 'SheetTitle', 'SheetDescription'],
    sides: ['top', 'right', 'bottom', 'left']
  },
  drawer: {
    shadcn: 'Drawer',
    imports: ['Drawer', 'DrawerTrigger', 'DrawerContent', 'DrawerHeader', 'DrawerTitle', 'DrawerDescription', 'DrawerFooter']
  },
  tooltip: {
    shadcn: 'Tooltip',
    imports: ['Tooltip', 'TooltipTrigger', 'TooltipContent', 'TooltipProvider'],
    composition: `
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>{{trigger}}</TooltipTrigger>
    <TooltipContent>{{content}}</TooltipContent>
  </Tooltip>
</TooltipProvider>`
  },
  popover: {
    shadcn: 'Popover',
    imports: ['Popover', 'PopoverTrigger', 'PopoverContent']
  },
  'dropdown-menu': {
    shadcn: 'DropdownMenu',
    imports: ['DropdownMenu', 'DropdownMenuTrigger', 'DropdownMenuContent', 'DropdownMenuItem', 'DropdownMenuSeparator', 'DropdownMenuLabel', 'DropdownMenuGroup']
  },
  'context-menu': {
    shadcn: 'ContextMenu',
    imports: ['ContextMenu', 'ContextMenuTrigger', 'ContextMenuContent', 'ContextMenuItem']
  },

  // Media & Content
  avatar: {
    shadcn: 'Avatar',
    imports: ['Avatar', 'AvatarImage', 'AvatarFallback'],
    composition: `
<Avatar className="{{className}}">
  <AvatarImage src="{{src}}" alt="{{alt}}" />
  <AvatarFallback>{{fallback}}</AvatarFallback>
</Avatar>`
  },
  'avatar-group': {
    shadcn: 'Custom',
    imports: ['Avatar', 'AvatarImage', 'AvatarFallback'],
    pattern: 'avatar-stack'
  },
  image: {
    shadcn: 'AspectRatio',
    imports: ['AspectRatio'],
    composition: `
<AspectRatio ratio={{ratio}}>
  <img src="{{src}}" alt="{{alt}}" className="rounded-md object-cover" />
</AspectRatio>`
  },
  carousel: {
    shadcn: 'Carousel',
    imports: ['Carousel', 'CarouselContent', 'CarouselItem', 'CarouselPrevious', 'CarouselNext']
  },

  // Navigation
  breadcrumb: {
    shadcn: 'Breadcrumb',
    imports: ['Breadcrumb', 'BreadcrumbList', 'BreadcrumbItem', 'BreadcrumbLink', 'BreadcrumbSeparator', 'BreadcrumbPage']
  },
  pagination: {
    shadcn: 'Pagination',
    imports: ['Pagination', 'PaginationContent', 'PaginationItem', 'PaginationLink', 'PaginationPrevious', 'PaginationNext', 'PaginationEllipsis']
  },
  'navigation-menu': {
    shadcn: 'NavigationMenu',
    imports: ['NavigationMenu', 'NavigationMenuList', 'NavigationMenuItem', 'NavigationMenuTrigger', 'NavigationMenuContent', 'NavigationMenuLink']
  },

  // Notifications
  toast: {
    shadcn: 'Toast',
    imports: ['Toast', 'ToastAction', 'Toaster', 'useToast'],
    pattern: 'toast-notification'
  },
  sonner: {
    shadcn: 'Sonner',
    imports: ['toast', 'Toaster'],
    pattern: 'sonner-toast'
  },

  // Charts (using Recharts with Shadcn styling)
  'chart-area': {
    shadcn: 'ChartContainer',
    imports: ['ChartContainer', 'ChartTooltip', 'ChartTooltipContent'],
    recharts: ['AreaChart', 'Area', 'XAxis', 'YAxis', 'CartesianGrid'],
    pattern: 'area-chart'
  },
  'chart-bar': {
    shadcn: 'ChartContainer',
    imports: ['ChartContainer', 'ChartTooltip', 'ChartTooltipContent'],
    recharts: ['BarChart', 'Bar', 'XAxis', 'YAxis', 'CartesianGrid'],
    pattern: 'bar-chart'
  },
  'chart-line': {
    shadcn: 'ChartContainer',
    imports: ['ChartContainer', 'ChartTooltip', 'ChartTooltipContent'],
    recharts: ['LineChart', 'Line', 'XAxis', 'YAxis', 'CartesianGrid'],
    pattern: 'line-chart'
  },
  'chart-pie': {
    shadcn: 'ChartContainer',
    imports: ['ChartContainer', 'ChartTooltip', 'ChartTooltipContent', 'ChartLegend', 'ChartLegendContent'],
    recharts: ['PieChart', 'Pie', 'Cell'],
    pattern: 'pie-chart'
  },
  'chart-donut': {
    shadcn: 'ChartContainer',
    imports: ['ChartContainer', 'ChartTooltip', 'ChartTooltipContent'],
    recharts: ['PieChart', 'Pie', 'Cell'],
    pattern: 'donut-chart'
  },
  'chart-radar': {
    shadcn: 'ChartContainer',
    imports: ['ChartContainer', 'ChartTooltip', 'ChartTooltipContent'],
    recharts: ['RadarChart', 'Radar', 'PolarGrid', 'PolarAngleAxis', 'PolarRadiusAxis'],
    pattern: 'radar-chart'
  },

  // Typography
  heading: {
    shadcn: 'Custom',
    className: {
      h1: 'scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl',
      h2: 'scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0',
      h3: 'scroll-m-20 text-2xl font-semibold tracking-tight',
      h4: 'scroll-m-20 text-xl font-semibold tracking-tight'
    }
  },
  text: {
    shadcn: 'Custom',
    className: {
      lead: 'text-xl text-muted-foreground',
      large: 'text-lg font-semibold',
      small: 'text-sm font-medium leading-none',
      muted: 'text-sm text-muted-foreground'
    }
  },
  blockquote: {
    shadcn: 'Custom',
    className: 'mt-6 border-l-2 pl-6 italic'
  },
  code: {
    shadcn: 'Custom',
    className: 'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold'
  }
};

/**
 * Get all unique Shadcn imports needed for a set of components
 */
function getRequiredImports(componentTypes) {
  const imports = new Set();

  componentTypes.forEach(type => {
    const mapping = SHADCN_COMPONENT_MAP[type];
    if (mapping && mapping.imports) {
      mapping.imports.forEach(imp => imports.add(imp));
    }
  });

  return Array.from(imports);
}

/**
 * Get the Shadcn component JSX for a given component type
 */
function getShadcnJSX(componentType, config = {}) {
  const mapping = SHADCN_COMPONENT_MAP[componentType];
  if (!mapping) return null;

  if (mapping.composition) {
    // Replace template variables
    let jsx = mapping.composition;
    Object.entries(config).forEach(([key, value]) => {
      jsx = jsx.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return jsx;
  }

  return mapping.shadcn;
}

/**
 * Check if a component type has micro-interactions defined
 */
function getMicroInteractions(componentType) {
  const mapping = SHADCN_COMPONENT_MAP[componentType];
  return mapping?.microInteractions || null;
}

module.exports = {
  SHADCN_COMPONENT_MAP,
  getRequiredImports,
  getShadcnJSX,
  getMicroInteractions
};
