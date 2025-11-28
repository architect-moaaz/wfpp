/**
 * Application Validator Expert
 * Comprehensive validator for entire application package using reflection pattern
 * Validates workflows, forms, pages, data models, and cross-component connections
 */

const WorkflowValidator = require('../../validation/WorkflowValidator');

class ApplicationValidator {
  constructor() {
    this.name = 'ApplicationValidator';
    this.workflowValidator = new WorkflowValidator();
  }

  /**
   * Main validation method - validates entire application package
   */
  async validate(applicationPackage) {
    console.log('[ApplicationValidator] Starting comprehensive validation...');

    const report = {
      valid: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: 0,
        criticalIssues: 0,
        warnings: 0
      },
      components: {
        workflows: { valid: true, issues: [] },
        forms: { valid: true, issues: [] },
        pages: { valid: true, issues: [] },
        dataModels: { valid: true, issues: [] }
      },
      crossComponent: {
        valid: true,
        issues: []
      },
      recommendations: [],
      missingComponents: []
    };

    // Extract components
    const { workflows = [], forms = [], pages = [], dataModels = [] } = applicationPackage;

    // 1. Validate Workflows
    if (workflows.length > 0) {
      report.components.workflows = await this.validateWorkflows(workflows);
    } else {
      report.missingComponents.push({
        type: 'workflow',
        severity: 'critical',
        message: 'No workflows defined in application package'
      });
    }

    // 2. Validate Forms
    if (forms.length > 0) {
      report.components.forms = this.validateForms(forms);
    } else {
      report.missingComponents.push({
        type: 'form',
        severity: 'warning',
        message: 'No forms defined in application package'
      });
    }

    // 3. Validate Pages
    if (pages.length > 0) {
      report.components.pages = this.validatePages(pages);
    } else {
      report.missingComponents.push({
        type: 'page',
        severity: 'critical',
        message: 'No pages defined in application package'
      });
    }

    // 4. Validate Data Models
    if (dataModels.length > 0) {
      report.components.dataModels = this.validateDataModels(dataModels);
    } else {
      report.missingComponents.push({
        type: 'dataModel',
        severity: 'warning',
        message: 'No data models defined in application package'
      });
    }

    // 5. Cross-Component Validation
    report.crossComponent = this.validateCrossComponent({
      workflows,
      forms,
      pages,
      dataModels
    });

    // Calculate summary
    report.summary = this.calculateSummary(report);
    report.valid = report.summary.criticalIssues === 0;

    // Generate recommendations
    report.recommendations = this.generateRecommendations(report);

    console.log(`[ApplicationValidator] Validation complete. Valid: ${report.valid}, Issues: ${report.summary.totalIssues}`);

    return report;
  }

  /**
   * Validate workflows using existing WorkflowValidator
   */
  async validateWorkflows(workflows) {
    const result = {
      valid: true,
      issues: []
    };

    for (const workflow of workflows) {
      try {
        const validation = await this.workflowValidator.validate(workflow);

        if (!validation.valid) {
          result.valid = false;
          validation.errors.forEach(error => {
            result.issues.push({
              workflowId: workflow.id,
              workflowName: workflow.name,
              severity: 'critical',
              type: 'workflow_structure',
              message: error.message,
              details: error
            });
          });
        }

        // Check for warnings
        if (validation.warnings && validation.warnings.length > 0) {
          validation.warnings.forEach(warning => {
            result.issues.push({
              workflowId: workflow.id,
              workflowName: workflow.name,
              severity: 'warning',
              type: 'workflow_warning',
              message: warning.message,
              details: warning
            });
          });
        }
      } catch (error) {
        result.valid = false;
        result.issues.push({
          workflowId: workflow.id,
          workflowName: workflow.name,
          severity: 'critical',
          type: 'workflow_validation_error',
          message: `Workflow validation failed: ${error.message}`
        });
      }
    }

    return result;
  }

  /**
   * Validate forms structure and field definitions
   */
  validateForms(forms) {
    const result = {
      valid: true,
      issues: []
    };

    const formIds = new Set();

    forms.forEach(form => {
      // Check for duplicate IDs
      if (formIds.has(form.id)) {
        result.valid = false;
        result.issues.push({
          formId: form.id,
          formName: form.name,
          severity: 'critical',
          type: 'duplicate_id',
          message: `Duplicate form ID: ${form.id}`
        });
      }
      formIds.add(form.id);

      // Validate required properties
      if (!form.id || !form.name) {
        result.valid = false;
        result.issues.push({
          formId: form.id,
          formName: form.name,
          severity: 'critical',
          type: 'missing_required_property',
          message: 'Form missing required properties (id, name)'
        });
      }

      // Validate fields array
      if (!form.fields || !Array.isArray(form.fields)) {
        result.valid = false;
        result.issues.push({
          formId: form.id,
          formName: form.name,
          severity: 'critical',
          type: 'invalid_fields',
          message: 'Form has no fields or fields is not an array'
        });
        return;
      }

      // Validate each field
      const fieldNames = new Set();
      form.fields.forEach((field, index) => {
        // Check for duplicate field names
        if (fieldNames.has(field.name)) {
          result.issues.push({
            formId: form.id,
            formName: form.name,
            severity: 'warning',
            type: 'duplicate_field_name',
            message: `Duplicate field name in form: ${field.name}`
          });
        }
        fieldNames.add(field.name);

        // Validate required field properties
        if (!field.name || !field.type) {
          result.valid = false;
          result.issues.push({
            formId: form.id,
            formName: form.name,
            severity: 'critical',
            type: 'invalid_field',
            message: `Field at index ${index} missing required properties (name, type)`
          });
        }

        // Validate field type
        const validFieldTypes = ['text', 'email', 'number', 'date', 'select', 'checkbox', 'radio', 'textarea', 'file'];
        if (field.type && !validFieldTypes.includes(field.type)) {
          result.issues.push({
            formId: form.id,
            formName: form.name,
            fieldName: field.name,
            severity: 'warning',
            type: 'invalid_field_type',
            message: `Unknown field type: ${field.type}`
          });
        }

        // Validate required validation
        if (field.required && typeof field.required !== 'boolean') {
          result.issues.push({
            formId: form.id,
            formName: form.name,
            fieldName: field.name,
            severity: 'warning',
            type: 'invalid_validation',
            message: 'Field required property should be boolean'
          });
        }

        // Validate select/radio options
        if ((field.type === 'select' || field.type === 'radio') && (!field.options || !Array.isArray(field.options))) {
          result.issues.push({
            formId: form.id,
            formName: form.name,
            fieldName: field.name,
            severity: 'warning',
            type: 'missing_options',
            message: `Field type ${field.type} should have options array`
          });
        }
      });

      // Check for empty forms
      if (form.fields.length === 0) {
        result.issues.push({
          formId: form.id,
          formName: form.name,
          severity: 'warning',
          type: 'empty_form',
          message: 'Form has no fields defined'
        });
      }

      // Validate form wizard configuration if present
      if (form.wizard) {
        if (!form.wizard.steps || !Array.isArray(form.wizard.steps)) {
          result.valid = false;
          result.issues.push({
            formId: form.id,
            formName: form.name,
            severity: 'critical',
            type: 'invalid_wizard',
            message: 'Form wizard configuration missing steps array'
          });
        } else if (form.wizard.steps.length === 0) {
          result.issues.push({
            formId: form.id,
            formName: form.name,
            severity: 'warning',
            type: 'empty_wizard',
            message: 'Form wizard has no steps defined'
          });
        }
      }
    });

    return result;
  }

  /**
   * Validate pages structure, sections, components, and navigation
   */
  validatePages(pages) {
    const result = {
      valid: true,
      issues: []
    };

    const pageIds = new Set();
    const routes = new Set();

    pages.forEach(page => {
      // Check for duplicate IDs
      if (pageIds.has(page.id)) {
        result.valid = false;
        result.issues.push({
          pageId: page.id,
          pageName: page.name,
          severity: 'critical',
          type: 'duplicate_id',
          message: `Duplicate page ID: ${page.id}`
        });
      }
      pageIds.add(page.id);

      // Check for duplicate routes
      if (page.route) {
        if (routes.has(page.route)) {
          result.valid = false;
          result.issues.push({
            pageId: page.id,
            pageName: page.name,
            severity: 'critical',
            type: 'duplicate_route',
            message: `Duplicate page route: ${page.route}`
          });
        }
        routes.add(page.route);
      } else {
        result.valid = false;
        result.issues.push({
          pageId: page.id,
          pageName: page.name,
          severity: 'critical',
          type: 'missing_route',
          message: 'Page missing route property'
        });
      }

      // Validate required properties
      if (!page.id || !page.name) {
        result.valid = false;
        result.issues.push({
          pageId: page.id,
          pageName: page.name,
          severity: 'critical',
          type: 'missing_required_property',
          message: 'Page missing required properties (id, name)'
        });
      }

      // Validate page type
      const validPageTypes = ['list', 'detail', 'form', 'dashboard', 'auth', 'confirmation'];
      if (page.type && !validPageTypes.includes(page.type)) {
        result.issues.push({
          pageId: page.id,
          pageName: page.name,
          severity: 'warning',
          type: 'invalid_page_type',
          message: `Unknown page type: ${page.type}`
        });
      }

      // Validate sections
      if (!page.sections || !Array.isArray(page.sections)) {
        result.valid = false;
        result.issues.push({
          pageId: page.id,
          pageName: page.name,
          severity: 'critical',
          type: 'missing_sections',
          message: 'Page missing sections array'
        });
      } else {
        if (page.sections.length === 0) {
          result.issues.push({
            pageId: page.id,
            pageName: page.name,
            severity: 'warning',
            type: 'empty_page',
            message: 'Page has no sections defined'
          });
        }

        // Validate each section
        page.sections.forEach((section, sectionIndex) => {
          if (!section.id || !section.type) {
            result.issues.push({
              pageId: page.id,
              pageName: page.name,
              severity: 'warning',
              type: 'invalid_section',
              message: `Section at index ${sectionIndex} missing required properties (id, type)`
            });
          }

          // Validate components in section
          if (!section.components || !Array.isArray(section.components)) {
            result.issues.push({
              pageId: page.id,
              pageName: page.name,
              sectionId: section.id,
              severity: 'warning',
              type: 'missing_components',
              message: `Section ${section.id} missing components array`
            });
          } else if (section.components.length === 0) {
            result.issues.push({
              pageId: page.id,
              pageName: page.name,
              sectionId: section.id,
              severity: 'warning',
              type: 'empty_section',
              message: `Section ${section.id} has no components`
            });
          } else {
            // Validate each component
            section.components.forEach((component, compIndex) => {
              if (!component.type) {
                result.issues.push({
                  pageId: page.id,
                  pageName: page.name,
                  sectionId: section.id,
                  severity: 'warning',
                  type: 'invalid_component',
                  message: `Component at index ${compIndex} in section ${section.id} missing type`
                });
              }

              if (!component.config || typeof component.config !== 'object') {
                result.issues.push({
                  pageId: page.id,
                  pageName: page.name,
                  sectionId: section.id,
                  componentType: component.type,
                  severity: 'warning',
                  type: 'missing_component_config',
                  message: `Component ${component.type} missing config object`
                });
              }
            });
          }
        });
      }

      // Validate navigation structure
      if (!page.navigation) {
        result.issues.push({
          pageId: page.id,
          pageName: page.name,
          severity: 'warning',
          type: 'missing_navigation',
          message: 'Page missing navigation object'
        });
      } else {
        // Check onAction
        if (page.navigation.onAction && typeof page.navigation.onAction !== 'object') {
          result.issues.push({
            pageId: page.id,
            pageName: page.name,
            severity: 'warning',
            type: 'invalid_navigation',
            message: 'Page navigation.onAction should be an object'
          });
        }

        // Check menu
        if (page.navigation.menu && !Array.isArray(page.navigation.menu)) {
          result.issues.push({
            pageId: page.id,
            pageName: page.name,
            severity: 'warning',
            type: 'invalid_navigation',
            message: 'Page navigation.menu should be an array'
          });
        }
      }

      // Validate layout
      if (!page.layout) {
        result.issues.push({
          pageId: page.id,
          pageName: page.name,
          severity: 'warning',
          type: 'missing_layout',
          message: 'Page missing layout configuration'
        });
      }
    });

    return result;
  }

  /**
   * Validate data models schema and constraints
   */
  validateDataModels(dataModels) {
    const result = {
      valid: true,
      issues: []
    };

    const modelNames = new Set();

    dataModels.forEach(model => {
      // Check for duplicate model names
      if (modelNames.has(model.name)) {
        result.valid = false;
        result.issues.push({
          modelName: model.name,
          severity: 'critical',
          type: 'duplicate_model_name',
          message: `Duplicate data model name: ${model.name}`
        });
      }
      modelNames.add(model.name);

      // Validate required properties
      if (!model.name) {
        result.valid = false;
        result.issues.push({
          modelName: model.name,
          severity: 'critical',
          type: 'missing_required_property',
          message: 'Data model missing name property'
        });
      }

      // Validate schema
      if (!model.schema || typeof model.schema !== 'object') {
        result.valid = false;
        result.issues.push({
          modelName: model.name,
          severity: 'critical',
          type: 'missing_schema',
          message: 'Data model missing schema object'
        });
        return;
      }

      // Validate schema fields
      if (Object.keys(model.schema).length === 0) {
        result.issues.push({
          modelName: model.name,
          severity: 'warning',
          type: 'empty_schema',
          message: 'Data model schema has no fields'
        });
      }

      // Validate each field in schema
      Object.entries(model.schema).forEach(([fieldName, fieldDef]) => {
        if (!fieldDef || typeof fieldDef !== 'object') {
          result.issues.push({
            modelName: model.name,
            fieldName,
            severity: 'warning',
            type: 'invalid_field_definition',
            message: `Field ${fieldName} has invalid definition`
          });
          return;
        }

        // Validate field type
        const validTypes = ['String', 'Number', 'Boolean', 'Date', 'ObjectId', 'Array', 'Object', 'Mixed'];
        if (fieldDef.type && !validTypes.includes(fieldDef.type)) {
          result.issues.push({
            modelName: model.name,
            fieldName,
            severity: 'warning',
            type: 'invalid_field_type',
            message: `Field ${fieldName} has unknown type: ${fieldDef.type}`
          });
        }

        // Validate relationships
        if (fieldDef.ref) {
          if (fieldDef.type !== 'ObjectId') {
            result.issues.push({
              modelName: model.name,
              fieldName,
              severity: 'warning',
              type: 'invalid_relationship',
              message: `Field ${fieldName} has ref but type is not ObjectId`
            });
          }
        }
      });

      // Check for common required fields
      if (!model.schema.createdAt && !model.schema.created_at) {
        result.issues.push({
          modelName: model.name,
          severity: 'info',
          type: 'missing_timestamp',
          message: 'Data model missing createdAt timestamp field'
        });
      }
    });

    return result;
  }

  /**
   * Validate cross-component connections
   */
  validateCrossComponent({ workflows, forms, pages, dataModels }) {
    const result = {
      valid: true,
      issues: []
    };

    // Create lookup maps
    const formIds = new Set(forms.map(f => f.id));
    const pageRoutes = new Set(pages.map(p => p.route));
    const modelNames = new Set(dataModels.map(m => m.name));

    // 1. Validate form references in pages
    pages.forEach(page => {
      if (page.sections) {
        page.sections.forEach(section => {
          if (section.components) {
            section.components.forEach(component => {
              if (component.formRef && !formIds.has(component.formRef)) {
                result.valid = false;
                result.issues.push({
                  pageId: page.id,
                  pageName: page.name,
                  componentType: component.type,
                  severity: 'critical',
                  type: 'invalid_form_reference',
                  message: `Component references non-existent form: ${component.formRef}`
                });
              }
            });
          }
        });
      }
    });

    // 2. Validate navigation targets in pages
    pages.forEach(page => {
      if (page.navigation && page.navigation.onAction) {
        Object.entries(page.navigation.onAction).forEach(([action, actionData]) => {
          if (actionData.type === 'navigate' && actionData.target) {
            if (!pageRoutes.has(actionData.target)) {
              result.issues.push({
                pageId: page.id,
                pageName: page.name,
                action,
                severity: 'warning',
                type: 'invalid_navigation_target',
                message: `Navigation action '${action}' targets non-existent route: ${actionData.target}`
              });
            }
          }
        });
      }

      if (page.navigation && page.navigation.menu) {
        page.navigation.menu.forEach(menuItem => {
          if (menuItem.route && !pageRoutes.has(menuItem.route)) {
            result.issues.push({
              pageId: page.id,
              pageName: page.name,
              menuLabel: menuItem.label,
              severity: 'warning',
              type: 'invalid_menu_target',
              message: `Menu item '${menuItem.label}' targets non-existent route: ${menuItem.route}`
            });
          }
        });
      }
    });

    // 3. Validate data model references in pages
    pages.forEach(page => {
      if (page.sections) {
        page.sections.forEach(section => {
          if (section.components) {
            section.components.forEach(component => {
              if (component.dataBinding) {
                const modelName = component.dataBinding.split('.')[0];
                if (!modelNames.has(modelName)) {
                  result.issues.push({
                    pageId: page.id,
                    pageName: page.name,
                    componentType: component.type,
                    severity: 'warning',
                    type: 'invalid_data_binding',
                    message: `Component references non-existent data model: ${modelName}`
                  });
                }
              }
            });
          }
        });
      }
    });

    // 4. Validate workflow task form references
    workflows.forEach(workflow => {
      if (workflow.nodes) {
        workflow.nodes.forEach(node => {
          if (node.type === 'userTask' && node.formRef && !formIds.has(node.formRef)) {
            result.valid = false;
            result.issues.push({
              workflowId: workflow.id,
              workflowName: workflow.name,
              nodeId: node.id,
              severity: 'critical',
              type: 'invalid_task_form_reference',
              message: `User task '${node.name}' references non-existent form: ${node.formRef}`
            });
          }
        });
      }
    });

    // 5. Check for orphaned components
    const usedFormIds = new Set();
    pages.forEach(page => {
      if (page.sections) {
        page.sections.forEach(section => {
          if (section.components) {
            section.components.forEach(component => {
              if (component.formRef) usedFormIds.add(component.formRef);
            });
          }
        });
      }
    });

    workflows.forEach(workflow => {
      if (workflow.nodes) {
        workflow.nodes.forEach(node => {
          if (node.formRef) usedFormIds.add(node.formRef);
        });
      }
    });

    forms.forEach(form => {
      if (!usedFormIds.has(form.id)) {
        result.issues.push({
          formId: form.id,
          formName: form.name,
          severity: 'info',
          type: 'orphaned_form',
          message: `Form is not referenced by any page or workflow: ${form.name}`
        });
      }
    });

    // 6. Check for unreachable pages
    const referencedRoutes = new Set();
    pages.forEach(page => {
      if (page.navigation) {
        if (page.navigation.onAction) {
          Object.values(page.navigation.onAction).forEach(action => {
            if (action.type === 'navigate' && action.target) {
              referencedRoutes.add(action.target);
            }
          });
        }
        if (page.navigation.menu) {
          page.navigation.menu.forEach(item => {
            if (item.route) referencedRoutes.add(item.route);
          });
        }
      }
    });

    pages.forEach(page => {
      // Assume first page or dashboard is entry point
      const isEntryPoint = page.type === 'dashboard' || page.type === 'auth';
      if (!isEntryPoint && !referencedRoutes.has(page.route)) {
        result.issues.push({
          pageId: page.id,
          pageName: page.name,
          route: page.route,
          severity: 'info',
          type: 'unreachable_page',
          message: `Page may be unreachable (no navigation references): ${page.name}`
        });
      }
    });

    return result;
  }

  /**
   * Calculate summary statistics
   */
  calculateSummary(report) {
    const summary = {
      totalIssues: 0,
      criticalIssues: 0,
      warnings: 0,
      info: 0
    };

    // Count issues from all components
    ['workflows', 'forms', 'pages', 'dataModels'].forEach(componentType => {
      const component = report.components[componentType];
      if (component && component.issues) {
        component.issues.forEach(issue => {
          summary.totalIssues++;
          if (issue.severity === 'critical') summary.criticalIssues++;
          else if (issue.severity === 'warning') summary.warnings++;
          else if (issue.severity === 'info') summary.info++;
        });
      }
    });

    // Count cross-component issues
    if (report.crossComponent && report.crossComponent.issues) {
      report.crossComponent.issues.forEach(issue => {
        summary.totalIssues++;
        if (issue.severity === 'critical') summary.criticalIssues++;
        else if (issue.severity === 'warning') summary.warnings++;
        else if (issue.severity === 'info') summary.info++;
      });
    }

    // Count missing components
    if (report.missingComponents) {
      report.missingComponents.forEach(missing => {
        summary.totalIssues++;
        if (missing.severity === 'critical') summary.criticalIssues++;
        else if (missing.severity === 'warning') summary.warnings++;
      });
    }

    return summary;
  }

  /**
   * Generate recommendations based on validation results
   */
  generateRecommendations(report) {
    const recommendations = [];

    // Check for missing components
    if (report.missingComponents.length > 0) {
      const criticalMissing = report.missingComponents.filter(m => m.severity === 'critical');
      if (criticalMissing.length > 0) {
        recommendations.push({
          priority: 'high',
          category: 'missing_components',
          message: 'Critical components missing from application package',
          action: `Generate missing components: ${criticalMissing.map(m => m.type).join(', ')}`
        });
      }
    }

    // Check for critical workflow issues
    if (report.components.workflows && !report.components.workflows.valid) {
      const criticalWorkflowIssues = report.components.workflows.issues.filter(i => i.severity === 'critical');
      if (criticalWorkflowIssues.length > 0) {
        recommendations.push({
          priority: 'high',
          category: 'workflow_errors',
          message: `${criticalWorkflowIssues.length} critical workflow issues detected`,
          action: 'Fix workflow structure, connections, and node configurations'
        });
      }
    }

    // Check for broken cross-component references
    if (report.crossComponent && !report.crossComponent.valid) {
      const brokenReferences = report.crossComponent.issues.filter(i => i.severity === 'critical');
      if (brokenReferences.length > 0) {
        recommendations.push({
          priority: 'high',
          category: 'broken_references',
          message: `${brokenReferences.length} broken cross-component references detected`,
          action: 'Fix form references in pages and workflows'
        });
      }
    }

    // Check for navigation issues
    const navIssues = report.crossComponent?.issues?.filter(i =>
      i.type === 'invalid_navigation_target' || i.type === 'invalid_menu_target'
    ) || [];
    if (navIssues.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'navigation',
        message: `${navIssues.length} navigation issues detected`,
        action: 'Update page navigation to reference existing routes'
      });
    }

    // Check for empty components
    const emptyPages = report.components.pages?.issues?.filter(i =>
      i.type === 'empty_page' || i.type === 'empty_section'
    ) || [];
    if (emptyPages.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'empty_content',
        message: `${emptyPages.length} pages or sections have no content`,
        action: 'Add components to empty pages and sections'
      });
    }

    // Check for orphaned forms
    const orphanedForms = report.crossComponent?.issues?.filter(i =>
      i.type === 'orphaned_form'
    ) || [];
    if (orphanedForms.length > 0) {
      recommendations.push({
        priority: 'low',
        category: 'unused_components',
        message: `${orphanedForms.length} forms are not referenced`,
        action: 'Consider removing unused forms or linking them to pages/workflows'
      });
    }

    return recommendations;
  }

  /**
   * Format validation report for PlanningExpert
   */
  formatForPlanningExpert(report) {
    const message = {
      valid: report.valid,
      requiresRegeneration: report.summary.criticalIssues > 0,
      summary: report.summary,
      criticalIssues: [],
      warnings: [],
      recommendations: report.recommendations
    };

    // Collect all critical issues
    ['workflows', 'forms', 'pages', 'dataModels'].forEach(componentType => {
      const component = report.components[componentType];
      if (component && component.issues) {
        component.issues.forEach(issue => {
          if (issue.severity === 'critical') {
            message.criticalIssues.push({
              component: componentType,
              ...issue
            });
          } else if (issue.severity === 'warning') {
            message.warnings.push({
              component: componentType,
              ...issue
            });
          }
        });
      }
    });

    // Add cross-component critical issues
    if (report.crossComponent && report.crossComponent.issues) {
      report.crossComponent.issues.forEach(issue => {
        if (issue.severity === 'critical') {
          message.criticalIssues.push({
            component: 'cross_component',
            ...issue
          });
        } else if (issue.severity === 'warning') {
          message.warnings.push({
            component: 'cross_component',
            ...issue
          });
        }
      });
    }

    // Add missing components
    if (report.missingComponents) {
      report.missingComponents.forEach(missing => {
        if (missing.severity === 'critical') {
          message.criticalIssues.push({
            component: 'missing',
            ...missing
          });
        } else {
          message.warnings.push({
            component: 'missing',
            ...missing
          });
        }
      });
    }

    return message;
  }
}

module.exports = ApplicationValidator;
