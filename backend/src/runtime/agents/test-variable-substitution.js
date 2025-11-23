/**
 * Test script for variable substitution with naming conventions
 */

const ExecutionAgent = require('./ExecutionAgent');

// Create test instance
const agent = new ExecutionAgent();

// Test data with various naming conventions
const testProcessData = {
  user_query: "What is number 72?",
  conversation_tone: "quirky",
  user_name: "John Doe",
  nestedObject: {
    first_name: "Jane",
    lastName: "Smith",
    contact_info: {
      email_address: "jane@example.com"
    }
  }
};

// Test cases
const testCases = [
  {
    name: "Direct match - snake_case",
    template: "Query: ${processData.user_query}",
    expected: "Query: What is number 72?"
  },
  {
    name: "CamelCase accessing snake_case property",
    template: "Query: ${processData.userQuery}",
    expected: "Query: What is number 72?"
  },
  {
    name: "Snake_case accessing camelCase property (nestedObject)",
    template: "Name: ${processData.nested_object.first_name}",
    expected: "Name: Jane"
  },
  {
    name: "CamelCase accessing nested snake_case",
    template: "Last: ${processData.nestedObject.lastName}",
    expected: "Last: Smith"
  },
  {
    name: "Deep nested path",
    template: "Email: ${processData.nestedObject.contactInfo.emailAddress}",
    expected: "Email: jane@example.com"
  },
  {
    name: "Multiple variables",
    template: "User ${processData.user_name} asked: ${processData.userQuery} in ${processData.conversationTone} tone",
    expected: "User John Doe asked: What is number 72? in quirky tone"
  },
  {
    name: "Missing variable",
    template: "Missing: ${processData.nonExistent}",
    expected: "Missing: ${processData.nonExistent}"
  },
  {
    name: "Object as value",
    template: "Nested: ${processData.nestedObject}",
    expected: 'Nested: {"first_name":"Jane","lastName":"Smith","contact_info":{"email_address":"jane@example.com"}}'
  }
];

console.log('='.repeat(80));
console.log('Testing Variable Substitution with Naming Convention Flexibility');
console.log('='.repeat(80));
console.log();

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`  Template: ${testCase.template}`);

  const result = agent.substituteVariables(testCase.template, testProcessData);
  const success = result === testCase.expected;

  console.log(`  Result:   ${result}`);
  console.log(`  Expected: ${testCase.expected}`);
  console.log(`  Status:   ${success ? '✅ PASS' : '❌ FAIL'}`);
  console.log();

  if (success) {
    passed++;
  } else {
    failed++;
  }
});

console.log('='.repeat(80));
console.log(`Test Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);
console.log('='.repeat(80));

process.exit(failed > 0 ? 1 : 0);
