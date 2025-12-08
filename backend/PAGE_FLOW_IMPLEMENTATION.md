# Page Flow Implementation Guide

## Overview

This document explains how generated applications use page flow to create fully functional apps with working navigation.

## Components Created

### 1. PageFlowGenerator (`src/generators/PageFlowGenerator.js`)

A utility class that:
- **Extracts navigation relationships** from page definitions
- **Builds navigation maps** showing how pages connect
- **Renders components** to HTML (buttons, cards, tables, forms, etc.)
- **Generates route configurations** for Express server
- **Creates working navigation** based on page flow

#### Key Features:

**Navigation Sources**:
- Page-level `navigation.onAction` (navigate actions)
- Page-level `navigation.menu` (menu links)
- Component-level `component.action` (button navigation)
- Component events (`onClick`, `onSubmit`, etc.)
- Nested actions (table row actions, etc.)

**Component Rendering**:
- Text (headings, paragraphs)
- Buttons (with navigation)
- Cards (metrics, info cards)
- Tables (data tables with actions)
- Lists (item lists)
- Forms (form references)

## How It Works

### 1. Building Navigation Map

When a page is loaded, PageFlowGenerator:
1. Scans all pages for navigation relationships
2. Extracts targets from:
   - `navigation.onAction` entries with `type: 'navigate'`
   - `navigation.menu` items with routes
   - Component actions with navigation
   - Component events with navigation
3. Builds a navigation map: `pageId → [navigationTargets]`

### 2. Rendering Pages

For each page request:
1. **Load page definition** from `pages.json`
2. **Extract navigation menu** from page flow
3. **Render sections** in order (header, main, footer)
4. **Render components** within each section
5. **Apply navigation** to buttons and links
6. **Return complete HTML** with working navigation

### 3. Component Rendering Example

**Page JSON**:
```json
{
  "sections": [
    {
      "type": "header",
      "components": [
        {
          "type": "text",
          "config": { "text": "Dashboard", "variant": "h1" }
        },
        {
          "type": "button",
          "config": { "label": "New Ticket", "variant": "primary" },
          "action": { "type": "navigate", "target": "/tickets/new" }
        }
      ]
    }
  ]
}
```

**Generated HTML**:
```html
<h1>Dashboard</h1>
<a href="/tickets/new" class="btn btn-primary">New Ticket</a>
```

## Integration with ApplicationGenerator

To use PageFlowGenerator in generated apps:

### Step 1: Include PageFlowGenerator in Generated Apps

The ApplicationGenerator should:
1. Copy `PageFlowGenerator.js` to generated app's `src/utils/`
2. Update `package.json` dependencies if needed

### Step 2: Update Server Routes

Generate dynamic routes based on page flow:

```javascript
const PageFlowGenerator = require('./utils/PageFlowGenerator');
const pages = require('./resources/pages.json');

const pageFlow = new PageFlowGenerator(pages);
const routes = pageFlow.generateRoutes();

// Generate routes for each page
routes.forEach(route => {
  app.get(route.route, (req, res) => {
    const pageHTML = pageFlow.generatePageHTML(route.pageId);
    res.render('page', {
      page: pageFlow.pageMap.get(route.pageId),
      pageHTML,
      navigationMenu: pageFlow.getNavigationMenu(route.pageId)
    });
  });
});

// Set home page
const entryPage = pageFlow.getEntryPage();
if (entryPage) {
  app.get('/', (req, res) => {
    res.redirect(entryPage.route);
  });
}
```

### Step 3: Update page.ejs Template

Use the pre-rendered HTML from PageFlowGenerator:

```ejs
<%- include('layout', { title: page.name }) %>

<%- pageHTML %>

<div class="mt-4">
  <a href="/" class="btn btn-outline-secondary">
    <i class="bi bi-house"></i> Back to Home
  </a>
</div>
```

## Next Steps for Full Implementation

### Required Changes to ApplicationGenerator

1. **Add PageFlowGenerator Generation** (`ApplicationGenerator.js`):
   ```javascript
   async generate() {
     // ... existing code ...

     // NEW: Generate PageFlowGenerator utility
     files.push(await this.generatePageFlowGenerator());

     // ... rest of code ...
   }

   async generatePageFlowGenerator() {
     // Copy PageFlowGenerator to generated app
     const source = path.join(__dirname, 'PageFlowGenerator.js');
     const dest = path.join(this.outputPath, 'src/utils/PageFlowGenerator.js');
     await fs.copyFile(source, dest);
     return 'utils/PageFlowGenerator.js';
   }
   ```

2. **Update Server Generation** to use PageFlowGenerator for routing

3. **Update page.ejs Template** to render full page HTML

4. **Add Client-Side JavaScript** for dynamic data loading

### Testing Generated Apps

1. Generate an application with pages
2. Start the generated app: `cd generated-apps/app-name && npm start`
3. Navigate to http://localhost:4000 (or configured port)
4. Verify:
   - All pages are accessible via their routes
   - Navigation buttons work and redirect properly
   - Navigation menu shows correct links
   - Page components render correctly
   - Page flow is followed correctly

## Example Page Flow

**Pages**:
- Dashboard (`/dashboard`) → has button to "New Ticket" (`/tickets/new`)
- Ticket List (`/tickets`) → has actions to view details (`/tickets/:id`)
- Ticket Details (`/tickets/:id`) → has button back to list (`/tickets`)
- New Ticket (`/tickets/new`) → has form that redirects to list on submit (`/tickets`)

**Navigation Map**:
```
/dashboard → [/tickets/new, /tickets]
/tickets → [/tickets/:id]
/tickets/:id → [/tickets]
/tickets/new → [/tickets]
```

## Benefits

1. **Fully Functional Apps**: Generated apps work immediately with proper navigation
2. **Page Flow-Based**: Navigation follows the designed page flow relationships
3. **Component Rendering**: All page components render properly based on their definitions
4. **Extensible**: Easy to add new component types to the renderer
5. **Maintainable**: Clear separation between page definitions and rendering logic

## Current Status

- ✅ PageFlowGenerator created
- ⚠️  Integration with ApplicationGenerator pending
- ⚠️  Updated page.ejs template pending
- ⚠️  Enhanced server routes generation pending
- ⚠️  Client-side dynamic data loading pending

## Implementation Priority

1. **High**: Integrate PageFlowGenerator with ApplicationGenerator
2. **High**: Update page.ejs to use generated HTML
3. **High**: Update server.js generation to use PageFlowGenerator for routing
4. **Medium**: Add client-side JavaScript for dynamic data
5. **Medium**: Add more component renderers (charts, galleries, etc.)
6. **Low**: Add advanced features (lazy loading, caching, etc.)
