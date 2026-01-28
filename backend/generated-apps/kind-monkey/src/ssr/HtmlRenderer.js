/**
 * HTML Renderer
 * Generates HTML with embedded initial state for SSR hydration
 */

const fs = require('fs');
const path = require('path');

class HtmlRenderer {
  constructor() {
    this.buildPath = path.join(__dirname, '../../frontend/build');
    this.indexPath = path.join(this.buildPath, 'index.html');
    this.cachedTemplate = null;
  }

  /**
   * Load the built index.html template
   */
  loadTemplate() {
    if (this.cachedTemplate && process.env.NODE_ENV === 'production') {
      return this.cachedTemplate;
    }

    try {
      if (fs.existsSync(this.indexPath)) {
        this.cachedTemplate = fs.readFileSync(this.indexPath, 'utf8');
        return this.cachedTemplate;
      }
    } catch (error) {
      console.error('Error loading HTML template:', error);
    }

    // Return a minimal HTML template if build doesn't exist
    return this.getDevTemplate();
  }

  /**
   * Development template when build doesn't exist
   */
  getDevTemplate() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#0f172a" />
  <title>kind-monkey</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--color-background, #0f172a); color: var(--color-text, #f1f5f9); }
    .ssr-loading { display: flex; justify-content: center; align-items: center; height: 100vh; }
    .app { display: flex; min-height: 100vh; }
    .sidebar { width: 260px; background: var(--color-card-bg, #1e293b); padding: 20px; border-right: 1px solid var(--color-border, #334155); }
    .sidebar .logo h2 { margin: 0 0 30px 0; font-size: 20px; color: var(--color-primary, #3b82f6); }
    .nav-links { display: flex; flex-direction: column; gap: 4px; }
    .nav-link { display: flex; align-items: center; gap: 12px; padding: 12px 16px; color: var(--color-text-secondary, #94a3b8); text-decoration: none; border-radius: 8px; transition: all 0.2s; }
    .nav-link:hover, .nav-link.active { background: var(--color-primary, #3b82f6); color: white; }
    .main-content { flex: 1; padding: 30px; overflow-y: auto; }
    .page-container { max-width: 1200px; margin: 0 auto; }
    .page-header { margin-bottom: 30px; }
    .page-header h1 { margin: 0 0 8px 0; font-size: 28px; font-weight: 600; }
    .page-header p { margin: 0; color: var(--color-text-secondary, #94a3b8); }
    .page-section { margin-bottom: 30px; }
    .section-title { font-size: 18px; margin: 0 0 16px 0; }
    .section-content { display: flex; flex-wrap: wrap; gap: 20px; }
    .section-content.grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
    .section-content.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    .section-content.grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
    .stat-card { background: var(--color-card-bg, #1e293b); border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 16px; border: 1px solid var(--color-card-border, #334155); }
    .stat-card-icon { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: rgba(59, 130, 246, 0.1); border-radius: 10px; }
    .stat-card-icon svg { width: 24px; height: 24px; }
    .stat-card-value { font-size: 28px; font-weight: 700; line-height: 1; }
    .stat-card-label { font-size: 14px; color: var(--color-text-secondary, #94a3b8); margin-top: 4px; }
    .card { background: var(--color-card-bg, #1e293b); border-radius: 12px; padding: 20px; border: 1px solid var(--color-card-border, #334155); }
    .card-header h3 { margin: 0 0 16px 0; }
    .data-table-container { background: var(--color-card-bg, #1e293b); border-radius: 12px; border: 1px solid var(--color-card-border, #334155); overflow: hidden; width: 100%; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--color-border, #334155); }
    .data-table th { background: rgba(0,0,0,0.2); font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-secondary, #94a3b8); }
    .data-table tbody tr:hover { background: rgba(59, 130, 246, 0.05); }
    .status-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-in-progress, .status-in_progress { background: #dbeafe; color: #1e40af; }
    .status-completed { background: #d1fae5; color: #065f46; }
    .btn { padding: 10px 20px; border-radius: 8px; border: none; font-weight: 500; cursor: pointer; transition: all 0.2s; }
    .btn-primary { background: var(--color-primary, #3b82f6); color: white; }
    .btn-primary:hover { opacity: 0.9; }
    .container { width: 100%; }
    .grid-layout { width: 100%; }
    .spacer { width: 100%; }
    .divider { border: none; border-top: 1px solid var(--color-border, #334155); margin: 0; }
    .search-input { width: 100%; }
    .search-field { width: 100%; padding: 10px 14px; border: 1px solid var(--color-border, #334155); border-radius: 8px; background: var(--color-card-bg, #1e293b); color: var(--color-text, #f1f5f9); font-size: 14px; }
    .search-field:focus { outline: none; border-color: var(--color-primary, #3b82f6); }
    .select-wrapper { display: flex; flex-direction: column; gap: 6px; }
    .select-wrapper label { font-size: 13px; color: var(--color-text-secondary, #94a3b8); }
    .select-field { padding: 10px 14px; border: 1px solid var(--color-border, #334155); border-radius: 8px; background: var(--color-card-bg, #1e293b); color: var(--color-text, #f1f5f9); font-size: 14px; }
    .select-field:focus { outline: none; border-color: var(--color-primary, #3b82f6); }
    .task-card { display: flex; flex-direction: column; gap: 12px; }
    .task-card-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .task-card-title { margin: 0; font-size: 16px; font-weight: 600; }
    .task-card-description { margin: 0; font-size: 14px; color: var(--color-text-secondary, #94a3b8); line-height: 1.5; }
    .task-card-badges { display: flex; gap: 8px; flex-wrap: wrap; }
    .task-card-meta { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--color-text-secondary, #94a3b8); }
    .meta-item { display: flex; align-items: center; gap: 6px; }
    .task-card-actions { display: flex; gap: 8px; margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--color-border, #334155); }
    .btn-sm { padding: 6px 12px; font-size: 13px; }
    .btn-secondary { background: var(--color-card-bg, #334155); color: var(--color-text, #f1f5f9); border: 1px solid var(--color-border, #475569); }
    .btn-success { background: var(--color-success, #4ade80); color: #065f46; }
    .priority-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .priority-high { background: #fee2e2; color: #991b1b; }
    .priority-medium { background: #fef3c7; color: #92400e; }
    .priority-low { background: #dbeafe; color: #1e40af; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; background: var(--color-card-bg, #334155); }
    .empty-state { padding: 40px; text-align: center; color: var(--color-text-secondary, #94a3b8); }
    @media (max-width: 1200px) {
      .section-content.grid-4, .grid-layout { grid-template-columns: repeat(2, 1fr) !important; }
    }
    @media (max-width: 768px) {
      .sidebar { display: none; }
      .section-content.grid-4, .section-content.grid-3, .section-content.grid-2, .grid-layout { grid-template-columns: 1fr !important; }
    }
  </style>
  <!-- SSR_HEAD_PLACEHOLDER -->
</head>
<body>
  <div id="root"><!-- SSR_CONTENT_PLACEHOLDER --></div>
  <!-- SSR_STATE_PLACEHOLDER -->
</body>
</html>`;
  }

  /**
   * Generate CSS variables from theme
   */
  generateThemeStyles(theme) {
    if (!theme || !theme.colors) return '';

    const { colors, typography, spacing, borderRadius, shadows } = theme;

    let css = ':root {\n';

    // Colors
    if (colors) {
      css += `  --color-primary: ${colors.primary};\n`;
      css += `  --color-secondary: ${colors.secondary};\n`;
      css += `  --color-background: ${colors.background};\n`;
      css += `  --color-card-bg: ${colors.cardBackground};\n`;
      css += `  --color-card-border: ${colors.cardBorder};\n`;
      css += `  --color-text: ${colors.text};\n`;
      css += `  --color-text-secondary: ${colors.textSecondary};\n`;
      css += `  --color-label: ${colors.labelText};\n`;
      css += `  --color-border: ${colors.border};\n`;
      css += `  --color-focus: ${colors.focus};\n`;
      css += `  --color-info: ${colors.info};\n`;
      css += `  --color-info-bg: ${colors.infoBackground};\n`;
      css += `  --color-error: ${colors.error};\n`;
      css += `  --color-success: ${colors.success};\n`;
      css += `  --color-warning: ${colors.warning};\n`;
    }

    // Typography
    if (typography) {
      css += `  --font-family: ${typography.fontFamily};\n`;
      css += `  --font-size-page-title: ${typography.pageTitle?.size || '28px'};\n`;
      css += `  --font-size-section-header: ${typography.sectionHeader?.size || '16px'};\n`;
      css += `  --font-size-label: ${typography.fieldLabel?.size || '14px'};\n`;
      css += `  --font-size-input: ${typography.inputText?.size || '14px'};\n`;
      css += `  --font-size-helper: ${typography.helperText?.size || '13px'};\n`;
      css += `  --font-size-button: ${typography.buttonText?.size || '14px'};\n`;
    }

    // Spacing
    if (spacing) {
      css += `  --spacing-unit: ${spacing.unit};\n`;
      css += `  --spacing-section: ${spacing.sectionPadding};\n`;
      css += `  --spacing-field-gap: ${spacing.fieldGap};\n`;
      css += `  --spacing-section-gap: ${spacing.sectionGap};\n`;
      css += `  --container-max-width: ${spacing.containerMaxWidth};\n`;
      css += `  --input-padding: ${spacing.inputPadding};\n`;
    }

    // Border Radius
    if (borderRadius) {
      css += `  --radius-card: ${borderRadius.card};\n`;
      css += `  --radius-input: ${borderRadius.input};\n`;
      css += `  --radius-button: ${borderRadius.button};\n`;
    }

    // Shadows
    if (shadows) {
      css += `  --shadow-card: ${shadows.card};\n`;
      css += `  --shadow-card-hover: ${shadows.cardHover};\n`;
    }

    css += '}\n';
    css += `body { background: ${colors?.background || '#0f172a'}; color: ${colors?.text || '#f1f5f9'}; }\n`;

    return css;
  }

  /**
   * Generate pre-rendered content for the current page
   * Renders actual page content with real data from SSR
   */
  generateSkeletonContent(initialState) {
    const { currentPage, navigation, pageData } = initialState;

    if (!currentPage) {
      return '<div class="ssr-loading">Loading...</div>';
    }

    // Generate navigation
    const navHtml = navigation.map(item => `
      <a href="${item.route}" class="nav-link ${item.route === initialState.route ? 'active' : ''}">
        <span class="nav-icon"></span>
        <span>${item.label}</span>
      </a>
    `).join('');

    // Generate page sections with real data
    const sectionsHtml = this.renderSections(currentPage.sections || [], pageData);

    return `
      <div class="app">
        <nav class="sidebar">
          <div class="logo"><h2>kind-monkey</h2></div>
          <div class="nav-links">${navHtml}</div>
        </nav>
        <main class="main-content">
          <div class="page-container">
            <div class="page-header">
              <h1>${currentPage.title || ''}</h1>
              <p>${currentPage.description || ''}</p>
            </div>
            ${sectionsHtml}
          </div>
        </main>
      </div>
    `;
  }

  /**
   * Render page sections to HTML
   */
  renderSections(sections, data) {
    if (!sections || !Array.isArray(sections)) return '';

    return sections.map(section => {
      const sectionContent = this.renderComponents(section.components || [], data);
      const gridClass = section.grid === 4 ? 'grid-4' : section.grid === 3 ? 'grid-3' : section.grid === 2 ? 'grid-2' : '';

      return `
        <section class="page-section ${gridClass}" id="${section.id || ''}">
          ${section.title ? `<h2 class="section-title">${section.title}</h2>` : ''}
          <div class="section-content ${gridClass}">${sectionContent}</div>
        </section>
      `;
    }).join('');
  }

  /**
   * Render components to HTML
   */
  renderComponents(components, data) {
    if (!components || !Array.isArray(components)) return '';

    return components.map(component => {
      const config = component.config || {};

      // Handle data-bound components that iterate over arrays
      if (component.dataBinding) {
        return this.renderDataBoundComponent(component, data);
      }

      switch (component.type) {
        case 'stat-card':
          return this.renderStatCard(config, data);
        case 'card':
          return this.renderCard(config, data);
        case 'table':
        case 'data-table':
          return this.renderTable(config, data);
        case 'button':
          return this.renderButton(config);
        case 'text':
        case 'heading':
          return this.renderText(config, data);
        case 'container':
          return this.renderContainer(config, data);
        case 'grid':
          return this.renderGrid(config, data);
        case 'spacer':
          return `<div class="spacer" style="height: ${config.height || '16px'}"></div>`;
        case 'divider':
          return '<hr class="divider" />';
        case 'search':
          return this.renderSearch(config);
        case 'select':
          return this.renderSelect(config);
        case 'badge':
          return this.renderBadge(config, data);
        default:
          // Try to render children if they exist
          if (config.children) {
            return this.renderComponents(config.children, data);
          }
          return '';
      }
    }).join('');
  }

  /**
   * Render a data-bound component (iterates over array)
   */
  renderDataBoundComponent(component, data) {
    const bindingKey = component.dataBinding;
    const items = data[bindingKey] || data[bindingKey + 's'] || data.tasks || [];

    if (!items || items.length === 0) {
      return '<div class="empty-state">No items to display</div>';
    }

    // Render the component for each item in the array
    return items.map(item => {
      // Create item-scoped data with the item accessible as both the binding key singular and 'task'
      const singularKey = bindingKey.replace(/s$/, '');
      const itemData = {
        ...data,
        [singularKey]: item,
        task: item, // Also expose as 'task' for compatibility
        item: item
      };

      // Clone component config and interpolate with item data
      const interpolatedConfig = this.interpolateConfig(component.config, itemData);

      // Render based on component type
      switch (component.type) {
        case 'card':
          return this.renderTaskCard(interpolatedConfig, item);
        default:
          return this.renderCard(interpolatedConfig, itemData);
      }
    }).join('');
  }

  /**
   * Interpolate all {{placeholder}} in a config object
   */
  interpolateConfig(config, data) {
    if (!config) return config;

    if (typeof config === 'string') {
      return this.interpolateString(config, data);
    }

    if (Array.isArray(config)) {
      return config.map(item => this.interpolateConfig(item, data));
    }

    if (typeof config === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(config)) {
        result[key] = this.interpolateConfig(value, data);
      }
      return result;
    }

    return config;
  }

  /**
   * Interpolate {{placeholder}} in a string
   */
  interpolateString(str, data) {
    if (!str || typeof str !== 'string') return str;

    return str.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const keys = path.trim().split('.');
      let value = data;

      for (const key of keys) {
        if (value && typeof value === 'object') {
          // Try both the key and snake_case version
          value = value[key] !== undefined ? value[key] : value[this.toSnakeCase(key)];
        } else {
          return match; // Keep placeholder if not found
        }
      }

      if (value === undefined || value === null) return '';

      // Format dates nicely
      if (value instanceof Date || (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/))) {
        try {
          return new Date(value).toLocaleDateString();
        } catch (e) {
          return value;
        }
      }

      return String(value);
    });
  }

  /**
   * Render a task card with full details
   */
  renderTaskCard(config, task) {
    const title = config.title || task.title || 'Untitled';
    const description = config.description || task.description || '';
    const status = task.status || 'pending';
    const priority = task.priority || 'medium';
    const dueDate = task.due_date || task.dueDate;
    const createdAt = task.created_at || task.createdAt;

    const statusClass = status.toLowerCase().replace(/\s+/g, '-');
    const priorityClass = (priority || '').toLowerCase();

    return `
      <div class="task-card card">
        <div class="task-card-header">
          <h3 class="task-card-title">${title}</h3>
        </div>
        <p class="task-card-description">${description}</p>
        <div class="task-card-badges">
          <span class="status-badge status-${statusClass}">${status}</span>
          ${priority ? `<span class="priority-badge priority-${priorityClass}">${priority}</span>` : ''}
        </div>
        <div class="task-card-meta">
          ${dueDate ? `<span class="meta-item">Due: ${new Date(dueDate).toLocaleDateString()}</span>` : ''}
          ${createdAt ? `<span class="meta-item">Created: ${new Date(createdAt).toLocaleDateString()}</span>` : ''}
        </div>
        <div class="task-card-actions">
          <button class="btn btn-secondary btn-sm">View</button>
          <button class="btn btn-success btn-sm">Complete</button>
          <button class="btn btn-primary btn-sm">Edit</button>
        </div>
      </div>
    `;
  }

  /**
   * Render a badge component
   */
  renderBadge(config, data) {
    const text = config.text || '';
    const variant = config.variant || 'default';
    return `<span class="badge badge-${variant}">${text}</span>`;
  }

  /**
   * Render a container component
   */
  renderContainer(config, data) {
    const children = config.children || [];
    const childrenHtml = this.renderComponents(children, data);
    const style = config.padding ? `padding: ${config.padding};` : '';
    const maxWidth = config.maxWidth ? `max-width: ${config.maxWidth}; margin: 0 auto;` : '';

    return `<div class="container" style="${style}${maxWidth}">${childrenHtml}</div>`;
  }

  /**
   * Render a grid component
   */
  renderGrid(config, data) {
    const columns = config.columns || 3;
    const gap = config.gap || '20px';
    const children = config.children || [];
    const childrenHtml = this.renderComponents(children, data);

    return `
      <div class="grid-layout" style="display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: ${gap};">
        ${childrenHtml}
      </div>
    `;
  }

  /**
   * Render a search input
   */
  renderSearch(config) {
    return `
      <div class="search-input">
        <input type="text" placeholder="${config.placeholder || 'Search...'}" class="search-field" />
      </div>
    `;
  }

  /**
   * Render a select dropdown
   */
  renderSelect(config) {
    const options = config.options || [];
    const optionsHtml = options.map(opt =>
      `<option value="${typeof opt === 'string' ? opt : opt.value}">${typeof opt === 'string' ? opt : opt.label}</option>`
    ).join('');

    return `
      <div class="select-wrapper">
        ${config.label ? `<label>${config.label}</label>` : ''}
        <select class="select-field">${optionsHtml}</select>
      </div>
    `;
  }

  /**
   * Render a stat card component
   */
  renderStatCard(config, data) {
    // The value should already be interpolated in the page data
    const value = config.value || '0';
    const label = config.label || config.title || '';
    const icon = config.icon || '';
    const color = config.color || 'var(--color-primary)';

    return `
      <div class="stat-card" style="border-left: 4px solid ${color}">
        <div class="stat-card-icon" style="color: ${color}">${this.getIconSvg(icon)}</div>
        <div class="stat-card-content">
          <div class="stat-card-value">${value}</div>
          <div class="stat-card-label">${label}</div>
        </div>
      </div>
    `;
  }

  /**
   * Render a card component
   */
  renderCard(config, data) {
    const title = config.title || '';
    const content = config.content || '';

    return `
      <div class="card">
        ${title ? `<div class="card-header"><h3>${title}</h3></div>` : ''}
        <div class="card-content">${content}</div>
      </div>
    `;
  }

  /**
   * Render a table component
   */
  renderTable(config, data) {
    const modelName = config.dataSource || config.model || 'task';
    const items = data[modelName] || data[modelName + 's'] || data.tasks || [];
    const columns = config.columns || [
      { key: 'title', label: 'Title' },
      { key: 'status', label: 'Status' },
      { key: 'due_date', label: 'Due Date' }
    ];

    const headerHtml = columns.map(col => `<th>${col.label || col.key}</th>`).join('');
    const rowsHtml = items.slice(0, 10).map(item => {
      const cells = columns.map(col => {
        let value = item[col.key] || item[this.toSnakeCase(col.key)] || '';
        if (col.key === 'status' || col.key.includes('status')) {
          return `<td><span class="status-badge status-${String(value).toLowerCase().replace(/\s+/g, '-')}">${value}</span></td>`;
        }
        if (col.key.includes('date') && value) {
          value = new Date(value).toLocaleDateString();
        }
        return `<td>${value}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    return `
      <div class="data-table-container">
        <table class="data-table">
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${rowsHtml || '<tr><td colspan="' + columns.length + '">No data available</td></tr>'}</tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render a button component
   */
  renderButton(config) {
    const label = config.label || config.text || 'Button';
    const variant = config.variant || 'primary';

    return `<button class="btn btn-${variant}">${label}</button>`;
  }

  /**
   * Render text/heading component
   */
  renderText(config, data) {
    const text = config.text || config.content || '';
    const level = config.level || 'p';
    const tag = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(level) ? level : 'p';

    return `<${tag}>${text}</${tag}>`;
  }

  /**
   * Get SVG icon
   */
  getIconSvg(iconName) {
    const icons = {
      'list': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
      'clock': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>',
      'check': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>',
      'check-circle': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>',
      'percent': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>',
      'activity': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>',
      'tasks': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="15" x2="15" y2="15"/></svg>',
    };
    return icons[iconName] || icons['list'];
  }

  /**
   * Convert camelCase to snake_case
   */
  toSnakeCase(str) {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  }

  /**
   * Render complete HTML with initial state
   */
  render(initialState) {
    let html = this.loadTemplate();
    const theme = initialState.theme;

    // Inject theme styles into head
    const themeStyles = this.generateThemeStyles(theme);
    const headContent = `<style id="ssr-theme">${themeStyles}</style>`;

    // Inject initial state as a script
    const stateScript = `
      <script>
        window.__INITIAL_STATE__ = ${JSON.stringify(initialState)};
        window.__SSR__ = true;
      </script>
    `;

    // Generate skeleton content
    const skeletonContent = this.generateSkeletonContent(initialState);

    // Replace placeholders or inject before closing tags
    if (html.includes('<!-- SSR_HEAD_PLACEHOLDER -->')) {
      html = html.replace('<!-- SSR_HEAD_PLACEHOLDER -->', headContent);
    } else {
      html = html.replace('</head>', `${headContent}\n</head>`);
    }

    if (html.includes('<!-- SSR_CONTENT_PLACEHOLDER -->')) {
      html = html.replace('<!-- SSR_CONTENT_PLACEHOLDER -->', skeletonContent);
    }

    if (html.includes('<!-- SSR_STATE_PLACEHOLDER -->')) {
      html = html.replace('<!-- SSR_STATE_PLACEHOLDER -->', stateScript);
    } else {
      html = html.replace('</body>', `${stateScript}\n</body>`);
    }

    // If using the production build, inject state before the bundle
    if (html.includes('<div id="root">')) {
      // Add skeleton content to root for instant display
      html = html.replace(
        '<div id="root"></div>',
        `<div id="root">${skeletonContent}</div>`
      );
    }

    return html;
  }
}

module.exports = new HtmlRenderer();
