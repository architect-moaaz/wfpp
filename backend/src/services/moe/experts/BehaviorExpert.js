/**
 * Behavior Expert
 * Generates interactive behaviors, state management, and conditional rendering for pages and forms
 * Focuses on UX flows: loading states, form submissions, error handling, animations, etc.
 */

const Anthropic = require('@anthropic-ai/sdk');

class BehaviorExpert {
  constructor() {
    this.name = 'BehaviorExpert';
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    // Common interaction patterns library
    this.interactionPatterns = {
      formSubmission: {
        states: ['idle', 'validating', 'submitting', 'success', 'error'],
        transitions: {
          idle: { SUBMIT: 'validating' },
          validating: { VALID: 'submitting', INVALID: 'error' },
          submitting: { SUCCESS: 'success', ERROR: 'error' },
          success: { RESET: 'idle' },
          error: { RETRY: 'validating', CANCEL: 'idle' }
        }
      },
      dataFetching: {
        states: ['initial', 'loading', 'loaded', 'empty', 'error'],
        transitions: {
          initial: { FETCH: 'loading' },
          loading: { SUCCESS: 'loaded', EMPTY: 'empty', ERROR: 'error' },
          loaded: { REFRESH: 'loading' },
          empty: { RETRY: 'loading' },
          error: { RETRY: 'loading' }
        }
      },
      multiStep: {
        states: ['step1', 'step2', 'step3', 'submitting', 'complete'],
        transitions: {
          step1: { NEXT: 'step2' },
          step2: { NEXT: 'step3', BACK: 'step1' },
          step3: { SUBMIT: 'submitting', BACK: 'step2' },
          submitting: { SUCCESS: 'complete', ERROR: 'step3' }
        }
      },
      crud: {
        create: ['idle', 'creating', 'created', 'error'],
        read: ['loading', 'loaded', 'empty', 'error'],
        update: ['idle', 'updating', 'updated', 'error'],
        delete: ['confirming', 'deleting', 'deleted', 'error']
      }
    };
  }

  /**
   * Generate behavior specifications for all pages and forms
   */
  async generate(pages, forms, workflows, dataModels, context = {}) {
    console.log(`[${this.name}] Generating behavior specifications...`);

    try {
      const prompt = this.buildPrompt(pages, forms, workflows, dataModels, context);

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 16000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const behaviorText = response.content[0].text;
      const behaviors = this.parseBehaviors(behaviorText);

      console.log(`[${this.name}] Generated behaviors for ${behaviors.pageBehaviors?.length || 0} pages`);

      return {
        behaviors,
        expertType: 'BehaviorExpert'
      };
    } catch (error) {
      console.error(`[${this.name}] Error generating behaviors:`, error);
      throw error;
    }
  }

  /**
   * Build comprehensive prompt for behavior generation
   */
  buildPrompt(pages, forms, workflows, dataModels, context) {
    const pagesList = pages.map(p => `- ${p.name} (${p.type}): ${p.description || 'No description'}`).join('\n');
    const formsList = forms.map(f => `- ${f.name} (ID: ${f.id})`).join('\n');

    return `You are a SENIOR FRONTEND ARCHITECT and UX ENGINEER with 15+ years of experience building interactive, production-grade web applications.

Your specialty is designing **INTERACTIVE BEHAVIORS, STATE MANAGEMENT, and USER EXPERIENCE FLOWS** that make applications feel polished, responsive, and professional.

---

**CONTEXT:**

Application: ${context.applicationName || 'Business Application'}
Domain: ${context.domain || 'General'}

**PAGES IN APPLICATION:**
${pagesList}

**FORMS IN APPLICATION:**
${formsList}

**YOUR MISSION:**

For each page and form, define:
1. **State management** (what states exist, transitions)
2. **Conditional rendering** (when components show/hide)
3. **Event handlers** (user interactions, API calls)
4. **Loading states** (spinners, skeletons, overlays)
5. **Success/Error states** (alerts, toasts, messages)
6. **Animations** (smooth transitions, micro-interactions)
7. **Form validation flows** (real-time, on blur, on submit)
8. **Navigation flows** (redirects, modals, drawers)

---

**INTERACTION PATTERNS TO IMPLEMENT:**

**1. FORM SUBMISSION FLOW** (for all form pages):

\`\`\`
State Machine:
- idle → User fills form
- validating → Check required fields, validate formats
  - If valid → submitting
  - If invalid → error (show field errors, focus first error)
- submitting → API call in progress
  - Show: Button spinner OR full-page loader
  - Disable: Form fields and submit button
  - On Success → success
  - On Error → error
- success → Show success message
  - Action: Redirect to list page OR reset form OR show toast
  - Duration: 2-3 seconds
- error → Show error message
  - Action: Re-enable form, show errors inline, focus first error field

UI Behavior:
- Submit button:
  - Disabled when form invalid
  - Show spinner when submitting
  - Change text: "Submit" → "Submitting..." → "Success!"
- Form fields: Disabled during submission
- Success alert: Toast (top-right) with auto-dismiss
- Error alert: Banner (top) with dismiss button OR inline field errors
\`\`\`

**2. DATA FETCHING FLOW** (for list and detail pages):

\`\`\`
State Machine:
- initial → Page mounted
- loading → Fetching data from API
  - Show: Skeleton loader OR spinner
  - Hide: Content
- loaded → Data received successfully
  - Show: Content with fade-in animation
  - Hide: Loader
- empty → No data available
  - Show: Empty state illustration with CTA
  - Example: "No tasks yet. Create your first task!"
- error → API error occurred
  - Show: Error state with retry button
  - Example: "Failed to load. Please try again."

UI Behavior:
- Skeleton loaders: Match actual content layout
- Fade-in animation: 200ms when data loads
- Refresh button: Re-trigger loading state
- Empty state: Friendly illustration + primary action button
- Error state: Error icon + message + "Retry" button
\`\`\`

**3. MULTI-STEP WIZARD FLOW** (for wizard pages):

\`\`\`
State Machine:
- step1 → First step
  - Validate: On "Next" click
  - On Valid → step2
  - On Invalid → Show errors, stay on step1
- step2 → Second step
  - Actions: "Back" → step1, "Next" → step3
  - Validate: Before transition
- step3 → Final step
  - Actions: "Back" → step2, "Submit" → submitting
- submitting → Final submission
  - Show: Full-page loader with progress
  - On Success → complete
  - On Error → step3 with errors
- complete → Success confirmation
  - Show: Success checkmark animation
  - Action: Redirect after 2s

UI Behavior:
- Progress indicator: Update on each step
- Step validation: Show errors before allowing "Next"
- Back button: Always enabled (except submitting state)
- Next/Submit button: Disabled if current step invalid
- Animation: Slide transition between steps (slide-left for next, slide-right for back)
\`\`\`

**4. CRUD OPERATIONS:**

\`\`\`
CREATE:
- State: idle → validating → creating → created/error
- UI: Form → Loader → Success toast → Redirect to list

READ:
- State: loading → loaded/empty/error
- UI: Skeleton → Content OR Empty state OR Error state

UPDATE:
- State: idle → validating → updating → updated/error
- UI: Inline edit → Spinner on save button → Success toast OR Error inline
- Keep user on same page, update in place

DELETE:
- State: idle → confirming → deleting → deleted/error
- UI: Delete button → Confirmation modal → Loader → Success toast → Remove from list
- Animation: Fade-out deleted item
\`\`\`

**5. REAL-TIME VALIDATION:**

\`\`\`
Field-level:
- onChange: Update field state (pristine → dirty)
- onBlur: Validate field, show errors if invalid
- onFocus: Clear errors (optional, for better UX)

Form-level:
- Track: Which fields are touched
- Show errors: Only after field is touched AND invalid
- Submit validation: Validate all fields, scroll to first error

Visual feedback:
- Valid field: Green check icon OR green border
- Invalid field: Red border + error message below
- Required indicator: Red asterisk
- Character count: Show remaining characters for text fields
\`\`\`

**6. NOTIFICATION TYPES:**

\`\`\`
Toast (non-blocking, auto-dismiss):
- Position: top-right
- Duration: 3-5 seconds
- Use for: Success messages, minor info
- Animation: Slide in from right, fade out

Banner (prominent, dismissible):
- Position: top of page
- Duration: Persistent until dismissed
- Use for: Important errors, warnings
- Animation: Slide down from top

Inline (contextual):
- Position: Near related element
- Duration: Until condition changes
- Use for: Form field errors, validation messages

Modal (blocking):
- Position: Center overlay
- Duration: Until user action
- Use for: Confirmations, critical decisions
- Backdrop: Blur background
\`\`\`

**7. LOADING INDICATORS:**

\`\`\`
Button spinner:
- Use when: Single action (submit, save, delete)
- Show: Inside button, replace text OR next to text
- Size: Small (16px)

Full-page overlay:
- Use when: Critical operation that blocks UI
- Show: Semi-transparent overlay + centered spinner + optional message
- Blur: Background content

Skeleton loader:
- Use when: Loading page content, data tables, cards
- Show: Gray animated rectangles matching content layout
- Better UX than spinner for content-heavy pages

Progress bar:
- Use when: Upload, download, multi-step process
- Show: Linear progress bar OR circular with percentage
- Update: Real-time progress updates
\`\`\`

**8. ANIMATIONS & MICRO-INTERACTIONS:**

\`\`\`
Page transitions:
- Enter: Fade in 300ms
- Exit: Fade out 200ms

Component state changes:
- Show/Hide: Fade 200ms
- List item add: Slide down + fade in 250ms
- List item remove: Slide up + fade out 250ms

Button interactions:
- Hover: Scale 1.02, transition 150ms
- Active (click): Scale 0.98, transition 100ms
- Focus: Ring outline, transition 150ms

Form interactions:
- Focus field: Border color change, scale input 1.01
- Valid field: Green check fade in 200ms
- Invalid field: Shake animation + red border

Success/Error states:
- Success: Green checkmark with scale animation (start 0 → 1)
- Error: Red X with shake animation
- Toast enter: Slide + fade from right 300ms
- Toast exit: Fade out 200ms
\`\`\`

---

**OUTPUT FORMAT:**

Return a JSON object with behavior specifications for EACH page:

\`\`\`json
{
  "pageBehaviors": [
    {
      "pageId": "create-task-page",
      "pageName": "Create Task",
      "pageType": "form",

      "stateDefinition": {
        "initialState": "idle",
        "states": {
          "idle": {
            "description": "Form ready for input",
            "on": {
              "SUBMIT": {
                "target": "validating",
                "guard": "formIsDirty"
              }
            }
          },
          "validating": {
            "description": "Validating form fields",
            "entry": ["validateAllFields"],
            "on": {
              "VALID": "submitting",
              "INVALID": "error"
            }
          },
          "submitting": {
            "description": "Submitting to API",
            "entry": ["disableForm", "showLoader"],
            "on": {
              "SUCCESS": "success",
              "ERROR": "error"
            }
          },
          "success": {
            "description": "Submission successful",
            "entry": ["hideLoader", "showSuccessToast"],
            "after": {
              "2000": "redirect"
            }
          },
          "error": {
            "description": "Validation or submission error",
            "entry": ["hideLoader", "showErrorAlert", "enableForm", "focusFirstError"]
          }
        }
      },

      "conditionalComponents": {
        "submit-button": {
          "disabled": "state === 'submitting' || state === 'validating' || !formIsValid",
          "showSpinner": "state === 'submitting'",
          "text": {
            "idle": "Create Task",
            "validating": "Validating...",
            "submitting": "Creating...",
            "success": "Created!"
          }
        },
        "form-fields": {
          "disabled": "state === 'submitting'",
          "opacity": "state === 'submitting' ? 0.6 : 1"
        },
        "loader-overlay": {
          "visible": "state === 'submitting'",
          "type": "overlay",
          "blur": true,
          "message": "Creating task..."
        },
        "success-toast": {
          "visible": "state === 'success'",
          "type": "toast",
          "variant": "success",
          "position": "top-right",
          "duration": 3000,
          "message": "Task created successfully!",
          "animation": "slide-in-right"
        },
        "error-alert": {
          "visible": "state === 'error'",
          "type": "banner",
          "variant": "error",
          "position": "top",
          "dismissible": true,
          "message": "Failed to create task. Please try again."
        }
      },

      "eventHandlers": {
        "onFormSubmit": {
          "preventDefault": true,
          "actions": [
            {"type": "setState", "state": "validating"},
            {"type": "validateForm"},
            {"type": "conditional", "if": "formIsValid", "then": [
              {"type": "setState", "state": "submitting"},
              {"type": "apiCall", "config": {
                "endpoint": "/api/tasks",
                "method": "POST",
                "body": "formData",
                "onSuccess": [
                  {"type": "setState", "state": "success"},
                  {"type": "showToast", "message": "Task created!"},
                  {"type": "delay", "ms": 2000},
                  {"type": "navigate", "to": "/tasks"}
                ],
                "onError": [
                  {"type": "setState", "state": "error"},
                  {"type": "showAlert", "message": "error.message"},
                  {"type": "focusFirstError"}
                ]
              }}
            ], "else": [
              {"type": "setState", "state": "error"},
              {"type": "focusFirstError"}
            ]}
          ]
        },
        "onFieldBlur": {
          "actions": [
            {"type": "markFieldTouched", "field": "event.target.name"},
            {"type": "validateField", "field": "event.target.name"},
            {"type": "showFieldErrors", "field": "event.target.name"}
          ]
        }
      },

      "validation": {
        "mode": "onBlur",
        "reValidateMode": "onChange",
        "showErrorsWhen": "fieldTouched && fieldInvalid",
        "scrollToError": true,
        "focusFirstError": true
      },

      "animations": {
        "pageEnter": "fade-in 300ms ease-out",
        "successToast": {
          "enter": "slide-in-right 300ms ease-out",
          "exit": "fade-out 200ms ease-in"
        },
        "errorAlert": {
          "enter": "slide-down 250ms ease-out",
          "exit": "slide-up 200ms ease-in"
        },
        "formDisable": "opacity 0.6 200ms ease-in"
      },

      "accessibility": {
        "announceStateChanges": true,
        "announcements": {
          "submitting": "Submitting form, please wait",
          "success": "Task created successfully",
          "error": "Form submission failed, please check errors"
        },
        "focusManagement": {
          "onError": "focusFirstErrorField",
          "onSuccess": "focusSuccessMessage"
        }
      }
    }
  ],

  "globalBehaviors": {
    "navigation": {
      "transition": "fade",
      "duration": 200,
      "preserveScroll": false
    },
    "notifications": {
      "defaultDuration": 3000,
      "maxVisible": 3,
      "position": "top-right"
    },
    "errorHandling": {
      "network": {
        "retry": true,
        "maxRetries": 3,
        "retryDelay": 1000
      },
      "validation": {
        "scrollToError": true,
        "focusFirstError": true
      }
    }
  }
}
\`\`\`

---

**CRITICAL REQUIREMENTS:**

1. **Define state machines** for EVERY page using the patterns above
2. **Conditional rendering** for loaders, alerts, success/error states
3. **Event handlers** for form submissions, button clicks, data fetching
4. **Animations** for smooth transitions (enter/exit)
5. **Accessibility** announcements and focus management
6. **Real-time validation** for form pages
7. **Loading indicators** appropriate to the action (button spinner vs overlay vs skeleton)
8. **Success/Error handling** with appropriate notification types

**NEVER show all components at once** - use conditional rendering based on state!

Generate comprehensive, production-ready behavior specifications now.`;
  }

  /**
   * Parse behavior specifications from LLM response
   */
  parseBehaviors(text) {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonText = text;

      // Remove markdown code blocks if present
      const codeBlockMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1];
      }

      // Parse JSON
      const parsed = JSON.parse(jsonText.trim());

      // Validate structure
      if (!parsed.pageBehaviors || !Array.isArray(parsed.pageBehaviors)) {
        console.warn('[BehaviorExpert] Missing pageBehaviors array, returning empty');
        return {
          pageBehaviors: [],
          globalBehaviors: parsed.globalBehaviors || {}
        };
      }

      return parsed;
    } catch (error) {
      console.error('[BehaviorExpert] Failed to parse behaviors:', error);
      console.error('Raw text:', text.substring(0, 500));

      // Return minimal structure
      return {
        pageBehaviors: [],
        globalBehaviors: {}
      };
    }
  }

  /**
   * Map behaviors to pages
   */
  mapBehaviorsToPages(pages, behaviors) {
    const behaviorMap = new Map();

    for (const page of pages) {
      const pageBehavior = behaviors.pageBehaviors?.find(b =>
        b.pageId === page.id ||
        b.pageName === page.name ||
        b.pageId === page.name?.toLowerCase().replace(/\s+/g, '-')
      );

      if (pageBehavior) {
        behaviorMap.set(page.id, pageBehavior);
      }
    }

    return behaviorMap;
  }

  /**
   * Get default behavior for a page type
   */
  getDefaultBehavior(pageType) {
    const defaults = {
      form: {
        stateDefinition: {
          initialState: 'idle',
          states: {
            idle: {},
            validating: {},
            submitting: {},
            success: {},
            error: {}
          }
        },
        validation: {
          mode: 'onBlur',
          showErrorsWhen: 'fieldTouched && fieldInvalid'
        }
      },
      list: {
        stateDefinition: {
          initialState: 'loading',
          states: {
            loading: {},
            loaded: {},
            empty: {},
            error: {}
          }
        }
      },
      detail: {
        stateDefinition: {
          initialState: 'loading',
          states: {
            loading: {},
            loaded: {},
            error: {}
          }
        }
      },
      dashboard: {
        stateDefinition: {
          initialState: 'loading',
          states: {
            loading: {},
            loaded: {},
            error: {}
          }
        }
      }
    };

    return defaults[pageType] || defaults.list;
  }
}

module.exports = BehaviorExpert;
