/**
 * UI Routes Template
 * Serves rendered views for forms, pages, and workflows
 */

const express = require('express');
const router = express.Router();
const path = require('path');

// Load resources
const workflows = require('../resources/workflows.json');
const forms = require('../resources/forms.json');
const pages = require('../resources/pages.json');
const dataModels = require('../resources/dataModels.json');

// Helper function to render with layout
function renderWithLayout(res, view, data) {
  const layoutData = {
    ...data,
    appName: process.env.APP_NAME || 'Application',
    currentPage: data.currentPage || 'home'
  };

  res.render(view, layoutData, (err, html) => {
    if (err) {
      console.error('Render error:', err);
      return res.status(500).send('Error rendering page');
    }
    res.render('layout', { ...layoutData, body: html });
  });
}

// Home page
router.get('/', (req, res) => {
  renderWithLayout(res, 'home', {
    title: 'Home',
    currentPage: 'home',
    appDescription: process.env.APP_DESCRIPTION || 'Welcome to your application',
    formCount: forms.length,
    pageCount: pages.length,
    workflowCount: workflows.length
  });
});

// Forms list
router.get('/forms', (req, res) => {
  renderWithLayout(res, 'forms-list', {
    title: 'Forms',
    currentPage: 'forms',
    forms
  });
});

// Individual form
router.get('/forms/:id', (req, res) => {
  const form = forms.find(f => f.id === req.params.id);

  if (!form) {
    return res.status(404).send('Form not found');
  }

  renderWithLayout(res, 'form', {
    title: form.title || form.name,
    currentPage: 'forms',
    form
  });
});

// Form submission
router.post('/forms/:id/submit', express.json(), async (req, res) => {
  const form = forms.find(f => f.id === req.params.id);

  if (!form) {
    return res.status(404).json({ success: false, error: 'Form not found' });
  }

  try {
    // Here you would typically save to database
    // For now, just return success
    console.log(`Form ${form.id} submitted with data:`, req.body);

    // You can add database saving logic here
    // Example: await saveFormSubmission(form.id, req.body);

    res.json({
      success: true,
      message: 'Form submitted successfully',
      data: req.body
    });
  } catch (error) {
    console.error('Form submission error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Pages list
router.get('/pages', (req, res) => {
  renderWithLayout(res, 'pages-list', {
    title: 'Pages',
    currentPage: 'pages',
    pages
  });
});

// Individual page
router.get('/pages/:id', (req, res) => {
  const page = pages.find(p => p.id === req.params.id);

  if (!page) {
    return res.status(404).send('Page not found');
  }

  renderWithLayout(res, 'page', {
    title: page.title || page.name,
    currentPage: 'pages',
    page
  });
});

// Workflows list
router.get('/workflows', (req, res) => {
  renderWithLayout(res, 'workflows-list', {
    title: 'Workflows',
    currentPage: 'workflows',
    workflows
  });
});

module.exports = router;
