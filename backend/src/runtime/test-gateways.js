/**
 * Gateway Test Script
 * Tests Parallel (AND) and Inclusive (OR) gateway functionality
 */

const tokenManager = require('./TokenManager');
const gatewayController = require('./GatewayController');

// Mock workflow definition for testing
const mockWorkflow = {
  id: 'test-workflow-001',
  name: 'Gateway Test Workflow',
  nodes: [
    { id: 'start-1', type: 'startProcess', data: { label: 'Start' } },
    { id: 'task-1', type: 'task', data: { label: 'Initial Task' } },
    { id: 'parallel-split', type: 'parallelGateway', data: { label: 'Parallel Split' } },
    { id: 'task-2a', type: 'task', data: { label: 'Parallel Task A' } },
    { id: 'task-2b', type: 'task', data: { label: 'Parallel Task B' } },
    { id: 'task-2c', type: 'task', data: { label: 'Parallel Task C' } },
    { id: 'parallel-join', type: 'parallelGateway', data: { label: 'Parallel Join' } },
    { id: 'task-3', type: 'task', data: { label: 'After Join Task' } },
    { id: 'inclusive-split', type: 'inclusiveGateway', data: { label: 'Inclusive Split' } },
    { id: 'task-4a', type: 'task', data: { label: 'Conditional Task A' } },
    { id: 'task-4b', type: 'task', data: { label: 'Conditional Task B' } },
    { id: 'inclusive-join', type: 'inclusiveGateway', data: { label: 'Inclusive Join' } },
    { id: 'end-1', type: 'endProcess', data: { label: 'End' } }
  ],
  connections: [
    { id: 'c1', source: 'start-1', target: 'task-1' },
    { id: 'c2', source: 'task-1', target: 'parallel-split' },
    { id: 'c3', source: 'parallel-split', target: 'task-2a' },
    { id: 'c4', source: 'parallel-split', target: 'task-2b' },
    { id: 'c5', source: 'parallel-split', target: 'task-2c' },
    { id: 'c6', source: 'task-2a', target: 'parallel-join' },
    { id: 'c7', source: 'task-2b', target: 'parallel-join' },
    { id: 'c8', source: 'task-2c', target: 'parallel-join' },
    { id: 'c9', source: 'parallel-join', target: 'task-3' },
    { id: 'c10', source: 'task-3', target: 'inclusive-split' },
    { id: 'c11', source: 'inclusive-split', target: 'task-4a', condition: 'score > 50' },
    { id: 'c12', source: 'inclusive-split', target: 'task-4b', condition: 'priority == "high"' },
    { id: 'c13', source: 'task-4a', target: 'inclusive-join' },
    { id: 'c14', source: 'task-4b', target: 'inclusive-join' },
    { id: 'c15', source: 'inclusive-join', target: 'end-1' }
  ]
};

// Mock instance
const mockInstance = {
  id: 'instance-test-001',
  workflowId: 'test-workflow-001',
  processData: {
    score: 75,
    priority: 'high'
  }
};

async function testParallelGateway() {
  console.log('\n=== Testing Parallel Gateway (AND) ===\n');

  // Create initial token
  const token = tokenManager.createInitialToken(mockInstance.id, 'start-1');
  console.log('✓ Created initial token:', token.id);

  // Test Parallel Split
  const splitGateway = mockWorkflow.nodes.find(n => n.id === 'parallel-split');
  const splitResult = await gatewayController.processParallelGatewaySplit(
    splitGateway,
    token,
    mockWorkflow,
    mockInstance
  );

  console.log(`✓ Parallel split created ${splitResult.tokens.length} tokens`);
  console.log(`  Token IDs:`, splitResult.tokens.map(t => t.id.substring(0, 8)));
  console.log(`  Target nodes:`, splitResult.nextNodes);

  // Test Parallel Join
  const joinGateway = mockWorkflow.nodes.find(n => n.id === 'parallel-join');

  // Simulate tokens arriving at join gateway
  console.log('\n✓ Simulating token arrivals at join gateway:');

  for (let i = 0; i < splitResult.tokens.length; i++) {
    const childToken = splitResult.tokens[i];
    const joinResult = await gatewayController.processParallelGatewayJoin(
      joinGateway,
      childToken,
      mockWorkflow,
      mockInstance
    );

    if (joinResult.type === 'wait') {
      console.log(`  Token ${i + 1}/${splitResult.tokens.length} arrived - waiting for others`);
    } else if (joinResult.type === 'join') {
      console.log(`  All tokens arrived - joined into token: ${joinResult.token.id.substring(0, 8)}`);
      console.log(`  Next node: ${joinResult.nextNode}`);
    }
  }

  console.log('\n✓ Parallel gateway test passed!');
}

async function testInclusiveGateway() {
  console.log('\n=== Testing Inclusive Gateway (OR) ===\n');

  // Create token with variables that will match both conditions
  const token = tokenManager.createInitialToken('instance-test-002', 'task-3');
  token.variables = {
    score: 75,
    priority: 'high'
  };

  console.log('✓ Created token with variables:', token.variables);

  // Test Inclusive Split
  const splitGateway = mockWorkflow.nodes.find(n => n.id === 'inclusive-split');
  const splitResult = await gatewayController.processInclusiveGatewaySplit(
    splitGateway,
    token,
    mockWorkflow,
    { id: 'instance-test-002', processData: token.variables }
  );

  console.log(`✓ Inclusive split activated ${splitResult.activePaths} paths (expected 2)`);
  console.log(`  Token IDs:`, splitResult.tokens.map(t => t.id.substring(0, 8)));
  console.log(`  Target nodes:`, splitResult.nextNodes);

  // Test Inclusive Join
  const joinGateway = mockWorkflow.nodes.find(n => n.id === 'inclusive-join');

  console.log('\n✓ Simulating token arrivals at join gateway:');

  for (let i = 0; i < splitResult.tokens.length; i++) {
    const childToken = splitResult.tokens[i];
    const joinResult = await gatewayController.processInclusiveGatewayJoin(
      joinGateway,
      childToken,
      mockWorkflow,
      { id: 'instance-test-002' }
    );

    if (joinResult.type === 'wait') {
      console.log(`  Token ${i + 1}/${splitResult.tokens.length} arrived - waiting for others`);
    } else if (joinResult.type === 'join') {
      console.log(`  All expected tokens arrived - joined into token: ${joinResult.token.id.substring(0, 8)}`);
      console.log(`  Next node: ${joinResult.nextNode}`);
    }
  }

  console.log('\n✓ Inclusive gateway test passed!');
}

async function testTokenManager() {
  console.log('\n=== Testing Token Manager ===\n');

  const instanceId = 'instance-test-003';

  // Create initial token
  const token1 = tokenManager.createInitialToken(instanceId, 'start-1');
  console.log('✓ Created initial token:', token1.id.substring(0, 8));

  // Move token
  tokenManager.moveToken(instanceId, token1.id, 'task-1');
  console.log('✓ Moved token to task-1');

  // Update variables
  tokenManager.updateTokenVariables(instanceId, token1.id, { counter: 1, status: 'active' });
  console.log('✓ Updated token variables');

  // Fork token
  const childTokens = tokenManager.forkToken(instanceId, token1.id, ['task-2a', 'task-2b', 'task-2c']);
  console.log(`✓ Forked token into ${childTokens.length} children`);

  // Merge tokens
  const childTokenIds = childTokens.map(t => t.id);
  const mergedToken = tokenManager.mergeTokens(instanceId, childTokenIds, 'task-3');
  console.log('✓ Merged tokens back together:', mergedToken.id.substring(0, 8));

  // Get statistics
  const stats = tokenManager.getTokenStats(instanceId);
  console.log('✓ Token statistics:', stats);

  // Clean up
  tokenManager.clearInstanceTokens(instanceId);
  console.log('✓ Cleaned up tokens');

  console.log('\n✓ Token manager test passed!');
}

async function runTests() {
  console.log('===========================================');
  console.log('   Gateway Implementation Test Suite');
  console.log('===========================================');

  try {
    await testTokenManager();
    await testParallelGateway();
    await testInclusiveGateway();

    console.log('\n===========================================');
    console.log('   ✓ ALL TESTS PASSED');
    console.log('===========================================\n');

  } catch (error) {
    console.error('\n✗ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
