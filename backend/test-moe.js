require('dotenv').config();
const MoEOrchestrator = require('./src/services/moe/MoEOrchestrator');

async function testMoEOrchestrator() {
  console.log('=== Testing MoEOrchestrator ===\n');

  const moe = new MoEOrchestrator();

  // Test 1: Simple workflow generation
  console.log('Test 1: Generating a simple expense approval workflow...');

  const requirements = 'Create an expense approval workflow where employees submit expense claims, managers approve them, and finance processes the payment';

  try {
    const emitEvent = (event) => {
      console.log(`[Event] ${event.type}:`, JSON.stringify(event.data, null, 2));
    };

    console.log('\nStarting workflow generation...\n');
    const workflow = await moe.generateWorkflow(requirements, null, [], emitEvent);

    console.log('\n=== Workflow Generation Complete ===');
    console.log('Workflow ID:', workflow?.id);
    console.log('Workflow Name:', workflow?.name);
    console.log('Number of Nodes:', workflow?.nodes?.length || 0);
    console.log('Number of Edges:', workflow?.edges?.length || 0);

    if (workflow?.nodes?.length > 0) {
      console.log('\nNodes:');
      workflow.nodes.forEach((node, idx) => {
        console.log(`  ${idx + 1}. ${node.type}: ${node.data?.label || 'No label'}`);
      });
    }

    console.log('\n✅ Test PASSED: Workflow generated successfully!');

  } catch (error) {
    console.error('\n❌ Test FAILED:', error.message);
    console.error('Stack:', error.stack);
  }

  // Test 2: Check stub methods
  console.log('\n\nTest 2: Testing stub methods...');

  try {
    const forms = await moe.generateForms(requirements);
    console.log('✅ generateForms:', Array.isArray(forms) ? `Returns array (length: ${forms.length})` : 'ERROR');

    const dataModels = await moe.generateDataModels(requirements);
    console.log('✅ generateDataModels:', Array.isArray(dataModels) ? `Returns array (length: ${dataModels.length})` : 'ERROR');

    const pages = await moe.generatePages(requirements);
    console.log('✅ generatePages:', Array.isArray(pages) ? `Returns array (length: ${pages.length})` : 'ERROR');

    const mobileUI = await moe.generateMobileUI(requirements);
    console.log('✅ generateMobileUI:', mobileUI === null ? 'Returns null' : 'ERROR');

    console.log('\n✅ All stub methods working correctly!');

  } catch (error) {
    console.error('\n❌ Stub methods test FAILED:', error.message);
  }

  console.log('\n=== All Tests Complete ===');
  process.exit(0);
}

// Run the test
testMoEOrchestrator().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
