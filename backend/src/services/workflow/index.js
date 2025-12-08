/**
 * Workflow Services - Multi-Workflow Architecture
 *
 * This module provides the core infrastructure for multi-workflow applications:
 * - EventBus: Event-driven communication between workflows
 * - MessageStore: State passing and message persistence
 * - WorkflowTrigger: Multiple trigger types (user/event/schedule/api/subworkflow)
 * - SubWorkflowNode: Node type for calling child workflows
 * - MultiWorkflowOrchestrator: Coordinates workflow execution
 */

const eventBus = require('./EventBus');
const messageStore = require('./MessageStore');
const workflowTrigger = require('./WorkflowTrigger');
const multiWorkflowOrchestrator = require('./MultiWorkflowOrchestrator');
const SubWorkflowNode = require('./nodes/SubWorkflowNode');

module.exports = {
  // Core services (singleton instances)
  eventBus,
  messageStore,
  workflowTrigger,
  multiWorkflowOrchestrator,

  // Node types
  SubWorkflowNode,

  // Class exports for testing/extension
  EventBus: require('./EventBus').EventBus,
  MessageStore: require('./MessageStore').MessageStore,
  WorkflowTrigger: require('./WorkflowTrigger').WorkflowTrigger,
  MultiWorkflowOrchestrator: require('./MultiWorkflowOrchestrator').MultiWorkflowOrchestrator
};
