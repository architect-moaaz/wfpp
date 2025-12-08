/**
 * UI Generator for Generated Applications
 *
 * Generates complete frontend UI layer with:
 * - Server-side rendered views (EJS templates)
 * - Form rendering engine
 * - Page rendering with data binding
 * - Responsive design with Bootstrap
 */

class UIGenerator {
  /**
   * Generate view templates
   */
  static generateViews() {
    return {
      // Base layout template
      'layout.ejs': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= title || 'Application' %></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        .sidebar { min-height: 100vh; background: #f8f9fa; }
        .nav-link.active { background: #007bff; color: white !important; }
        .form-field { margin-bottom: 1rem; }
        .page-component { margin-bottom: 1.5rem; }
    </style>
</head>
<body>
    <div class="container-fluid">
        <div class="row">
            <!-- Sidebar -->
            <nav class="col-md-2 sidebar p-3">
                <h5 class="mb-4"><%= appName || 'Application' %></h5>
                <ul class="nav flex-column">
                    <li class="nav-item">
                        <a class="nav-link <%= currentPage === 'home' ? 'active' : '' %>" href="/">
                            <i class="bi bi-house-door"></i> Home
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link <%= currentPage === 'forms' ? 'active' : '' %>" href="/forms">
                            <i class="bi bi-file-text"></i> Forms
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link <%= currentPage === 'pages' ? 'active' : '' %>" href="/pages">
                            <i class="bi bi-layout-text-window"></i> Pages
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link <%= currentPage === 'workflows' ? 'active' : '' %>" href="/workflows">
                            <i class="bi bi-diagram-3"></i> Workflows
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/api/health" target="_blank">
                            <i class="bi bi-activity"></i> API Status
                        </a>
                    </li>
                </ul>
            </nav>

            <!-- Main Content -->
            <main class="col-md-10 p-4">
                <%- body %>
            </main>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Form validation and submission handling
        document.addEventListener('DOMContentLoaded', function() {
            const forms = document.querySelectorAll('form[data-dynamic-form]');
            forms.forEach(form => {
                form.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    const formData = new FormData(form);
                    const data = Object.fromEntries(formData);

                    try {
                        const response = await fetch(form.action, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data)
                        });
                        const result = await response.json();

                        if (result.success) {
                            alert('Form submitted successfully!');
                            form.reset();
                        } else {
                            alert('Error: ' + (result.error || 'Submission failed'));
                        }
                    } catch (error) {
                        alert('Error submitting form: ' + error.message);
                    }
                });
            });
        });
    </script>
</body>
</html>`,

      // Home page
      'home.ejs': `<h1>Welcome to <%= appName %></h1>
<p class="lead"><%= appDescription || 'Your application is ready!' %></p>

<div class="row mt-4">
    <div class="col-md-12 mb-3">
        <div class="card border-primary">
            <div class="card-body text-center">
                <h5 class="card-title"><i class="bi bi-layout-text-window"></i> Application Pages</h5>
                <p class="card-text"><%= pageCount %> pages with embedded forms and workflows</p>
                <a href="/pages" class="btn btn-primary btn-lg">Explore Pages</a>
            </div>
        </div>
    </div>
</div>

<div class="row mt-3">
    <div class="col-md-6">
        <div class="card">
            <div class="card-body">
                <h5 class="card-title"><i class="bi bi-diagram-3"></i> Workflows</h5>
                <p class="card-text"><%= workflowCount %> automated workflows</p>
                <a href="/workflows" class="btn btn-outline-primary">View Workflows</a>
            </div>
        </div>
    </div>

    <div class="col-md-6">
        <div class="card">
            <div class="card-body">
                <h5 class="card-title"><i class="bi bi-file-text"></i> Forms</h5>
                <p class="card-text"><%= formCount %> forms (embedded in pages)</p>
                <a href="/forms" class="btn btn-outline-secondary">View All Forms</a>
            </div>
        </div>
    </div>
</div>

<div class="mt-4">
    <h3>Quick Start</h3>
    <ul>
        <li>Navigate to <a href="/pages">Pages</a> to interact with forms and content</li>
        <li>Monitor <a href="/workflows">Workflows</a> to track automation processes</li>
        <li>Access the <a href="/api/health" target="_blank">REST API</a> for programmatic integration</li>
    </ul>
</div>`,

      // Forms list page
      'forms-list.ejs': `<h1>Forms</h1>
<p class="lead">Available forms in this application</p>

<div class="row">
    <% forms.forEach(form => { %>
        <div class="col-md-6 mb-3">
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title"><%= form.title || form.name %></h5>
                    <p class="card-text"><%= form.description || 'No description' %></p>
                    <p class="text-muted">
                        <small><%= form.fields?.length || 0 %> fields</small>
                    </p>
                    <a href="/forms/<%= form.id %>" class="btn btn-primary">Open Form</a>
                </div>
            </div>
        </div>
    <% }); %>

    <% if (forms.length === 0) { %>
        <div class="col-12">
            <div class="alert alert-info">
                No forms available. Generate forms using ARES or create them manually.
            </div>
        </div>
    <% } %>
</div>`,

      // Individual form view
      'form.ejs': `<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h1><%= form.title || form.name %></h1>
        <% if (form.description) { %>
            <p class="lead"><%= form.description %></p>
        <% } %>
    </div>
    <a href="/forms" class="btn btn-outline-secondary">
        <i class="bi bi-arrow-left"></i> Back to Forms
    </a>
</div>

<div class="card">
    <div class="card-body">
        <form data-dynamic-form action="/forms/<%= form.id %>/submit" method="POST">
            <% if (form.fields && form.fields.length > 0) { %>
                <% form.fields.forEach(field => { %>
                    <div class="form-field">
                        <label for="<%= field.id %>" class="form-label">
                            <%= field.label || field.name %>
                            <% if (field.required) { %><span class="text-danger">*</span><% } %>
                        </label>

                        <% if (field.type === 'text' || field.type === 'email' || field.type === 'tel' || field.type === 'url') { %>
                            <input
                                type="<%= field.type %>"
                                class="form-control"
                                id="<%= field.id %>"
                                name="<%= field.name %>"
                                placeholder="<%= field.placeholder || '' %>"
                                <%= field.required ? 'required' : '' %>
                                <%= field.validation?.pattern ? 'pattern="' + field.validation.pattern + '"' : '' %>
                            >
                        <% } else if (field.type === 'textarea') { %>
                            <textarea
                                class="form-control"
                                id="<%= field.id %>"
                                name="<%= field.name %>"
                                rows="<%= field.rows || 3 %>"
                                placeholder="<%= field.placeholder || '' %>"
                                <%= field.required ? 'required' : '' %>
                            ></textarea>
                        <% } else if (field.type === 'select' || field.type === 'dropdown') { %>
                            <select
                                class="form-select"
                                id="<%= field.id %>"
                                name="<%= field.name %>"
                                <%= field.required ? 'required' : '' %>
                            >
                                <option value="">Select...</option>
                                <% (field.options || []).forEach(option => { %>
                                    <option value="<%= option.value %>"><%= option.label %></option>
                                <% }); %>
                            </select>
                        <% } else if (field.type === 'checkbox') { %>
                            <div class="form-check">
                                <input
                                    type="checkbox"
                                    class="form-check-input"
                                    id="<%= field.id %>"
                                    name="<%= field.name %>"
                                    value="true"
                                    <%= field.required ? 'required' : '' %>
                                >
                                <label class="form-check-label" for="<%= field.id %>">
                                    <%= field.description || '' %>
                                </label>
                            </div>
                        <% } else if (field.type === 'radio') { %>
                            <% (field.options || []).forEach((option, index) => { %>
                                <div class="form-check">
                                    <input
                                        type="radio"
                                        class="form-check-input"
                                        id="<%= field.id %>_<%= index %>"
                                        name="<%= field.name %>"
                                        value="<%= option.value %>"
                                        <%= field.required && index === 0 ? 'required' : '' %>
                                    >
                                    <label class="form-check-label" for="<%= field.id %>_<%= index %>">
                                        <%= option.label %>
                                    </label>
                                </div>
                            <% }); %>
                        <% } else if (field.type === 'number') { %>
                            <input
                                type="number"
                                class="form-control"
                                id="<%= field.id %>"
                                name="<%= field.name %>"
                                placeholder="<%= field.placeholder || '' %>"
                                <%= field.required ? 'required' : '' %>
                                <%= field.validation?.min !== undefined ? 'min="' + field.validation.min + '"' : '' %>
                                <%= field.validation?.max !== undefined ? 'max="' + field.validation.max + '"' : '' %>
                            >
                        <% } else if (field.type === 'date') { %>
                            <input
                                type="date"
                                class="form-control"
                                id="<%= field.id %>"
                                name="<%= field.name %>"
                                <%= field.required ? 'required' : '' %>
                            >
                        <% } else { %>
                            <input
                                type="text"
                                class="form-control"
                                id="<%= field.id %>"
                                name="<%= field.name %>"
                                placeholder="<%= field.placeholder || '' %>"
                                <%= field.required ? 'required' : '' %>
                            >
                        <% } %>

                        <% if (field.description) { %>
                            <small class="form-text text-muted"><%= field.description %></small>
                        <% } %>
                    </div>
                <% }); %>

                <div class="mt-4">
                    <button type="submit" class="btn btn-primary">
                        <i class="bi bi-check-circle"></i> Submit
                    </button>
                    <button type="reset" class="btn btn-outline-secondary">
                        <i class="bi bi-x-circle"></i> Reset
                    </button>
                </div>
            <% } else { %>
                <div class="alert alert-warning">
                    This form has no fields defined.
                </div>
            <% } %>
        </form>
    </div>
</div>`,

      // Pages list
      'pages-list.ejs': `<h1>Pages</h1>
<p class="lead">Available pages in this application</p>

<div class="row">
    <% pages.forEach(page => { %>
        <div class="col-md-6 mb-3">
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title"><%= page.title || page.name %></h5>
                    <p class="card-text"><%= page.description || 'No description' %></p>
                    <p class="text-muted">
                        <small>Route: <%= page.route || '/' + page.id %></small>
                    </p>
                    <a href="/pages/<%= page.id %>" class="btn btn-primary">View Page</a>
                </div>
            </div>
        </div>
    <% }); %>

    <% if (pages.length === 0) { %>
        <div class="col-12">
            <div class="alert alert-info">
                No pages available. Generate pages using ARES or create them manually.
            </div>
        </div>
    <% } %>
</div>`,

      // Individual page view
      'page.ejs': `<div class="mb-4">
    <h1><%= page.title || page.name %></h1>
    <% if (page.description) { %>
        <p class="lead"><%= page.description %></p>
    <% } %>
</div>

<% if (pageForms && pageForms.length > 0) { %>
    <% pageForms.forEach(form => { %>
        <div class="card mb-4">
            <div class="card-header bg-primary text-white">
                <h3 class="h5 mb-0"><%= form.title || form.name %></h3>
                <% if (form.description) { %>
                    <p class="small mb-0 mt-2"><%= form.description %></p>
                <% } %>
            </div>
            <div class="card-body">
                <form data-dynamic-form action="/forms/<%= form.id %>/submit" method="POST">
                    <% if (form.fields && form.fields.length > 0) { %>
                        <% if (form.layout && form.layout.sections && form.layout.sections.length > 0) { %>
                            <% form.layout.sections.forEach(section => { %>
                                <div class="form-section mb-4">
                                    <% if (section.title) { %>
                                        <h4 class="h6 text-muted mb-3"><%= section.title %></h4>
                                    <% } %>
                                    <div class="row g-3">
                                        <% section.fieldIds.forEach(fieldId => { %>
                                            <% const field = form.fields.find(f => f.id === fieldId); %>
                                            <% if (field) { %>
                                                <div class="col-md-<%= form.layout.type === 'two-column' ? '6' : '12' %>">
                                                    <%- include('partials/form-field', { field }) %>
                                                </div>
                                            <% } %>
                                        <% }); %>
                                    </div>
                                </div>
                            <% }); %>
                        <% } else { %>
                            <% form.fields.forEach(field => { %>
                                <div class="mb-3">
                                    <%- include('partials/form-field', { field }) %>
                                </div>
                            <% }); %>
                        <% } %>

                        <div class="mt-4 d-flex gap-2">
                            <button type="submit" class="btn btn-primary">
                                <i class="bi bi-check-circle"></i> Submit
                            </button>
                            <button type="reset" class="btn btn-outline-secondary">
                                <i class="bi bi-x-circle"></i> Reset
                            </button>
                        </div>
                    <% } else { %>
                        <div class="alert alert-warning">
                            This form has no fields defined.
                        </div>
                    <% } %>
                </form>
            </div>
        </div>
    <% }); %>
<% } else { %>
    <div class="card">
        <div class="card-body">
            <p class="text-muted mb-0">This page has no forms or content yet.</p>
        </div>
    </div>
<% } %>

<div class="mt-4">
    <a href="/" class="btn btn-outline-secondary">
        <i class="bi bi-house"></i> Back to Home
    </a>
</div>`,

      // Workflows list
      'workflows-list.ejs': `<h1>Workflows</h1>
<p class="lead">Available workflows in this application</p>

<div class="row">
    <% workflows.forEach(workflow => { %>
        <div class="col-md-6 mb-3">
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title"><%= workflow.name %></h5>
                    <p class="card-text"><%= workflow.description || 'No description' %></p>
                    <p class="text-muted">
                        <small>
                            Nodes: <%= workflow.nodes?.length || 0 %> |
                            Version: <%= workflow.version || '1.0.0' %>
                        </small>
                    </p>
                    <button class="btn btn-primary" onclick="startWorkflow('<%= workflow.id %>')">
                        <i class="bi bi-play-circle"></i> Start Workflow
                    </button>
                </div>
            </div>
        </div>
    <% }); %>

    <% if (workflows.length === 0) { %>
        <div class="col-12">
            <div class="alert alert-info">
                No workflows available. Generate workflows using ARES or create them manually.
            </div>
        </div>
    <% } %>
</div>

<script>
async function startWorkflow(workflowId) {
    try {
        const response = await fetch(\`/api/workflows/\${workflowId}/start\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        const result = await response.json();

        if (result.success) {
            alert('Workflow started! Instance ID: ' + result.instance.id);
        } else {
            alert('Error starting workflow: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}
</script>`,

      // Form field partial for reusable form rendering
      'partials/form-field.ejs': `<label for="<%= field.id %>" class="form-label">
    <%= field.label || field.name %>
    <% if (field.required) { %><span class="text-danger">*</span><% } %>
</label>

<% if (field.type === 'text' || field.type === 'email' || field.type === 'tel' || field.type === 'url') { %>
    <input
        type="<%= field.type %>"
        class="form-control"
        id="<%= field.id %>"
        name="<%= field.name %>"
        placeholder="<%= field.placeholder || '' %>"
        <%= field.required ? 'required' : '' %>
        <%= field.validation?.pattern ? 'pattern="' + field.validation.pattern + '"' : '' %>
    >
<% } else if (field.type === 'textarea') { %>
    <textarea
        class="form-control"
        id="<%= field.id %>"
        name="<%= field.name %>"
        rows="<%= field.rows || 3 %>"
        placeholder="<%= field.placeholder || '' %>"
        <%= field.required ? 'required' : '' %>
    ></textarea>
<% } else if (field.type === 'select' || field.type === 'dropdown') { %>
    <select
        class="form-select"
        id="<%= field.id %>"
        name="<%= field.name %>"
        <%= field.required ? 'required' : '' %>
    >
        <option value=""><%= field.placeholder || 'Select...' %></option>
        <% (field.options || []).forEach(option => { %>
            <% if (typeof option === 'string') { %>
                <option value="<%= option %>"><%= option %></option>
            <% } else { %>
                <option value="<%= option.value || option %>"><%= option.label || option %></option>
            <% } %>
        <% }); %>
    </select>
<% } else if (field.type === 'checkbox') { %>
    <div class="form-check">
        <input
            type="checkbox"
            class="form-check-input"
            id="<%= field.id %>"
            name="<%= field.name %>"
            value="true"
            <%= field.required ? 'required' : '' %>
        >
        <label class="form-check-label" for="<%= field.id %>">
            <%= field.label %>
        </label>
    </div>
<% } else if (field.type === 'radio') { %>
    <% (field.options || []).forEach((option, index) => { %>
        <div class="form-check">
            <input
                type="radio"
                class="form-check-input"
                id="<%= field.id %>_<%= index %>"
                name="<%= field.name %>"
                value="<%= typeof option === 'string' ? option : (option.value || option) %>"
                <%= field.required && index === 0 ? 'required' : '' %>
            >
            <label class="form-check-label" for="<%= field.id %>_<%= index %>">
                <%= typeof option === 'string' ? option : (option.label || option) %>
            </label>
        </div>
    <% }); %>
<% } else if (field.type === 'number') { %>
    <input
        type="number"
        class="form-control"
        id="<%= field.id %>"
        name="<%= field.name %>"
        placeholder="<%= field.placeholder || '' %>"
        <%= field.required ? 'required' : '' %>
        <%= field.validation?.min !== undefined ? 'min="' + field.validation.min + '"' : '' %>
        <%= field.validation?.max !== undefined ? 'max="' + field.validation.max + '"' : '' %>
    >
<% } else if (field.type === 'date') { %>
    <input
        type="date"
        class="form-control"
        id="<%= field.id %>"
        name="<%= field.name %>"
        <%= field.required ? 'required' : '' %>
    >
<% } else { %>
    <input
        type="text"
        class="form-control"
        id="<%= field.id %>"
        name="<%= field.name %>"
        placeholder="<%= field.placeholder || '' %>"
        <%= field.required ? 'required' : '' %>
    >
<% } %>

<% if (field.description && field.type !== 'checkbox') { %>
    <small class="form-text text-muted d-block mt-1"><%= field.description %></small>
<% } %>`
    };
  }
}

module.exports = UIGenerator;
