# BehaviorExpert - Interactive UX & State Management

## Overview

**BehaviorExpert** is a specialized AI expert that generates interactive behaviors, state management, and UX flows for pages and forms. It solves the problem of static, non-interactive page generation by adding:

- ✅ State machines for user flows
- ✅ Conditional component rendering
- ✅ Loading states and animations
- ✅ Form validation flows
- ✅ Success/Error handling
- ✅ Event handlers and API integration
- ✅ Accessibility features

---

## Problem It Solves

### Before BehaviorExpert ❌

```json
{
  "sections": [
    {
      "components": [
        {"type": "loader"},        // ❌ Always visible
        {"type": "alert"},         // ❌ Always visible
        {"type": "form"},          // ❌ Always visible
        {"type": "success-message"} // ❌ Always visible
      ]
    }
  ]
}
```

**Result:** All components render at once - messy, confusing UX

### After BehaviorExpert ✅

```json
{
  "pageId": "create-task",
  "stateDefinition": {
    "initialState": "idle",
    "states": {
      "idle": {"on": {"SUBMIT": "validating"}},
      "validating": {"on": {"VALID": "submitting", "INVALID": "error"}},
      "submitting": {"on": {"SUCCESS": "success", "ERROR": "error"}},
      "success": {"after": {"2000": "redirect"}},
      "error": {}
    }
  },
  "conditionalComponents": {
    "loader": {"visible": "state === 'submitting'"},
    "success-alert": {"visible": "state === 'success'"},
    "error-alert": {"visible": "state === 'error'"},
    "form": {"disabled": "state === 'submitting'"}
  }
}
```

**Result:** Components appear/disappear based on state - professional, polished UX

---

## Architecture

### Integration Flow

```
ComponentOrchestrator
  ├─ Phase 1: Generate Pages (PageExpert)
  ├─ Phase 2: Generate Forms (FormExpert)
  ├─ Phase 3: Generate DataModels
  ├─ Phase 4: Generate Workflows
  └─ Phase 5: Generate Behaviors (BehaviorExpert) ← NEW
      ├─ Analyzes all pages
      ├─ Generates state machines
      ├─ Defines conditional rendering
      └─ Creates event handlers
```

### Output Structure

```json
{
  "pageBehaviors": [
    {
      "pageId": "create-task-page",
      "pageName": "Create Task",
      "pageType": "form",
      "stateDefinition": {...},
      "conditionalComponents": {...},
      "eventHandlers": {...},
      "validation": {...},
      "animations": {...},
      "accessibility": {...}
    }
  ],
  "globalBehaviors": {
    "navigation": {...},
    "notifications": {...},
    "errorHandling": {...}
  }
}
```

---

## Interaction Patterns

### 1. Form Submission Flow

**State Machine:**
```
idle → validating → submitting → success/error
```

**UI Behavior:**
- **Idle**: Form ready, submit button enabled
- **Validating**: Check fields, show inline errors
- **Submitting**: Disable form, show button spinner
- **Success**: Show toast, redirect after 2s
- **Error**: Show error alert, re-enable form

**Generated Spec:**
```json
{
  "stateDefinition": {
    "initialState": "idle",
    "states": {
      "idle": {
        "on": {"SUBMIT": "validating"}
      },
      "validating": {
        "entry": ["validateAllFields"],
        "on": {
          "VALID": "submitting",
          "INVALID": "error"
        }
      },
      "submitting": {
        "entry": ["disableForm", "showLoader"],
        "on": {
          "SUCCESS": "success",
          "ERROR": "error"
        }
      },
      "success": {
        "entry": ["hideLoader", "showSuccessToast"],
        "after": {"2000": "redirect"}
      },
      "error": {
        "entry": ["hideLoader", "showErrorAlert", "enableForm"]
      }
    }
  }
}
```

---

### 2. Data Fetching Flow

**State Machine:**
```
initial → loading → loaded/empty/error
```

**UI Behavior:**
- **Loading**: Show skeleton loader
- **Loaded**: Fade in content (200ms animation)
- **Empty**: Show empty state illustration + CTA
- **Error**: Show error message + retry button

**Generated Spec:**
```json
{
  "stateDefinition": {
    "initialState": "initial",
    "states": {
      "initial": {"on": {"FETCH": "loading"}},
      "loading": {
        "entry": ["showSkeleton"],
        "on": {
          "SUCCESS": "loaded",
          "EMPTY": "empty",
          "ERROR": "error"
        }
      },
      "loaded": {
        "entry": ["fadeInContent"]
      },
      "empty": {
        "entry": ["showEmptyState"]
      },
      "error": {
        "entry": ["showErrorState"]
      }
    }
  },
  "conditionalComponents": {
    "skeleton": {"visible": "state === 'loading'"},
    "content": {"visible": "state === 'loaded'"},
    "empty-state": {"visible": "state === 'empty'"},
    "error-state": {"visible": "state === 'error'"}
  }
}
```

---

### 3. Multi-Step Wizard Flow

**State Machine:**
```
step1 → step2 → step3 → submitting → complete
```

**UI Behavior:**
- **Step 1-3**: Show current step, validate before next
- **Progress bar**: Update on each transition
- **Back button**: Navigate to previous step
- **Submitting**: Show full-page loader
- **Complete**: Success animation + redirect

**Generated Spec:**
```json
{
  "stateDefinition": {
    "initialState": "step1",
    "states": {
      "step1": {"on": {"NEXT": "step2"}},
      "step2": {"on": {"NEXT": "step3", "BACK": "step1"}},
      "step3": {"on": {"SUBMIT": "submitting", "BACK": "step2"}},
      "submitting": {
        "entry": ["showFullPageLoader"],
        "on": {"SUCCESS": "complete", "ERROR": "step3"}
      },
      "complete": {
        "entry": ["showSuccessAnimation"],
        "after": {"2000": "redirect"}
      }
    }
  },
  "conditionalComponents": {
    "progress-bar": {
      "value": "stateToStep(state)",
      "max": 3
    },
    "step1-content": {"visible": "state === 'step1'"},
    "step2-content": {"visible": "state === 'step2'"},
    "step3-content": {"visible": "state === 'step3'"},
    "back-button": {"disabled": "state === 'submitting' || state === 'step1'"},
    "next-button": {"disabled": "!currentStepValid || state === 'submitting'"}
  }
}
```

---

### 4. CRUD Operations

**CREATE:**
```
idle → creating → created → redirect
```

**READ:**
```
loading → loaded/empty/error
```

**UPDATE:**
```
idle → updating → updated (in-place update, toast)
```

**DELETE:**
```
idle → confirming → deleting → deleted (fade-out animation)
```

---

## Conditional Rendering Rules

### Component Visibility

```json
{
  "submit-button": {
    "disabled": "state === 'submitting' || !formIsValid",
    "showSpinner": "state === 'submitting'",
    "text": {
      "idle": "Create Task",
      "submitting": "Creating...",
      "success": "Created!"
    }
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
    "position": "top-right",
    "duration": 3000,
    "animation": "slide-in-right"
  }
}
```

---

## Event Handlers

### Form Submission

```json
{
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
          "onSuccess": [
            {"type": "setState", "state": "success"},
            {"type": "showToast", "message": "Task created!"},
            {"type": "navigate", "to": "/tasks"}
          ],
          "onError": [
            {"type": "setState", "state": "error"},
            {"type": "showAlert", "message": "error.message"}
          ]
        }}
      ]}
    ]
  }
}
```

---

## Notification Types

### Toast (Non-blocking)
- **Position:** top-right
- **Duration:** 3-5 seconds
- **Use for:** Success messages, minor info
- **Animation:** Slide in from right, fade out

### Banner (Prominent)
- **Position:** Top of page
- **Duration:** Persistent until dismissed
- **Use for:** Important errors, warnings
- **Animation:** Slide down from top

### Inline (Contextual)
- **Position:** Near related element
- **Duration:** Until condition changes
- **Use for:** Form field errors

### Modal (Blocking)
- **Position:** Center overlay
- **Duration:** Until user action
- **Use for:** Confirmations, critical decisions

---

## Loading Indicators

### Button Spinner
- Small (16px) spinner inside button
- Use for: Single actions (submit, save)

### Full-Page Overlay
- Semi-transparent overlay + centered spinner
- Use for: Critical operations
- Blurs background content

### Skeleton Loader
- Gray animated rectangles matching content
- Use for: Page content, data tables, cards
- Better UX than spinner for content-heavy pages

### Progress Bar
- Linear or circular with percentage
- Use for: Upload, download, multi-step process

---

## Animations

### Page Transitions
```json
{
  "pageEnter": "fade-in 300ms ease-out",
  "pageExit": "fade-out 200ms ease-in"
}
```

### Component States
```json
{
  "showHide": "fade 200ms",
  "listItemAdd": "slide-down + fade-in 250ms",
  "listItemRemove": "slide-up + fade-out 250ms"
}
```

### Button Interactions
```json
{
  "hover": "scale 1.02, transition 150ms",
  "active": "scale 0.98, transition 100ms",
  "focus": "ring outline, transition 150ms"
}
```

### Success/Error States
```json
{
  "success": "green checkmark, scale 0 → 1, 300ms",
  "error": "red X, shake animation, 300ms"
}
```

---

## Accessibility

### State Announcements
```json
{
  "announceStateChanges": true,
  "announcements": {
    "submitting": "Submitting form, please wait",
    "success": "Task created successfully",
    "error": "Form submission failed, please check errors"
  }
}
```

### Focus Management
```json
{
  "focusManagement": {
    "onError": "focusFirstErrorField",
    "onSuccess": "focusSuccessMessage",
    "onModalOpen": "focusModalTitle",
    "onModalClose": "returnFocusToTrigger"
  }
}
```

---

## Real-Time Validation

### Field-Level
```json
{
  "validation": {
    "mode": "onBlur",
    "reValidateMode": "onChange",
    "showErrorsWhen": "fieldTouched && fieldInvalid",
    "scrollToError": true,
    "focusFirstError": true
  }
}
```

### Visual Feedback
- **Valid field:** Green check icon
- **Invalid field:** Red border + error message
- **Required:** Red asterisk
- **Character count:** Show remaining characters

---

## Usage Example

### Generated Behavior for "Create Task" Page

```json
{
  "pageId": "create-task-page",
  "pageName": "Create Task",
  "pageType": "form",

  "stateDefinition": {
    "initialState": "idle",
    "states": {
      "idle": {
        "description": "Form ready for input",
        "on": {"SUBMIT": "validating"}
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
        "after": {"2000": "redirect"}
      },
      "error": {
        "description": "Error occurred",
        "entry": ["hideLoader", "showErrorAlert", "enableForm"]
      }
    }
  },

  "conditionalComponents": {
    "submit-button": {
      "disabled": "state === 'submitting' || !formIsValid",
      "showSpinner": "state === 'submitting'",
      "text": {
        "idle": "Create Task",
        "submitting": "Creating...",
        "success": "Created!"
      }
    },
    "form-fields": {
      "disabled": "state === 'submitting'",
      "opacity": "state === 'submitting' ? 0.6 : 1"
    },
    "success-toast": {
      "visible": "state === 'success'",
      "type": "toast",
      "variant": "success",
      "position": "top-right",
      "duration": 3000,
      "message": "Task created successfully!"
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
              {"type": "navigate", "to": "/tasks"}
            ],
            "onError": [
              {"type": "setState", "state": "error"}
            ]
          }}
        ]}
      ]
    }
  }
}
```

---

## Testing BehaviorExpert

Once you have API credits, create a new application through ARES and you'll see:

1. **In logs:** "Generating Behaviors" step
2. **Generated:** `behaviors.pageBehaviors` array
3. **Each page:** Complete state machine + conditional rendering
4. **Result:** Interactive, professional UX with proper loading/success/error states

---

## Future Enhancements

- [ ] Gesture-based interactions (swipe, drag)
- [ ] Advanced animations (parallax, reveal)
- [ ] Offline-first state management
- [ ] Real-time collaboration states
- [ ] Undo/Redo state history
- [ ] Optimistic UI updates
- [ ] WebSocket state synchronization

---

**BehaviorExpert transforms static page definitions into dynamic, interactive experiences!** 🎉
