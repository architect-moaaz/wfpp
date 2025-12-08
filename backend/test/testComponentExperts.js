/**
 * Test Component Experts
 *
 * Validates the new component-based architecture:
 * 1. PlanningExpert.createComponentPlan()
 * 2. ComponentOrchestrator strategy determination
 * 3. Individual expert generation (DataModel, Workflow, Form, Page)
 * 4. Parallel vs Sequential strategies
 * 5. No JSON truncation
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const PlanningExpert = require('../src/services/moe/experts/PlanningExpert');
const ComponentOrchestrator = require('../src/services/moe/ComponentOrchestrator');
const DataModelExpert = require('../src/services/moe/experts/DataModelExpert');
const WorkflowExpert = require('../src/services/moe/experts/WorkflowExpert');
const FormExpert = require('../src/services/moe/experts/FormExpert');
const PageExpert = require('../src/services/moe/experts/PageExpert');

// Test configurations
const SIMPLE_PROJECT = {
  requirements: `Build a simple task manager where users can:
- Create tasks with title and description
- Mark tasks as complete
- View list of all tasks`
};

const COMPLEX_PROJECT = {
  requirements: `Build a comprehensive library management system where:
- Students can search for books, borrow books, return books, view borrowing history
- Librarians can add new books, remove books, track inventory, manage overdue fines
- System sends automated reminders for overdue books
- Generate reports on most borrowed books, student activity
- Support multiple user roles (student, librarian, admin)
- Dashboard showing real-time statistics`
};

// Utility to print test results
function printTestResult(testName, success, details = '') {
  const status = success ? '✅ PASS' : '❌ FAIL';
  console.log(`\n${status} - ${testName}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

// Test 1: PlanningExpert.createComponentPlan() - Simple Project
async function testSimpleComponentPlan() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 1: PlanningExpert.createComponentPlan() - Simple Project');
  console.log('='.repeat(80));

  try {
    const planningExpert = new PlanningExpert();
    const componentPlan = await planningExpert.createComponentPlan(
      SIMPLE_PROJECT.requirements,
      {}
    );

    // Validate structure
    const hasRequiredFields = componentPlan.overview &&
                              componentPlan.componentSpecs &&
                              componentPlan.generationStrategy &&
                              componentPlan.complexity;

    const isArray = Array.isArray(componentPlan.componentSpecs);
    const componentCount = componentPlan.componentSpecs.length;

    printTestResult(
      'Component Plan Generation',
      hasRequiredFields && isArray,
      `Generated ${componentCount} component specs, Strategy: ${componentPlan.generationStrategy}, Complexity: ${componentPlan.complexity}`
    );

    // Print plan summary
    console.log('\n📋 Component Plan Summary:');
    console.log(`   Application: ${componentPlan.overview.name}`);
    console.log(`   Strategy: ${componentPlan.generationStrategy}`);
    console.log(`   Complexity: ${componentPlan.complexity}`);
    console.log(`   Total Components: ${componentCount}`);

    const counts = {
      dataModel: componentPlan.componentSpecs.filter(c => c.type === 'dataModel').length,
      workflow: componentPlan.componentSpecs.filter(c => c.type === 'workflow').length,
      form: componentPlan.componentSpecs.filter(c => c.type === 'form').length,
      page: componentPlan.componentSpecs.filter(c => c.type === 'page').length
    };

    console.log(`   - Data Models: ${counts.dataModel}`);
    console.log(`   - Workflows: ${counts.workflow}`);
    console.log(`   - Forms: ${counts.form}`);
    console.log(`   - Pages: ${counts.page}`);

    // Validate individual specs
    const allSpecsValid = componentPlan.componentSpecs.every(spec =>
      spec.type && spec.name && spec.purpose
    );

    printTestResult(
      'Component Specs Validation',
      allSpecsValid,
      `All ${componentCount} specs have required fields (type, name, purpose)`
    );

    return { success: true, componentPlan };

  } catch (error) {
    printTestResult('Component Plan Generation', false, `Error: ${error.message}`);
    console.error(error);
    return { success: false, error };
  }
}

// Test 2: PlanningExpert.createComponentPlan() - Complex Project
async function testComplexComponentPlan() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 2: PlanningExpert.createComponentPlan() - Complex Project');
  console.log('='.repeat(80));

  try {
    const planningExpert = new PlanningExpert();
    const componentPlan = await planningExpert.createComponentPlan(
      COMPLEX_PROJECT.requirements,
      {}
    );

    const componentCount = componentPlan.componentSpecs.length;

    printTestResult(
      'Complex Project Plan Generation',
      componentPlan.generationStrategy && componentPlan.complexity,
      `Generated ${componentCount} component specs, Strategy: ${componentPlan.generationStrategy}, Complexity: ${componentPlan.complexity}`
    );

    // Should use sequential strategy for complex project
    const usesSequential = componentPlan.generationStrategy === 'sequential';
    printTestResult(
      'Strategy Selection for Complex Project',
      usesSequential,
      `Selected strategy: ${componentPlan.generationStrategy} (expected: sequential)`
    );

    return { success: true, componentPlan };

  } catch (error) {
    printTestResult('Complex Project Plan Generation', false, `Error: ${error.message}`);
    console.error(error);
    return { success: false, error };
  }
}

// Test 3: ComponentOrchestrator.determineStrategy()
async function testStrategyDetermination() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 3: ComponentOrchestrator.determineStrategy()');
  console.log('='.repeat(80));

  // Mock simple plan (≤8 components, no type >3)
  const simpleMockPlan = {
    componentSpecs: [
      { type: 'dataModel', name: 'User' },
      { type: 'dataModel', name: 'Task' },
      { type: 'workflow', name: 'Create Task' },
      { type: 'form', name: 'Task Form' },
      { type: 'page', name: 'Task List' },
      { type: 'page', name: 'Task Detail' }
    ]
  };

  const simpleAnalysis = ComponentOrchestrator.determineStrategy(simpleMockPlan);

  printTestResult(
    'Simple Project Strategy',
    simpleAnalysis.strategy === 'parallel' && simpleAnalysis.complexity === 'simple',
    `Strategy: ${simpleAnalysis.strategy}, Complexity: ${simpleAnalysis.complexity}, Components: ${simpleMockPlan.componentSpecs.length}`
  );

  // Mock complex plan (>8 components)
  const complexMockPlan = {
    componentSpecs: [
      { type: 'dataModel', name: 'User' },
      { type: 'dataModel', name: 'Book' },
      { type: 'dataModel', name: 'Borrowing' },
      { type: 'dataModel', name: 'Fine' },
      { type: 'workflow', name: 'Borrow Book' },
      { type: 'workflow', name: 'Return Book' },
      { type: 'workflow', name: 'Calculate Fine' },
      { type: 'form', name: 'Book Form' },
      { type: 'form', name: 'User Form' },
      { type: 'page', name: 'Dashboard' },
      { type: 'page', name: 'Book List' },
      { type: 'page', name: 'User Profile' }
    ]
  };

  const complexAnalysis = ComponentOrchestrator.determineStrategy(complexMockPlan);

  printTestResult(
    'Complex Project Strategy',
    complexAnalysis.strategy === 'sequential' && complexAnalysis.complexity !== 'simple',
    `Strategy: ${complexAnalysis.strategy}, Complexity: ${complexAnalysis.complexity}, Components: ${complexMockPlan.componentSpecs.length}`
  );

  return { success: true };
}

// Test 4: DataModelExpert.generateSingle()
async function testDataModelExpert() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 4: DataModelExpert.generateSingle()');
  console.log('='.repeat(80));

  try {
    const dataModelExpert = new DataModelExpert();

    const spec = {
      type: 'dataModel',
      name: 'Task',
      purpose: 'Store task information including title, description, and completion status'
    };

    const componentPlan = {
      overview: {
        name: 'Task Manager',
        category: 'Productivity'
      }
    };

    const dataModel = await dataModelExpert.generateSingle(spec, componentPlan, {});

    const isValid = dataModel.id &&
                    dataModel.name === 'Task' &&
                    dataModel.fields &&
                    Array.isArray(dataModel.fields);

    printTestResult(
      'DataModel Generation',
      isValid,
      `Generated ${dataModel.name} with ${dataModel.fields.length} fields`
    );

    // Validate fields
    const hasValidFields = dataModel.fields.every(f => f.name && f.type);
    printTestResult(
      'DataModel Fields',
      hasValidFields && dataModel.fields.length >= 3,
      `All fields have name and type (${dataModel.fields.map(f => f.name).join(', ')})`
    );

    // Check response size (should be small, no truncation)
    const jsonSize = JSON.stringify(dataModel).length;
    const noTruncation = jsonSize < 10000; // Should be well under token limit

    printTestResult(
      'No Truncation',
      noTruncation,
      `Response size: ${jsonSize} chars (well within limits)`
    );

    return { success: true, dataModel };

  } catch (error) {
    printTestResult('DataModel Generation', false, `Error: ${error.message}`);
    console.error(error);
    return { success: false, error };
  }
}

// Test 5: WorkflowExpert.generateSingle()
async function testWorkflowExpert() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 5: WorkflowExpert.generateSingle()');
  console.log('='.repeat(80));

  try {
    const workflowExpert = new WorkflowExpert();

    const spec = {
      type: 'workflow',
      name: 'Create Task Workflow',
      purpose: 'Handle the process of creating a new task'
    };

    const componentPlan = {
      overview: {
        name: 'Task Manager',
        category: 'Productivity'
      }
    };

    const workflow = await workflowExpert.generateSingle(spec, componentPlan, {
      dataModels: [{ name: 'Task' }]
    });

    const isValid = workflow.id &&
                    workflow.name &&
                    workflow.nodes &&
                    workflow.edges &&
                    Array.isArray(workflow.nodes) &&
                    Array.isArray(workflow.edges);

    printTestResult(
      'Workflow Generation',
      isValid,
      `Generated ${workflow.name} with ${workflow.nodes.length} nodes, ${workflow.edges.length} edges`
    );

    // Validate nodes
    const hasStartNode = workflow.nodes.some(n => n.type === 'start');
    const hasEndNode = workflow.nodes.some(n => n.type === 'end');

    printTestResult(
      'Workflow Structure',
      hasStartNode && hasEndNode,
      `Has start node: ${hasStartNode}, Has end node: ${hasEndNode}`
    );

    const jsonSize = JSON.stringify(workflow).length;
    const noTruncation = jsonSize < 15000;

    printTestResult(
      'No Truncation',
      noTruncation,
      `Response size: ${jsonSize} chars`
    );

    return { success: true, workflow };

  } catch (error) {
    printTestResult('Workflow Generation', false, `Error: ${error.message}`);
    console.error(error);
    return { success: false, error };
  }
}

// Test 6: FormExpert.generateSingle()
async function testFormExpert() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 6: FormExpert.generateSingle()');
  console.log('='.repeat(80));

  try {
    const formExpert = new FormExpert();

    const spec = {
      type: 'form',
      name: 'Task Form',
      purpose: 'Form for creating and editing tasks'
    };

    const componentPlan = {
      overview: {
        name: 'Task Manager',
        category: 'Productivity'
      }
    };

    const form = await formExpert.generateSingle(spec, componentPlan, {
      dataModels: [{ name: 'Task', fields: [{ name: 'title' }, { name: 'description' }] }]
    });

    const isValid = form.id &&
                    form.name &&
                    form.fields &&
                    Array.isArray(form.fields);

    printTestResult(
      'Form Generation',
      isValid,
      `Generated ${form.name} with ${form.fields.length} fields`
    );

    const jsonSize = JSON.stringify(form).length;
    const noTruncation = jsonSize < 10000;

    printTestResult(
      'No Truncation',
      noTruncation,
      `Response size: ${jsonSize} chars`
    );

    return { success: true, form };

  } catch (error) {
    printTestResult('Form Generation', false, `Error: ${error.message}`);
    console.error(error);
    return { success: false, error };
  }
}

// Test 7: PageExpert.generateSingle()
async function testPageExpert() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 7: PageExpert.generateSingle()');
  console.log('='.repeat(80));

  try {
    const pageExpert = new PageExpert();

    const spec = {
      type: 'page',
      name: 'Task List Page',
      purpose: 'Display list of all tasks with ability to filter and sort'
    };

    const componentPlan = {
      overview: {
        name: 'Task Manager',
        category: 'Productivity'
      }
    };

    const page = await pageExpert.generateSingle(spec, componentPlan, {
      dataModels: [{ name: 'Task' }],
      forms: [{ name: 'Task Form' }]
    });

    const isValid = page.id &&
                    page.name &&
                    page.components &&
                    Array.isArray(page.components);

    printTestResult(
      'Page Generation',
      isValid,
      `Generated ${page.name} with ${page.components.length} components`
    );

    const jsonSize = JSON.stringify(page).length;
    const noTruncation = jsonSize < 10000;

    printTestResult(
      'No Truncation',
      noTruncation,
      `Response size: ${jsonSize} chars`
    );

    return { success: true, page };

  } catch (error) {
    printTestResult('Page Generation', false, `Error: ${error.message}`);
    console.error(error);
    return { success: false, error };
  }
}

// Test 8: ComponentOrchestrator.executeParallel()
async function testParallelExecution(componentPlan) {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 8: ComponentOrchestrator.executeParallel()');
  console.log('='.repeat(80));

  try {
    const orchestrator = new ComponentOrchestrator();

    // Force parallel strategy for testing
    componentPlan.generationStrategy = 'parallel';

    const results = await orchestrator.executeParallel(componentPlan, null);

    const hasAllTypes = results.dataModels &&
                        results.workflows &&
                        results.forms &&
                        results.pages;

    printTestResult(
      'Parallel Execution',
      hasAllTypes,
      `Generated: ${results.dataModels.length} data models, ${results.workflows.length} workflows, ${results.forms.length} forms, ${results.pages.length} pages`
    );

    // Verify all components are valid
    const allValid = [
      ...results.dataModels,
      ...results.workflows,
      ...results.forms,
      ...results.pages
    ].every(component => component.id && component.name);

    printTestResult(
      'All Components Valid',
      allValid,
      `All generated components have id and name`
    );

    return { success: true, results };

  } catch (error) {
    printTestResult('Parallel Execution', false, `Error: ${error.message}`);
    console.error(error);
    return { success: false, error };
  }
}

// Test 9: ComponentOrchestrator.executeSequential()
async function testSequentialExecution(componentPlan) {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 9: ComponentOrchestrator.executeSequential()');
  console.log('='.repeat(80));

  try {
    const orchestrator = new ComponentOrchestrator();

    // Force sequential strategy for testing
    componentPlan.generationStrategy = 'sequential';

    const results = await orchestrator.executeSequential(componentPlan, null);

    const hasAllTypes = results.dataModels &&
                        results.workflows &&
                        results.forms &&
                        results.pages;

    printTestResult(
      'Sequential Execution',
      hasAllTypes,
      `Generated: ${results.dataModels.length} data models, ${results.workflows.length} workflows, ${results.forms.length} forms, ${results.pages.length} pages`
    );

    const allValid = [
      ...results.dataModels,
      ...results.workflows,
      ...results.forms,
      ...results.pages
    ].every(component => component.id && component.name);

    printTestResult(
      'All Components Valid',
      allValid,
      `All generated components have id and name`
    );

    return { success: true, results };

  } catch (error) {
    printTestResult('Sequential Execution', false, `Error: ${error.message}`);
    console.error(error);
    return { success: false, error };
  }
}

// Main test runner
async function runAllTests() {
  console.log('\n' + '='.repeat(80));
  console.log('COMPONENT EXPERTS TEST SUITE');
  console.log('='.repeat(80));
  console.log('\nTesting the new component-based architecture to eliminate JSON truncation\n');

  const startTime = Date.now();

  try {
    // Test 1-2: Planning
    const simpleResult = await testSimpleComponentPlan();
    const complexResult = await testComplexComponentPlan();

    // Test 3: Strategy determination
    await testStrategyDetermination();

    // Test 4-7: Individual experts
    await testDataModelExpert();
    await testWorkflowExpert();
    await testFormExpert();
    await testPageExpert();

    // Test 8-9: Orchestrator execution
    if (simpleResult.success && simpleResult.componentPlan) {
      await testParallelExecution(simpleResult.componentPlan);
    }

    if (complexResult.success && complexResult.componentPlan) {
      await testSequentialExecution(complexResult.componentPlan);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(80));
    console.log('TEST SUITE COMPLETE');
    console.log('='.repeat(80));
    console.log(`Total Duration: ${duration}s`);
    console.log('\n✨ All tests completed! Review the results above.\n');

  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error);
    console.error(error.stack);
  }
}

// Run tests
runAllTests();
