/**
 * PageFlowGenerator
 *
 * Generates fully functional pages with navigation based on page flow
 * Converts page JSON definitions into working HTML with proper component rendering
 */

class PageFlowGenerator {
  constructor(pages) {
    this.pages = pages || [];
    this.pageMap = new Map();
    this.navigationMap = new Map();

    // Build page lookup maps
    this.pages.forEach(page => {
      this.pageMap.set(page.id, page);
      this.pageMap.set(page.route, page);
    });

    // Build navigation map from page flow
    this.buildNavigationMap();
  }

  /**
   * Build navigation map by extracting all navigation relationships
   */
  buildNavigationMap() {
    this.pages.forEach(page => {
      const navigationTargets = [];

      // 1. Extract from page-level navigation.onAction
      if (page.navigation && page.navigation.onAction) {
        Object.entries(page.navigation.onAction).forEach(([actionName, actionData]) => {
          if (actionData.type === 'navigate' && actionData.target) {
            navigationTargets.push({
              source: 'navigation.onAction',
              action: actionName,
              target: actionData.target,
              type: 'navigate'
            });
          }
        });
      }

      // 2. Extract from page-level navigation.menu
      if (page.navigation && page.navigation.menu) {
        page.navigation.menu.forEach(menuItem => {
          if (menuItem.route) {
            navigationTargets.push({
              source: 'navigation.menu',
              label: menuItem.label,
              target: menuItem.route,
              type: 'menu',
              icon: menuItem.icon
            });
          }
        });
      }

      // 3. Extract from component actions
      if (page.sections) {
        page.sections.forEach(section => {
          if (section.components) {
            section.components.forEach(component => {
              // Component-level action
              if (component.action && component.action.type === 'navigate') {
                navigationTargets.push({
                  source: 'component.action',
                  component: component.type,
                  label: component.config?.label || component.type,
                  target: component.action.target,
                  type: 'navigate'
                });
              }

              // Component events
              if (component.events) {
                Object.entries(component.events).forEach(([eventName, event]) => {
                  if (event.type === 'navigate' && event.target) {
                    navigationTargets.push({
                      source: 'component.events',
                      component: component.type,
                      event: eventName,
                      target: event.target,
                      type: 'navigate'
                    });
                  }
                });
              }

              // Nested actions (like table row actions)
              if (component.config && component.config.actions) {
                component.config.actions.forEach(action => {
                  if (action.type === 'navigate' && action.target) {
                    navigationTargets.push({
                      source: 'component.config.actions',
                      component: component.type,
                      label: action.label || 'action',
                      target: action.target,
                      type: 'navigate'
                    });
                  }
                });
              }
            });
          }
        });
      }

      this.navigationMap.set(page.id, navigationTargets);
    });
  }

  /**
   * Get all navigation targets for a page
   */
  getNavigationTargets(pageId) {
    return this.navigationMap.get(pageId) || [];
  }

  /**
   * Get navigation menu items for a page
   */
  getNavigationMenu(pageId) {
    const page = this.pageMap.get(pageId);
    if (!page || !page.navigation || !page.navigation.menu) {
      return [];
    }
    return page.navigation.menu;
  }

  /**
   * Render a component to HTML
   */
  renderComponent(component, pageId) {
    const type = component.type;
    const config = component.config || {};

    switch (type) {
      case 'text':
        return this.renderText(config);
      case 'button':
        return this.renderButton(component, pageId);
      case 'card':
        return this.renderCard(config);
      case 'table':
        return this.renderTable(component);
      case 'list':
        return this.renderList(component);
      case 'form':
        return this.renderFormReference(config);
      default:
        return `<div class="alert alert-info">Component type: ${type}</div>`;
    }
  }

  renderText(config) {
    const variant = config.variant || 'p';
    const text = config.text || '';
    const className = config.className || '';

    return `<${variant} class="${className}">${text}</${variant}>`;
  }

  renderButton(component, pageId) {
    const config = component.config || {};
    const label = config.label || 'Button';
    const variant = config.variant || 'primary';
    const action = component.action;

    let href = '#';
    let target = '';

    if (action && action.type === 'navigate' && action.target) {
      href = action.target;
    }

    return `<a href="${href}" class="btn btn-${variant}"${target}>${label}</a>`;
  }

  renderCard(config) {
    const title = config.title || '';
    const metric = config.metric || '';
    const color = config.color || 'primary';

    return `
      <div class="card text-white bg-${color} mb-3">
        <div class="card-body">
          <h5 class="card-title">${title}</h5>
          <p class="card-text display-4">${metric}</p>
        </div>
      </div>
    `;
  }

  renderTable(component) {
    const config = component.config || {};
    const title = config.title || 'Table';
    const showActions = config.showActions || false;

    return `
      <div class="card">
        <div class="card-header">
          <h5>${title}</h5>
        </div>
        <div class="card-body">
          <table class="table table-striped">
            <thead>
              <tr>
                <th>Loading data...</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Data will be populated from backend API</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  renderList(component) {
    const config = component.config || {};
    const title = config.title || 'List';

    return `
      <div class="card">
        <div class="card-header">
          <h5>${title}</h5>
        </div>
        <div class="card-body">
          <ul class="list-group list-group-flush">
            <li class="list-group-item">Loading items...</li>
          </ul>
        </div>
      </div>
    `;
  }

  renderFormReference(config) {
    const formId = config.formId || config.formRef;
    if (!formId) {
      return `<div class="alert alert-warning">Form reference missing</div>`;
    }

    return `
      <div class="card mb-4">
        <div class="card-header bg-primary text-white">
          <h5 class="mb-0">${config.title || config.name || 'Form'}</h5>
        </div>
        <div class="card-body">
          <div id="form-${formId}" class="dynamic-form-container" data-form-id="${formId}">
            Loading form...
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render all forms associated with a page
   */
  renderPageForms(page, forms) {
    if (!page.forms || page.forms.length === 0) {
      return '';
    }

    let html = '<div class="page-forms-section">\n';

    page.forms.forEach(formId => {
      const form = forms.find(f => f.id === formId);
      if (form) {
        html += this.renderFullForm(form);
      }
    });

    html += '</div>\n';
    return html;
  }

  /**
   * Render a complete form with all fields
   */
  renderFullForm(form) {
    const fields = form.fields || [];
    const layout = form.layout || { type: 'single-column' };

    let html = `
      <div class="card mb-4">
        <div class="card-header bg-primary text-white">
          <h3 class="h5 mb-0">${form.title || form.name}</h3>
          ${form.description ? `<p class="small mb-0 mt-2">${form.description}</p>` : ''}
        </div>
        <div class="card-body">
          <form data-dynamic-form action="/forms/${form.id}/submit" method="POST">
    `;

    // Render form fields
    if (layout.sections && layout.sections.length > 0) {
      // Sectioned layout
      layout.sections.forEach(section => {
        html += `
            <div class="form-section mb-4">
              ${section.title ? `<h4 class="h6 text-muted mb-3">${section.title}</h4>` : ''}
              <div class="row g-3">
        `;

        section.fieldIds.forEach(fieldId => {
          const field = fields.find(f => f.id === fieldId);
          if (field) {
            const colClass = layout.type === 'two-column' ? 'col-md-6' : 'col-12';
            html += `
                <div class="${colClass}">
                  ${this.renderFormField(field)}
                </div>
            `;
          }
        });

        html += `
              </div>
            </div>
        `;
      });
    } else {
      // Simple layout
      fields.forEach(field => {
        html += `
            <div class="mb-3">
              ${this.renderFormField(field)}
            </div>
        `;
      });
    }

    // Form actions
    html += `
            <div class="mt-4 d-flex gap-2">
              <button type="submit" class="btn btn-primary">
                <i class="bi bi-check-circle"></i> Submit
              </button>
              <button type="reset" class="btn btn-outline-secondary">
                <i class="bi bi-x-circle"></i> Reset
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Render a single form field
   */
  renderFormField(field) {
    const type = field.type || 'text';
    const label = field.label || field.name;
    const required = field.validation?.required ? 'required' : '';
    const placeholder = field.placeholder || '';

    let inputHtml = '';

    switch (type) {
      case 'text':
      case 'email':
      case 'number':
      case 'date':
      case 'tel':
        inputHtml = `<input type="${type}" class="form-control" id="${field.id}" name="${field.name}" placeholder="${placeholder}" ${required}>`;
        break;

      case 'textarea':
        inputHtml = `<textarea class="form-control" id="${field.id}" name="${field.name}" rows="3" placeholder="${placeholder}" ${required}></textarea>`;
        break;

      case 'select':
        inputHtml = `
          <select class="form-select" id="${field.id}" name="${field.name}" ${required}>
            <option value="">Choose...</option>
            ${field.options ? field.options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('') : ''}
          </select>
        `;
        break;

      case 'checkbox':
        inputHtml = `
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="${field.id}" name="${field.name}" ${required}>
            <label class="form-check-label" for="${field.id}">${label}</label>
          </div>
        `;
        return inputHtml; // Checkbox has different structure

      case 'radio':
        inputHtml = `
          <div class="form-check">
            ${field.options ? field.options.map(opt => `
              <div class="form-check">
                <input class="form-check-input" type="radio" name="${field.name}" id="${field.id}_${opt.value}" value="${opt.value}" ${required}>
                <label class="form-check-label" for="${field.id}_${opt.value}">${opt.label}</label>
              </div>
            `).join('') : ''}
          </div>
        `;
        break;

      default:
        inputHtml = `<input type="text" class="form-control" id="${field.id}" name="${field.name}" placeholder="${placeholder}" ${required}>`;
    }

    return `
      <label for="${field.id}" class="form-label">${label}${required ? ' *' : ''}</label>
      ${inputHtml}
      ${field.helpText ? `<div class="form-text">${field.helpText}</div>` : ''}
    `;
  }

  /**
   * Generate complete page HTML with sections, components, and forms
   */
  generatePageHTML(pageId, forms = []) {
    const page = this.pageMap.get(pageId);
    if (!page) {
      return '<div class="alert alert-warning">Page not found</div>';
    }

    const sections = page.sections || [];
    const navigationMenu = this.getNavigationMenu(pageId);

    let html = '';

    // Navigation menu
    if (navigationMenu.length > 0) {
      html += '<nav class="navbar navbar-expand-lg navbar-light bg-light mb-4">\n';
      html += '  <div class="container-fluid">\n';
      html += `    <span class="navbar-brand">${page.name}</span>\n`;
      html += '    <ul class="navbar-nav">\n';
      navigationMenu.forEach(item => {
        html += `      <li class="nav-item"><a class="nav-link" href="${item.route}">${item.label}</a></li>\n`;
      });
      html += '    </ul>\n';
      html += '  </div>\n';
      html += '</nav>\n';
    }

    // Page title
    html += `<div class="mb-4">\n`;
    html += `  <h1>${page.title || page.name}</h1>\n`;
    if (page.description) {
      html += `  <p class="lead">${page.description}</p>\n`;
    }
    html += `</div>\n`;

    // Render sections
    sections.forEach(section => {
      const sectionType = section.type || 'main';
      const components = section.components || [];

      html += `<section class="page-section section-${sectionType} mb-4">\n`;

      if (section.title) {
        html += `  <h2 class="h4 mb-3">${section.title}</h2>\n`;
      }

      // Render components
      components.forEach(component => {
        html += `  ${this.renderComponent(component, pageId)}\n`;
      });

      html += `</section>\n`;
    });

    // Render page-level forms (forms in the page.forms array)
    if (page.forms && page.forms.length > 0 && forms.length > 0) {
      html += this.renderPageForms(page, forms);
    }

    return html;
  }

  /**
   * Generate route configuration for Express
   */
  generateRoutes() {
    const routes = [];

    this.pages.forEach(page => {
      routes.push({
        route: page.route,
        pageId: page.id,
        name: page.name,
        type: page.type
      });
    });

    return routes;
  }

  /**
   * Get the entry point page (dashboard or first page)
   */
  getEntryPage() {
    // Look for dashboard
    const dashboard = this.pages.find(p => p.type === 'dashboard');
    if (dashboard) return dashboard;

    // Look for page with route '/' or '/dashboard'
    const homePage = this.pages.find(p => p.route === '/' || p.route === '/dashboard');
    if (homePage) return homePage;

    // Return first page
    return this.pages[0] || null;
  }
}

module.exports = PageFlowGenerator;
