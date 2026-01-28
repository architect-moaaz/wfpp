/**
 * Form Expert
 * Generates forms individually or in batches
 */

const Anthropic = require('@anthropic-ai/sdk');
const { generateSmartFormLayout, detectFormType, FORM_TYPE_LAYOUTS } = require('../../../utils/smart-layout');

class FormExpert {
  constructor() {
    this.name = 'FormExpert';
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    // Shadcn component mapping for form fields
    this.shadcnFieldMap = {
      text: { component: 'Input', imports: ['Input', 'Label'], props: { type: 'text' } },
      email: { component: 'Input', imports: ['Input', 'Label'], props: { type: 'email' } },
      password: { component: 'Input', imports: ['Input', 'Label'], props: { type: 'password' } },
      number: { component: 'Input', imports: ['Input', 'Label'], props: { type: 'number' } },
      phone: { component: 'Input', imports: ['Input', 'Label'], props: { type: 'tel' } },
      url: { component: 'Input', imports: ['Input', 'Label'], props: { type: 'url' } },
      textarea: { component: 'Textarea', imports: ['Textarea', 'Label'] },
      select: { component: 'Select', imports: ['Select', 'SelectTrigger', 'SelectValue', 'SelectContent', 'SelectItem', 'Label'] },
      multiselect: { component: 'Command', imports: ['Command', 'CommandInput', 'CommandList', 'CommandEmpty', 'CommandGroup', 'CommandItem', 'Popover', 'PopoverTrigger', 'PopoverContent', 'Badge'] },
      checkbox: { component: 'Checkbox', imports: ['Checkbox', 'Label'] },
      'checkbox-group': { component: 'Checkbox', imports: ['Checkbox', 'Label'], multiple: true },
      radio: { component: 'RadioGroup', imports: ['RadioGroup', 'RadioGroupItem', 'Label'] },
      toggle: { component: 'Switch', imports: ['Switch', 'Label'] },
      date: { component: 'DatePicker', imports: ['Popover', 'PopoverTrigger', 'PopoverContent', 'Calendar', 'Button'], pattern: 'date-picker' },
      'date-range': { component: 'DateRangePicker', imports: ['Popover', 'PopoverTrigger', 'PopoverContent', 'Calendar', 'Button'], pattern: 'date-range' },
      time: { component: 'Input', imports: ['Input', 'Label'], props: { type: 'time' } },
      datetime: { component: 'DateTimePicker', imports: ['Popover', 'PopoverTrigger', 'PopoverContent', 'Calendar', 'Button', 'Input'] },
      slider: { component: 'Slider', imports: ['Slider', 'Label'] },
      file: { component: 'Input', imports: ['Input', 'Label'], props: { type: 'file' } },
      color: { component: 'ColorPicker', imports: ['Popover', 'PopoverTrigger', 'PopoverContent', 'Input', 'Button'] },
      rating: { component: 'Custom', imports: ['Button'], pattern: 'star-rating' },
      tags: { component: 'Custom', imports: ['Badge', 'Input', 'Button'], pattern: 'tag-input' },
      autocomplete: { component: 'Command', imports: ['Command', 'CommandInput', 'CommandList', 'CommandEmpty', 'CommandGroup', 'CommandItem', 'Popover', 'PopoverTrigger', 'PopoverContent'] }
    };
  }

  /**
   * Get Shadcn component info for a field type
   */
  getShadcnComponentInfo(fieldType) {
    return this.shadcnFieldMap[fieldType] || this.shadcnFieldMap.text;
  }

  /**
   * Get all required Shadcn imports for a form's fields
   */
  getRequiredShadcnImports(fields) {
    const imports = new Set(['Form', 'FormItem', 'FormLabel', 'FormControl', 'FormDescription', 'FormMessage']);

    fields.forEach(field => {
      const componentInfo = this.getShadcnComponentInfo(field.type);
      if (componentInfo?.imports) {
        componentInfo.imports.forEach(imp => imports.add(imp));
      }
    });

    return Array.from(imports);
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
   * Generate a single form
   */
  async generateSingle(spec, componentPlan, existingComponents) {
    console.log(`[FormExpert] Generating form: ${spec.name}...`);
    if (spec.formAssociation?.forWorkflow) {
      console.log(`[FormExpert]   -> For workflow: ${spec.formAssociation.forWorkflow}, node: ${spec.formAssociation.forNodeLabel || spec.formAssociation.forNodeType}`);
    }

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

    const formText = response.content[0].text;
    const form = this.parseForm(formText);

    // POST-PROCESS: Add gridLayout using SMART LAYOUT if missing
    if (!form.gridLayout && form.fields) {
      console.log(`[FormExpert] Auto-generating SMART gridLayout for form: ${form.name}`);
      const smartLayout = this.getSmartLayoutInfo(form.fields, spec, componentPlan.designSystem);
      form.gridLayout = smartLayout.gridLayout;
      form.layout = smartLayout.layout; // Also update layout type
      form._smartLayoutInfo = smartLayout.designRecommendations;
    }

    // Preserve formAssociation metadata for later linking by ComponentOrchestrator
    if (spec.formAssociation) {
      form._formAssociation = spec.formAssociation;
      form._specName = spec.name; // Original spec name for matching
    }

    console.log(`[FormExpert] Generated form: ${form.name}`);
    return form;
  }

  /**
   * Generate multiple forms in one call (for parallel strategy)
   */
  async generateBatch(specs, componentPlan, existingComponents = {}) {
    if (specs.length === 0) return [];
    if (specs.length === 1) return [await this.generateSingle(specs[0], componentPlan, existingComponents)];

    console.log(`[FormExpert] Generating ${specs.length} forms in batch...`);
    specs.forEach(spec => {
      if (spec.formAssociation?.forWorkflow) {
        console.log(`[FormExpert]   -> ${spec.name}: workflow=${spec.formAssociation.forWorkflow}, node=${spec.formAssociation.forNodeLabel || spec.formAssociation.forNodeType}`);
      }
    });

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

    const formsText = response.content[0].text;
    const forms = this.parseForms(formsText);

    // Build a map of specs by name (case-insensitive) for matching
    const specsByName = new Map();
    specs.forEach(spec => {
      specsByName.set(spec.name.toLowerCase(), spec);
      // Also map by normalized name (replacing spaces with dashes)
      const normalizedName = spec.name.toLowerCase().replace(/\s+/g, '-');
      specsByName.set(normalizedName, spec);
    });

    // POST-PROCESS: Add SMART gridLayout if missing and attach formAssociation
    const processedForms = forms.map((form, index) => {
      // Find the matching spec for this form
      let matchedSpec = null;
      if (form.name) {
        matchedSpec = specsByName.get(form.name.toLowerCase());
      }
      if (!matchedSpec && index < specs.length) {
        matchedSpec = specs[index];
      }

      // Try matching by ID prefix (form IDs start with spec name)
      if (!matchedSpec && form.id) {
        for (const [specName, spec] of specsByName) {
          if (form.id.toLowerCase().startsWith(specName)) {
            matchedSpec = spec;
            break;
          }
        }
      }

      if (!form.gridLayout && form.fields) {
        console.log(`[FormExpert] Auto-generating SMART gridLayout for form: ${form.name}`);
        const smartLayout = this.getSmartLayoutInfo(form.fields, matchedSpec || {}, componentPlan.designSystem);
        form.gridLayout = smartLayout.gridLayout;
        form.layout = smartLayout.layout; // Also update layout type
        form._smartLayoutInfo = smartLayout.designRecommendations;
      }

      // Attach formAssociation metadata if found
      if (matchedSpec && matchedSpec.formAssociation) {
        form._formAssociation = matchedSpec.formAssociation;
        form._specName = matchedSpec.name;
        console.log(`[FormExpert] Attached formAssociation to "${form.name}" -> workflow: ${matchedSpec.formAssociation.forWorkflow}`);
      }

      return form;
    });

    console.log(`[FormExpert] Generated ${processedForms.length} forms`);
    return processedForms;
  }

  buildSinglePrompt(spec, componentPlan, existingComponents) {
    // Extract design system if available
    const designSystem = componentPlan.designSystem;
    const designGuidelines = designSystem ? this.formatDesignGuidelines(designSystem) : '';

    // Generate unique form ID to prevent duplicates
    const uniqueId = `${spec.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    // Extract layout and sizing specifications from design system
    const layoutColumns = designSystem?.layout?.columns?.desktop || 2;
    const gridWidth = 24; // Standard grid width for react-grid-layout

    // Extract component heights from design system (convert to grid units)
    // react-grid-layout uses grid units where 1 unit ≈ 30px typically
    // Standard input height from design system is ~40-42px = ~2 grid units base + padding
    const inputHeight = designSystem?.components?.input?.height || '40px';
    const textareaMinHeight = designSystem?.components?.textarea?.minHeight || '100px';

    // Extract spacing from design system
    const fieldGap = designSystem?.spacing?.fieldGap || '16px';
    const sectionGap = designSystem?.spacing?.sectionGap || '32px';

    // Calculate grid heights based on design system
    // Standard field: input (40px) + label (20px) + margin (24px) = ~84px ≈ 8 grid units
    // Textarea: textarea (100px) + label (20px) + margin (24px) = ~144px ≈ 12 grid units
    const standardFieldHeight = 8; // Grid units for standard fields
    const textareaFieldHeight = 12; // Grid units for textarea fields

    // Extract form association context from spec (for plan-based workflow linking)
    const formAssociation = spec.formAssociation || {};

    // Find associated workflow and its inputVariables
    let workflowInputVariables = [];
    let associatedWorkflow = null;
    if (formAssociation.forWorkflow && existingComponents.workflows) {
      associatedWorkflow = existingComponents.workflows.find(
        w => w.name?.toLowerCase() === formAssociation.forWorkflow.toLowerCase()
      );
      if (associatedWorkflow && associatedWorkflow.inputVariables) {
        workflowInputVariables = associatedWorkflow.inputVariables;
        console.log(`[FormExpert] Found ${workflowInputVariables.length} input variables from workflow "${associatedWorkflow.name}"`);
      }
    }

    // Build workflow variables context for the prompt
    const workflowVariablesContext = workflowInputVariables.length > 0 ? `
**WORKFLOW PROCESS VARIABLES (CRITICAL - Form fields MUST bind to these)**:
The workflow "${associatedWorkflow.name}" has defined the following process variables.
Your form fields MUST use matching "name" properties to bind to these variables:

${workflowInputVariables.map(v => `- ${v.name} (${v.type}${v.required ? ', required' : ''})${v.description ? ': ' + v.description : ''}`).join('\n')}

CRITICAL REQUIREMENTS:
1. Each form field's "name" property MUST exactly match a workflow variable name above
2. Field types should be compatible with the variable types (e.g., "number" type for number variables)
3. Required workflow variables should have required form fields
4. You may add additional fields if needed, but prioritize the workflow variables
5. Each field must include "bindToVariable": "<variable_name>" to explicitly link to the workflow variable
` : '';

    const workflowContext = formAssociation.forWorkflow ? `
**WORKFLOW CONTEXT (This form will be attached to a specific workflow node)**:
- Target Workflow: ${formAssociation.forWorkflow}
- Target Node Type: ${formAssociation.forNodeType || 'user task'}
- Target Node Label: ${formAssociation.forNodeLabel || 'N/A'}
- Associated Data Model: ${formAssociation.dataModel || 'N/A'}
${spec.fieldHints && spec.fieldHints.length > 0 ? `- Suggested Fields: ${spec.fieldHints.join(', ')}` : ''}
${workflowVariablesContext}
IMPORTANT: Design this form specifically for the "${formAssociation.forNodeType || 'user task'}" workflow node.
${formAssociation.forNodeType === 'startProcess' ? '- This is a START form - collect initial data to kick off the workflow process.' : ''}
${formAssociation.forNodeType === 'userTask' ? '- This is a USER TASK form - collect data needed for this specific step in the process.' : ''}
` : '';

    return `Generate a form for: ${spec.name}

Purpose: ${spec.purpose}
${spec.description ? `Description: ${spec.description}` : ''}
${workflowContext}
Context:
- Application: ${componentPlan.overview.name}
- Domain: ${componentPlan.overview.category || 'General'}
${existingComponents.dataModels ? `- Related data models: ${existingComponents.dataModels.map(dm => dm.name).join(', ')}` : ''}

${designGuidelines}

Requirements:
- Keep it simple (4-8 fields maximum)
- Include only essential fields for ${spec.name}
- Use appropriate field types (text, email, number, select, checkbox, date, etc.)
- Add validation rules where necessary
- Use clear labels and helpful placeholders
${designSystem ? '- CRITICAL: Apply the design system specifications above to ALL styling properties' : ''}

**MODERN FORM DESIGN REQUIREMENTS**:

1. **Floating Labels**: Set "labelPosition": "floating" for text, email, number, and password inputs
   - Creates a clean, modern appearance with labels that animate on focus

2. **Smart Field Pairing**: Group related fields horizontally on the same row:
   - firstName + lastName together (x: 0, w: 12) and (x: 12, w: 12)
   - city + state + zip on same row
   - email + phone together
   - startDate + endDate together
   - password + confirmPassword together

3. **Visual Sections**: Group fields into logical sections with headers:
   "layout": {
     "sections": [
       { "id": "personal", "title": "Personal Information", "icon": "user", "fieldIds": ["firstName", "lastName", "email"] },
       { "id": "address", "title": "Address", "icon": "map-pin", "fieldIds": ["street", "city", "state", "zip"] }
     ]
   }

4. **Inline Validation Config**: Include validation with user-friendly messages:
   "validation": {
     "mode": "onBlur",
     "showInline": true,
     "showIcon": true
   }
   And per-field: "errorMessage": "Please enter a valid email address"

5. **Input Style**: Use "inputStyle": "outlined" for Material-style inputs with borders

6. **CRITICAL - Select/Radio Options Format**:
   - ALWAYS use object format with "label" and "value" properties
   - NEVER use empty strings for value
   - Example: "options": [{"label": "Option 1", "value": "opt1"}, {"label": "Option 2", "value": "opt2"}]
   - For select fields: REQUIRED format is [{"label": "Display Text", "value": "actual_value"}]
   - For radio fields: REQUIRED format is [{"label": "Display Text", "value": "actual_value"}]

**CRITICAL - Layout Grid Coordinates (Based on Design System)**:
You MUST generate a "gridLayout" array with positioning for EACH field using these Design System specifications:

**Design System Values:**
- Layout: ${layoutColumns}-column desktop layout
- Input Height: ${inputHeight} (component height from design system)
- Textarea Min Height: ${textareaMinHeight} (component height from design system)
- Field Gap: ${fieldGap} (spacing between fields)
- Section Gap: ${sectionGap} (spacing between sections)

**Grid Calculation Rules:**
- Grid system: 24 units wide (full width = 24)
- Standard field height: ${standardFieldHeight} grid units (includes input ${inputHeight} + label + margins)
- Textarea field height: ${textareaFieldHeight} grid units (includes textarea ${textareaMinHeight} + label + margins)

Calculate x, y, w, h coordinates for each field:
  * x: horizontal position (0-23)
    - 1-column: always 0
    - 2-column: left column = 0, right column = 12
  * y: vertical position
    - Start at 0 for first field
    - Increment by previous field's height (${standardFieldHeight} or ${textareaFieldHeight})
    - Account for field gap (${fieldGap})
  * w: width in grid units based on ${layoutColumns}-column layout
    - Full width: 24
    - Half width (2-column): 12
    - Third width (3-column): 8
  * h: height in grid units from design system
    - Standard fields (text, email, number, select, etc.): ${standardFieldHeight}
    - Textarea fields: ${textareaFieldHeight}

Example for ${layoutColumns}-column layout:
- Field 1 (text): {i: "field1", x: 0, y: 0, w: ${layoutColumns === 1 ? 24 : 12}, h: ${standardFieldHeight}}
- Field 2 (email): {i: "field2", x: ${layoutColumns === 1 ? 0 : 12}, y: ${layoutColumns === 1 ? standardFieldHeight : 0}, w: ${layoutColumns === 1 ? 24 : 12}, h: ${standardFieldHeight}}
- Field 3 (textarea): {i: "field3", x: 0, y: ${layoutColumns === 1 ? standardFieldHeight * 2 : standardFieldHeight}, w: 24, h: ${textareaFieldHeight}}

Return ONLY valid JSON in this format:
{
  "id": "${uniqueId}",
  "name": "${spec.name}",
  "title": "Form Title",
  "description": "Brief description of form purpose",
  "fields": [
    {
      "id": "field-id",
      "name": "fieldName",
      "type": "text|email|number|select|checkbox|radio|date|textarea|file",
      "label": "Field Label",
      "placeholder": "Placeholder text",
      "required": true|false,
      "labelPosition": "floating|top|left",
      "inputStyle": "outlined|filled|standard",
      "validation": {
        "min": 0,
        "max": 100,
        "pattern": "regex-pattern",
        "message": "Validation error message"
      },
      "errorMessage": "User-friendly validation error",
      "options": [{"label": "Option 1", "value": "option1"}, {"label": "Option 2", "value": "option2"}],
      "defaultValue": null,
      "bindToVariable": "variableName"
    }
  ],
  "gridLayout": [
    {
      "i": "field-id",
      "x": 0,
      "y": 0,
      "w": ${layoutColumns === 1 ? 24 : 12},
      "h": 8,
      "minW": 6,
      "minH": 6
    }
  ],
  "layout": {
    "type": "single-column|two-column|grid",
    "sections": [
      {
        "id": "section-id",
        "title": "Section Title",
        "description": "Optional section description",
        "icon": "user|mail|map-pin|calendar|lock|file",
        "fieldIds": ["field1", "field2"]
      }
    ]
  },
  "submitButton": {
    "label": "Submit",
    "position": "right"
  },
  "validation": {
    "mode": "onSubmit|onChange|onBlur",
    "showErrors": true,
    "showInline": true,
    "showIcon": true
  },
  "styling": {
    "colors": {
      "primary": "#color",
      "secondary": "#color",
      "background": "#color",
      "text": "#color",
      "border": "#color"
    },
    "typography": {
      "fontFamily": "font-family-name",
      "fontSize": {
        "label": "size",
        "input": "size"
      },
      "fontWeight": {
        "label": "weight",
        "input": "weight"
      }
    },
    "spacing": {
      "fieldGap": "gap-size",
      "sectionGap": "gap-size",
      "inputPadding": "padding-size"
    },
    "components": {
      "input": {
        "borderRadius": "radius",
        "borderWidth": "width",
        "height": "height"
      },
      "button": {
        "primary": {
          "background": "#color",
          "color": "#color",
          "padding": "padding-size"
        }
      }
    }
  }
}`;
  }

  buildBatchPrompt(specs, componentPlan, existingComponents = {}) {
    // Generate unique IDs for each form spec
    const specsWithIds = specs.map(s => ({
      ...s,
      uniqueId: `${s.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
    }));

    // Build spec list with workflow association context and process variables
    const specList = specsWithIds.map(s => {
      let specLine = `- ${s.name} (ID: ${s.uniqueId}): ${s.purpose}`;
      if (s.formAssociation && s.formAssociation.forWorkflow) {
        specLine += `\n    - Workflow: ${s.formAssociation.forWorkflow}`;
        specLine += `\n    - Node Type: ${s.formAssociation.forNodeType || 'user task'}`;
        specLine += `\n    - Node Label: ${s.formAssociation.forNodeLabel || 'N/A'}`;
        if (s.formAssociation.dataModel) {
          specLine += `\n    - Data Model: ${s.formAssociation.dataModel}`;
        }
        if (s.fieldHints && s.fieldHints.length > 0) {
          specLine += `\n    - Suggested Fields: ${s.fieldHints.join(', ')}`;
        }

        // Find associated workflow and its inputVariables
        if (existingComponents.workflows) {
          const associatedWorkflow = existingComponents.workflows.find(
            w => w.name?.toLowerCase() === s.formAssociation.forWorkflow.toLowerCase()
          );
          if (associatedWorkflow && associatedWorkflow.inputVariables && associatedWorkflow.inputVariables.length > 0) {
            specLine += `\n    - **PROCESS VARIABLES (form fields MUST bind to these)**:`;
            associatedWorkflow.inputVariables.forEach(v => {
              specLine += `\n      * ${v.name} (${v.type}${v.required ? ', required' : ''})${v.description ? ': ' + v.description : ''}`;
            });
          }
        }
      }
      return specLine;
    }).join('\n');

    // Extract design system if available
    const designSystem = componentPlan.designSystem;
    const designGuidelines = designSystem ? this.formatDesignGuidelines(designSystem) : '';

    // Extract layout and sizing specifications from design system
    const layoutColumns = designSystem?.layout?.columns?.desktop || 2;

    // Extract component heights from design system
    const inputHeight = designSystem?.components?.input?.height || '40px';
    const textareaMinHeight = designSystem?.components?.textarea?.minHeight || '100px';

    // Extract spacing from design system
    const fieldGap = designSystem?.spacing?.fieldGap || '16px';
    const sectionGap = designSystem?.spacing?.sectionGap || '32px';

    // Calculate grid heights based on design system
    const standardFieldHeight = 8; // Grid units for standard fields
    const textareaFieldHeight = 12; // Grid units for textarea fields

    // Check if any forms have workflow associations
    const hasWorkflowContext = specsWithIds.some(s => s.formAssociation?.forWorkflow);
    const hasProcessVariables = existingComponents.workflows?.some(w => w.inputVariables?.length > 0);
    const workflowGuidance = hasWorkflowContext ? `
**WORKFLOW CONTEXT - IMPORTANT**:
Each form listed above has a target workflow and node. Design each form specifically for its workflow context:
- START PROCESS forms: Collect initial data to kick off the workflow. Include fields for the primary entity being created/processed.
- USER TASK forms: Collect data needed for that specific step. May include review fields, approval fields, additional data fields, etc.
- Forms for the SAME workflow should be coherent and build on each other (e.g., a review form should reference data from the start form).
- Forms for DIFFERENT workflows should be distinct and appropriate for their specific process.
${hasProcessVariables ? `
**CRITICAL - PROCESS VARIABLE BINDING**:
When a form lists "PROCESS VARIABLES", you MUST:
1. Create form fields with "name" properties that EXACTLY match the variable names
2. Use compatible field types (e.g., "number" input for number variables, "email" for email strings)
3. Mark fields as required if the variable is required
4. Include "bindToVariable": "<variable_name>" in each field to explicitly link it
5. You may add additional fields beyond the process variables if needed for the form's purpose
` : ''}` : '';

    return `Generate ${specs.length} forms for: ${componentPlan.overview.name}

Forms needed (each with its workflow association):
${specList}
${workflowGuidance}
${designGuidelines}

Requirements for EACH form:
- Keep it simple (4-8 fields maximum per form)
- Include only essential fields relevant to the form's workflow context
- Use appropriate field types
- Add validation rules where necessary
- Use clear labels and helpful placeholders
- Each form should be UNIQUE and tailored to its specific workflow node
- CRITICAL: Use the EXACT ID provided above for each form (e.g., first form uses ${specsWithIds[0].uniqueId})
- **CRITICAL - Select/Radio Options**: ALWAYS use [{"label": "Display Text", "value": "actual_value"}] format. NEVER use empty strings for value.
${designSystem ? '- CRITICAL: Apply the design system specifications above to ALL styling properties' : ''}

**CRITICAL - Layout Grid Coordinates for EACH Form (Based on Design System)**:
Each form MUST include a "gridLayout" array with positioning for EACH field using these Design System specifications:

**Design System Values:**
- Layout: ${layoutColumns}-column desktop layout
- Input Height: ${inputHeight} (component height from design system)
- Textarea Min Height: ${textareaMinHeight} (component height from design system)
- Field Gap: ${fieldGap} (spacing between fields)
- Section Gap: ${sectionGap} (spacing between sections)

**Grid Calculation Rules:**
- Grid system: 24 units wide (full width = 24)
- Standard field height: ${standardFieldHeight} grid units (includes input ${inputHeight} + label + margins)
- Textarea field height: ${textareaFieldHeight} grid units (includes textarea ${textareaMinHeight} + label + margins)

Calculate x, y, w, h coordinates for each field:
  * x: horizontal position based on ${layoutColumns}-column layout
  * y: vertical position (increment by field height)
  * w: width in grid units (24 full, 12 half, 8 third)
  * h: height from design system (${standardFieldHeight} standard, ${textareaFieldHeight} textarea)

Example layout for ${layoutColumns}-column form:
- Field 1 (text): {i: "field1", x: 0, y: 0, w: ${layoutColumns === 1 ? 24 : 12}, h: ${standardFieldHeight}, minW: 6, minH: 6}
- Field 2 (email): {i: "field2", x: ${layoutColumns === 1 ? 0 : 12}, y: ${layoutColumns === 1 ? standardFieldHeight : 0}, w: ${layoutColumns === 1 ? 24 : 12}, h: ${standardFieldHeight}, minW: 6, minH: 6}
- Field 3 (textarea): {i: "field3", x: 0, y: ${layoutColumns === 1 ? standardFieldHeight * 2 : standardFieldHeight}, w: 24, h: ${textareaFieldHeight}, minW: 6, minH: 6}

Return ONLY valid JSON array:
[
  {
    "id": "use-exact-id-from-above",
    "name": "FormName",
    "title": "Form Title",
    "description": "Brief description",
    "fields": [...],
    "gridLayout": [
      {
        "i": "field-id",
        "x": 0,
        "y": 0,
        "w": ${layoutColumns === 1 ? 24 : 12},
        "h": 8,
        "minW": 6,
        "minH": 6
      }
    ],
    "layout": {
      "type": "single-column|two-column|grid",
      "sections": [...]
    },
    "submitButton": {
      "label": "Submit",
      "position": "right"
    },
    "validation": {
      "mode": "onSubmit|onChange|onBlur",
      "showErrors": true
    },
    "styling": {
      "colors": {
        "primary": "#color",
        "secondary": "#color",
        "background": "#color",
        "text": "#color",
        "border": "#color"
      },
      "typography": {
        "fontFamily": "font-family-name",
        "fontSize": {
          "label": "size",
          "input": "size"
        },
        "fontWeight": {
          "label": "weight",
          "input": "weight"
        }
      },
      "spacing": {
        "fieldGap": "gap-size",
        "sectionGap": "gap-size",
        "inputPadding": "padding-size"
      },
      "components": {
        "input": {
          "borderRadius": "radius",
          "borderWidth": "width",
          "height": "height"
        },
        "button": {
          "primary": {
            "background": "#color",
            "color": "#color",
            "padding": "padding-size"
          }
        }
      }
    }
  }
]`;
  }

  /**
   * Generate gridLayout from form fields using SMART LAYOUT SYSTEM
   * Intelligently determines columns based on form type and field types
   */
  generateGridLayout(fields, designSystem, formSpec = {}) {
    if (!fields || fields.length === 0) return [];

    // Use smart layout system for intelligent grid generation
    const smartLayout = generateSmartFormLayout(formSpec, fields, designSystem);

    console.log(`[FormExpert] Smart layout generated:`, {
      formType: smartLayout.formType,
      columns: smartLayout.designRecommendations.columns,
      pattern: smartLayout.designRecommendations.pattern,
      hasSections: smartLayout.designRecommendations.hasSections
    });

    return smartLayout.gridLayout;
  }

  /**
   * Get smart layout info for a form (can be used by other experts)
   */
  getSmartLayoutInfo(fields, formSpec = {}, designSystem = {}) {
    return generateSmartFormLayout(formSpec, fields, designSystem);
  }

  parseForm(text) {
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
      jsonText = this.repairJson(jsonText);

      return JSON.parse(jsonText);
    } catch (error) {
      console.error('[FormExpert] Parse error:', error);
      console.error('[FormExpert] Text:', text.substring(0, 500));
      // Return fallback instead of throwing
      console.warn('[FormExpert] Returning fallback form');
      return this.createFallbackForm();
    }
  }

  parseForms(text) {
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

      // Try to repair common JSON issues
      jsonText = this.repairJson(jsonText);
      // Balance array brackets
      const openBrackets = (jsonText.match(/\[/g) || []).length;
      const closeBrackets = (jsonText.match(/\]/g) || []).length;
      if (openBrackets > closeBrackets) {
        jsonText += ']'.repeat(openBrackets - closeBrackets);
      }

      return JSON.parse(jsonText);
    } catch (error) {
      console.error('[FormExpert] Parse error:', error);
      console.error('[FormExpert] Text:', text.substring(0, 500));
      // Return fallback instead of throwing
      console.warn('[FormExpert] Returning fallback forms array');
      return [this.createFallbackForm()];
    }
  }

  /**
   * Repair common JSON issues
   */
  repairJson(jsonStr) {
    let repaired = jsonStr;
    // Remove trailing commas
    repaired = repaired.replace(/,(\s*[\]}])/g, '$1');
    // Fix missing commas between objects
    repaired = repaired.replace(/\}(\s*)\{/g, '},$1{');
    // Balance brackets
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    if (openBraces > closeBraces) {
      repaired += '}'.repeat(openBraces - closeBraces);
    }
    return repaired;
  }

  /**
   * Create fallback form when parsing fails
   */
  createFallbackForm() {
    return {
      id: `form_fallback_${Date.now()}`,
      name: 'GeneratedForm',
      title: 'Generated Form',
      description: 'Auto-generated form',
      fields: [
        { id: 'name', name: 'name', type: 'text', label: 'Name', placeholder: 'Enter name', required: true },
        { id: 'email', name: 'email', type: 'email', label: 'Email', placeholder: 'Enter email', required: true },
        { id: 'notes', name: 'notes', type: 'textarea', label: 'Notes', placeholder: 'Enter notes', required: false }
      ],
      gridLayout: [
        { i: 'name', x: 0, y: 0, w: 12, h: 8, minW: 6, minH: 6 },
        { i: 'email', x: 12, y: 0, w: 12, h: 8, minW: 6, minH: 6 },
        { i: 'notes', x: 0, y: 8, w: 24, h: 12, minW: 6, minH: 6 }
      ],
      layout: { type: 'two-column', sections: [] },
      submitButton: { label: 'Submit', position: 'right' },
      validation: { mode: 'onSubmit', showErrors: true }
    };
  }

  /**
   * Format design system into prompt-friendly text
   */
  formatDesignGuidelines(designSystem) {
    if (!designSystem) return '';

    let guidelines = '**DESIGN SYSTEM - APPLY TO ALL FORMS**:\n\n';

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
        guidelines += `- Label size: ${designSystem.typography.fontSize.label}\n`;
        guidelines += `- Input size: ${designSystem.typography.fontSize.input}\n`;
      }
      if (designSystem.typography.fontWeight) {
        guidelines += `- Label weight: ${designSystem.typography.fontWeight.label}\n`;
        guidelines += `- Input weight: ${designSystem.typography.fontWeight.input}\n`;
      }
      guidelines += '\n';
    }

    // Spacing
    if (designSystem.spacing) {
      guidelines += '**Spacing**:\n';
      if (designSystem.spacing.container) guidelines += `- Container padding: ${designSystem.spacing.container}\n`;
      if (designSystem.spacing.fieldGap) guidelines += `- Field gap: ${designSystem.spacing.fieldGap}\n`;
      if (designSystem.spacing.sectionGap) guidelines += `- Section gap: ${designSystem.spacing.sectionGap}\n`;
      if (designSystem.spacing.inputPadding) guidelines += `- Input padding: ${designSystem.spacing.inputPadding}\n`;
      guidelines += '\n';
    }

    // Components (Input Fields)
    if (designSystem.components?.input) {
      const input = designSystem.components.input;
      guidelines += '**Input Fields**:\n';
      if (input.borderRadius) guidelines += `- Border radius: ${input.borderRadius}\n`;
      if (input.borderWidth) guidelines += `- Border width: ${input.borderWidth}\n`;
      if (input.height) guidelines += `- Height: ${input.height}\n`;
      if (input.focusStyle) guidelines += `- Focus: ${input.focusStyle}\n`;
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

module.exports = FormExpert;
