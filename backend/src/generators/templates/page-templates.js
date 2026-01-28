/**
 * Page Templates
 * Pre-built page layouts using Shadcn/ui components
 */

const PAGE_TEMPLATES = {
  dashboard: {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Analytics dashboard with metrics, charts, and data tables',
    layout: 'sidebar',
    sections: [
      {
        id: 'metrics',
        type: 'grid',
        columns: 4,
        gap: 4,
        components: [
          { type: 'stat-card', config: { icon: 'DollarSign', title: 'Total Revenue', trend: 'up' } },
          { type: 'stat-card', config: { icon: 'Users', title: 'Active Users', trend: 'up' } },
          { type: 'stat-card', config: { icon: 'ShoppingCart', title: 'Orders', trend: 'down' } },
          { type: 'stat-card', config: { icon: 'Activity', title: 'Growth', trend: 'up' } }
        ]
      },
      {
        id: 'charts',
        type: 'grid',
        columns: 2,
        gap: 4,
        components: [
          { type: 'chart-area', config: { title: 'Revenue Over Time' } },
          { type: 'chart-bar', config: { title: 'Sales by Category' } }
        ]
      },
      {
        id: 'data',
        type: 'full',
        components: [
          { type: 'data-table', config: { title: 'Recent Transactions' } }
        ]
      }
    ],
    shadcnComponents: ['Card', 'CardHeader', 'CardTitle', 'CardContent', 'Table', 'Badge', 'Avatar', 'Skeleton', 'Tabs', 'TabsList', 'TabsTrigger', 'TabsContent'],
    imports: [
      "import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';",
      "import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';",
      "import { Badge } from '@/components/ui/badge';",
      "import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';",
      "import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';",
      "import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';",
      "import { DollarSign, Users, ShoppingCart, Activity, TrendingUp, TrendingDown } from 'lucide-react';"
    ],
    generateJSX: (config = {}) => `
<div className="p-6 space-y-6">
  {/* Page Header */}
  <div className="flex items-center justify-between">
    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
    <div className="flex items-center gap-2">
      <Badge variant="outline">Live</Badge>
    </div>
  </div>

  {/* Stats Cards */}
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">$45,231.89</div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-green-500" />
          +20.1% from last month
        </p>
      </CardContent>
    </Card>
    {/* Additional stat cards... */}
  </div>

  {/* Charts */}
  <div className="grid gap-4 md:grid-cols-2">
    <Card>
      <CardHeader>
        <CardTitle>Revenue Over Time</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  </div>

  {/* Data Table */}
  <Card>
    <CardHeader>
      <CardTitle>Recent Transactions</CardTitle>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Table rows... */}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
</div>`
  },

  landing: {
    id: 'landing',
    name: 'Landing Page',
    description: 'Marketing landing page with hero, features, testimonials, and CTA',
    layout: 'full-width',
    sections: [
      {
        id: 'hero',
        type: 'hero',
        fullWidth: true,
        components: [
          { type: 'heading', config: { level: 1 } },
          { type: 'text', config: { variant: 'lead' } },
          { type: 'button-group' }
        ]
      },
      {
        id: 'features',
        type: 'grid',
        columns: 3,
        gap: 8,
        components: [
          { type: 'feature-card', repeat: 3 }
        ]
      },
      {
        id: 'testimonials',
        type: 'carousel',
        components: [
          { type: 'testimonial-card', repeat: 4 }
        ]
      },
      {
        id: 'cta',
        type: 'centered',
        components: [
          { type: 'heading', config: { level: 2 } },
          { type: 'text' },
          { type: 'button' }
        ]
      }
    ],
    shadcnComponents: ['Button', 'Card', 'CardHeader', 'CardTitle', 'CardDescription', 'CardContent', 'Badge', 'Avatar'],
    imports: [
      "import { Button } from '@/components/ui/button';",
      "import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';",
      "import { Badge } from '@/components/ui/badge';",
      "import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';",
      "import { ArrowRight, Check, Star, Zap, Shield, Globe } from 'lucide-react';"
    ],
    generateJSX: (config = {}) => `
<div className="flex flex-col min-h-screen">
  {/* Hero Section */}
  <section className="relative py-20 lg:py-32 overflow-hidden">
    <div className="container px-4 mx-auto text-center">
      <Badge className="mb-4" variant="secondary">New Release</Badge>
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
        Build beautiful apps
        <span className="text-primary block">faster than ever</span>
      </h1>
      <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
        Create stunning web applications with our modern component library.
        No design experience required.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button size="lg">
          Get Started <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button size="lg" variant="outline">
          View Demo
        </Button>
      </div>
    </div>
  </section>

  {/* Features Section */}
  <section className="py-20 bg-muted/50">
    <div className="container px-4 mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Why choose us?</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Everything you need to build production-ready applications
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Lightning Fast</CardTitle>
            <CardDescription>
              Optimized performance out of the box
            </CardDescription>
          </CardHeader>
        </Card>
        {/* Additional feature cards... */}
      </div>
    </div>
  </section>

  {/* CTA Section */}
  <section className="py-20">
    <div className="container px-4 mx-auto text-center">
      <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
      <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
        Join thousands of developers building amazing products
      </p>
      <Button size="lg">Start Building Today</Button>
    </div>
  </section>
</div>`
  },

  formWizard: {
    id: 'formWizard',
    name: 'Form Wizard',
    description: 'Multi-step form with progress indicator and validation',
    layout: 'centered',
    sections: [
      {
        id: 'progress',
        type: 'header',
        components: [
          { type: 'progress', config: { steps: true } }
        ]
      },
      {
        id: 'form',
        type: 'card',
        components: [
          { type: 'form-step', dynamic: true }
        ]
      },
      {
        id: 'navigation',
        type: 'footer',
        components: [
          { type: 'button', config: { variant: 'outline', label: 'Previous' } },
          { type: 'button', config: { label: 'Next' } }
        ]
      }
    ],
    shadcnComponents: ['Card', 'CardHeader', 'CardTitle', 'CardDescription', 'CardContent', 'CardFooter', 'Button', 'Progress', 'Input', 'Label', 'Select', 'Checkbox'],
    imports: [
      "import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';",
      "import { Button } from '@/components/ui/button';",
      "import { Progress } from '@/components/ui/progress';",
      "import { Input } from '@/components/ui/input';",
      "import { Label } from '@/components/ui/label';",
      "import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';",
      "import { Checkbox } from '@/components/ui/checkbox';",
      "import { ChevronLeft, ChevronRight, Check } from 'lucide-react';"
    ],
    generateJSX: (config = {}) => `
<div className="min-h-screen flex items-center justify-center p-4">
  <Card className="w-full max-w-2xl">
    <CardHeader>
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={\`w-10 h-10 rounded-full flex items-center justify-center \${
              currentStep > index
                ? 'bg-primary text-primary-foreground'
                : currentStep === index
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
            }\`}>
              {currentStep > index ? <Check className="h-5 w-5" /> : index + 1}
            </div>
            {index < steps.length - 1 && (
              <div className={\`w-20 h-1 mx-2 \${currentStep > index ? 'bg-primary' : 'bg-muted'}\`} />
            )}
          </div>
        ))}
      </div>
      <CardTitle>{steps[currentStep].title}</CardTitle>
      <CardDescription>{steps[currentStep].description}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Step content */}
      {currentStep === 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" placeholder="John Doe" />
          </div>
        </div>
      )}
    </CardContent>
    <CardFooter className="flex justify-between">
      <Button variant="outline" onClick={prevStep} disabled={currentStep === 0}>
        <ChevronLeft className="mr-2 h-4 w-4" /> Previous
      </Button>
      <Button onClick={nextStep}>
        {currentStep === steps.length - 1 ? 'Submit' : 'Next'}
        {currentStep < steps.length - 1 && <ChevronRight className="ml-2 h-4 w-4" />}
      </Button>
    </CardFooter>
  </Card>
</div>`
  },

  crud: {
    id: 'crud',
    name: 'CRUD Interface',
    description: 'Data management interface with search, table, and actions',
    layout: 'default',
    sections: [
      {
        id: 'toolbar',
        type: 'flex',
        justify: 'between',
        components: [
          { type: 'search-input' },
          { type: 'button', config: { label: 'Add New', icon: 'Plus' } }
        ]
      },
      {
        id: 'table',
        type: 'full',
        components: [
          { type: 'data-table', config: { selectable: true, sortable: true } }
        ]
      },
      {
        id: 'pagination',
        type: 'flex',
        justify: 'between',
        components: [
          { type: 'text', config: { variant: 'muted' } },
          { type: 'pagination' }
        ]
      }
    ],
    shadcnComponents: ['Table', 'TableHeader', 'TableBody', 'TableRow', 'TableHead', 'TableCell', 'Button', 'Input', 'Dialog', 'DropdownMenu', 'Checkbox', 'Badge'],
    imports: [
      "import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';",
      "import { Button } from '@/components/ui/button';",
      "import { Input } from '@/components/ui/input';",
      "import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';",
      "import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';",
      "import { Checkbox } from '@/components/ui/checkbox';",
      "import { Badge } from '@/components/ui/badge';",
      "import { Plus, Search, MoreHorizontal, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';"
    ],
    generateJSX: (config = {}) => `
<div className="p-6 space-y-4">
  {/* Header */}
  <div className="flex items-center justify-between">
    <h1 className="text-2xl font-bold">Items</h1>
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Item</DialogTitle>
          <DialogDescription>Fill in the details below</DialogDescription>
        </DialogHeader>
        {/* Form fields */}
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>

  {/* Search & Filters */}
  <div className="flex items-center gap-4">
    <div className="relative flex-1 max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input placeholder="Search..." className="pl-9" />
    </div>
  </div>

  {/* Table */}
  <div className="border rounded-lg">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox />
          </TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <Checkbox />
            </TableCell>
            <TableCell className="font-medium">{item.name}</TableCell>
            <TableCell>
              <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                {item.status}
              </Badge>
            </TableCell>
            <TableCell>{item.createdAt}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>

  {/* Pagination */}
  <div className="flex items-center justify-between">
    <p className="text-sm text-muted-foreground">
      Showing 1-10 of 100 items
    </p>
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  </div>
</div>`
  },

  settings: {
    id: 'settings',
    name: 'Settings Page',
    description: 'Application settings with tabs and form sections',
    layout: 'sidebar',
    sections: [
      {
        id: 'navigation',
        type: 'sidebar',
        components: [
          { type: 'nav-link', repeat: 5 }
        ]
      },
      {
        id: 'content',
        type: 'main',
        components: [
          { type: 'form-section', dynamic: true }
        ]
      }
    ],
    shadcnComponents: ['Tabs', 'TabsList', 'TabsTrigger', 'TabsContent', 'Card', 'CardHeader', 'CardTitle', 'CardDescription', 'CardContent', 'Input', 'Label', 'Switch', 'Button', 'Separator'],
    imports: [
      "import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';",
      "import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';",
      "import { Input } from '@/components/ui/input';",
      "import { Label } from '@/components/ui/label';",
      "import { Switch } from '@/components/ui/switch';",
      "import { Button } from '@/components/ui/button';",
      "import { Separator } from '@/components/ui/separator';",
      "import { User, Bell, Shield, Palette, Key } from 'lucide-react';"
    ],
    generateJSX: (config = {}) => `
<div className="p-6 max-w-4xl mx-auto space-y-6">
  <div>
    <h1 className="text-3xl font-bold">Settings</h1>
    <p className="text-muted-foreground">Manage your account settings and preferences</p>
  </div>

  <Separator />

  <Tabs defaultValue="profile" className="space-y-4">
    <TabsList>
      <TabsTrigger value="profile">
        <User className="mr-2 h-4 w-4" /> Profile
      </TabsTrigger>
      <TabsTrigger value="notifications">
        <Bell className="mr-2 h-4 w-4" /> Notifications
      </TabsTrigger>
      <TabsTrigger value="security">
        <Shield className="mr-2 h-4 w-4" /> Security
      </TabsTrigger>
      <TabsTrigger value="appearance">
        <Palette className="mr-2 h-4 w-4" /> Appearance
      </TabsTrigger>
    </TabsList>

    <TabsContent value="profile" className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your profile details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" placeholder="John" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" placeholder="Doe" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="john@example.com" />
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="notifications" className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>Configure your notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { id: 'marketing', label: 'Marketing emails', description: 'Receive emails about new features' },
            { id: 'security', label: 'Security alerts', description: 'Important security notifications' },
            { id: 'updates', label: 'Product updates', description: 'News about product updates' }
          ].map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div>
                <Label htmlFor={item.id}>{item.label}</Label>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <Switch id={item.id} />
            </div>
          ))}
        </CardContent>
      </Card>
    </TabsContent>
  </Tabs>
</div>`
  },

  profile: {
    id: 'profile',
    name: 'User Profile',
    description: 'User profile page with avatar, info, and activity',
    layout: 'centered',
    sections: [
      {
        id: 'header',
        type: 'profile-header',
        components: [
          { type: 'avatar', config: { size: 'lg' } },
          { type: 'heading' },
          { type: 'text' }
        ]
      },
      {
        id: 'stats',
        type: 'grid',
        columns: 3,
        components: [
          { type: 'stat-card', repeat: 3 }
        ]
      },
      {
        id: 'activity',
        type: 'card',
        components: [
          { type: 'activity-feed' }
        ]
      }
    ],
    shadcnComponents: ['Card', 'CardHeader', 'CardTitle', 'CardContent', 'Avatar', 'AvatarImage', 'AvatarFallback', 'Button', 'Badge', 'Tabs', 'TabsList', 'TabsTrigger', 'TabsContent'],
    imports: [
      "import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';",
      "import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';",
      "import { Button } from '@/components/ui/button';",
      "import { Badge } from '@/components/ui/badge';",
      "import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';",
      "import { MapPin, Calendar, Link as LinkIcon, Mail, Settings } from 'lucide-react';"
    ],
    generateJSX: (config = {}) => `
<div className="p-6 max-w-4xl mx-auto space-y-6">
  {/* Profile Header */}
  <Card>
    <CardContent className="pt-6">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        <Avatar className="h-24 w-24">
          <AvatarImage src="/avatar.jpg" alt="User" />
          <AvatarFallback className="text-2xl">JD</AvatarFallback>
        </Avatar>
        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold">John Doe</h1>
            <Badge variant="secondary">Pro</Badge>
          </div>
          <p className="text-muted-foreground mb-4">Senior Software Engineer at Tech Corp</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" /> San Francisco, CA
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" /> Joined March 2021
            </span>
            <span className="flex items-center gap-1">
              <LinkIcon className="h-4 w-4" /> johndoe.dev
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Mail className="mr-2 h-4 w-4" /> Message
          </Button>
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>

  {/* Stats */}
  <div className="grid grid-cols-3 gap-4">
    {[
      { label: 'Projects', value: '24' },
      { label: 'Followers', value: '1.2k' },
      { label: 'Following', value: '348' }
    ].map((stat) => (
      <Card key={stat.label}>
        <CardContent className="pt-6 text-center">
          <div className="text-2xl font-bold">{stat.value}</div>
          <div className="text-sm text-muted-foreground">{stat.label}</div>
        </CardContent>
      </Card>
    ))}
  </div>

  {/* Activity Tabs */}
  <Tabs defaultValue="activity">
    <TabsList>
      <TabsTrigger value="activity">Activity</TabsTrigger>
      <TabsTrigger value="projects">Projects</TabsTrigger>
      <TabsTrigger value="posts">Posts</TabsTrigger>
    </TabsList>
    <TabsContent value="activity">
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Activity items */}
        </CardContent>
      </Card>
    </TabsContent>
  </Tabs>
</div>`
  }
};

/**
 * Get template by ID
 */
function getTemplate(templateId) {
  return PAGE_TEMPLATES[templateId] || null;
}

/**
 * Get all template metadata for UI display
 */
function getTemplateList() {
  return Object.values(PAGE_TEMPLATES).map(template => ({
    id: template.id,
    name: template.name,
    description: template.description,
    layout: template.layout
  }));
}

/**
 * Get required Shadcn imports for a template
 */
function getTemplateImports(templateId) {
  const template = PAGE_TEMPLATES[templateId];
  return template?.imports || [];
}

/**
 * Generate JSX for a template with configuration
 */
function generateTemplateJSX(templateId, config = {}) {
  const template = PAGE_TEMPLATES[templateId];
  if (!template || !template.generateJSX) return '';
  return template.generateJSX(config);
}

module.exports = {
  PAGE_TEMPLATES,
  getTemplate,
  getTemplateList,
  getTemplateImports,
  generateTemplateJSX
};
