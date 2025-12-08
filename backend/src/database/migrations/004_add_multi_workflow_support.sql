-- Migration: Add multi-workflow support
-- Description: Adds tables and columns to support multiple workflows per application
--              with event-based communication and direct call sub-workflows
-- Author: Workflow++ Team
-- Date: 2025-12-05

-- Set search path
SET search_path TO k1;

-- ============================================================================
-- Add columns to workflows table for multi-workflow support
-- ============================================================================

-- Add trigger types (user_action, event, schedule, api, direct_call)
ALTER TABLE k1.workflows
ADD COLUMN IF NOT EXISTS triggers JSONB DEFAULT '[{"type": "user_action"}]';

-- Add flag for sub-workflow
ALTER TABLE k1.workflows
ADD COLUMN IF NOT EXISTS is_sub_workflow BOOLEAN DEFAULT false;

-- Add events configuration (emits, listensTo)
ALTER TABLE k1.workflows
ADD COLUMN IF NOT EXISTS events JSONB DEFAULT '{"emits": [], "listensTo": []}';

-- Add parent workflow reference (for sub-workflows)
ALTER TABLE k1.workflows
ADD COLUMN IF NOT EXISTS parent_workflow_id VARCHAR(255) REFERENCES k1.workflows(id) ON DELETE SET NULL;

-- Add workflow type classification
ALTER TABLE k1.workflows
ADD COLUMN IF NOT EXISTS workflow_type VARCHAR(50) DEFAULT 'main';

-- Add inputs/outputs definition for sub-workflows
ALTER TABLE k1.workflows
ADD COLUMN IF NOT EXISTS inputs JSONB DEFAULT '[]';

ALTER TABLE k1.workflows
ADD COLUMN IF NOT EXISTS outputs JSONB DEFAULT '[]';

-- Create index for sub-workflow lookups
CREATE INDEX IF NOT EXISTS idx_workflows_is_sub_workflow ON k1.workflows(is_sub_workflow);
CREATE INDEX IF NOT EXISTS idx_workflows_parent_id ON k1.workflows(parent_workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflows_type ON k1.workflows(workflow_type);

-- Add constraint for workflow_type
ALTER TABLE k1.workflows
ADD CONSTRAINT IF NOT EXISTS valid_workflow_type
CHECK (workflow_type IN ('main', 'sub', 'background', 'scheduled', 'event_handler'));

-- ============================================================================
-- Workflow Connections Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS k1.workflow_connections (
    id VARCHAR(255) PRIMARY KEY,
    application_id VARCHAR(255) NOT NULL REFERENCES k1.applications(id) ON DELETE CASCADE,

    -- Source workflow
    source_workflow_id VARCHAR(255) NOT NULL REFERENCES k1.workflows(id) ON DELETE CASCADE,

    -- Target workflow
    target_workflow_id VARCHAR(255) NOT NULL REFERENCES k1.workflows(id) ON DELETE CASCADE,

    -- Connection type: event, direct_call
    connection_type VARCHAR(50) NOT NULL DEFAULT 'event',

    -- Event name (for event-based connections)
    event_name VARCHAR(255),

    -- Configuration
    config JSONB DEFAULT '{}',

    -- State
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_connection_type CHECK (connection_type IN ('event', 'direct_call')),
    CONSTRAINT unique_connection UNIQUE(source_workflow_id, target_workflow_id, connection_type, event_name)
);

CREATE INDEX IF NOT EXISTS idx_wf_conn_application_id ON k1.workflow_connections(application_id);
CREATE INDEX IF NOT EXISTS idx_wf_conn_source ON k1.workflow_connections(source_workflow_id);
CREATE INDEX IF NOT EXISTS idx_wf_conn_target ON k1.workflow_connections(target_workflow_id);
CREATE INDEX IF NOT EXISTS idx_wf_conn_event ON k1.workflow_connections(event_name);
CREATE INDEX IF NOT EXISTS idx_wf_conn_type ON k1.workflow_connections(connection_type);

-- ============================================================================
-- Workflow Executions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS k1.workflow_executions (
    id VARCHAR(255) PRIMARY KEY,
    application_id VARCHAR(255) NOT NULL REFERENCES k1.applications(id) ON DELETE CASCADE,
    workflow_id VARCHAR(255) NOT NULL REFERENCES k1.workflows(id) ON DELETE CASCADE,

    -- Correlation ID for tracking related executions across workflows
    correlation_id VARCHAR(255) NOT NULL,

    -- Parent execution (for sub-workflow calls)
    parent_execution_id VARCHAR(255) REFERENCES k1.workflow_executions(id) ON DELETE SET NULL,

    -- Execution status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',

    -- Trigger information
    triggered_by VARCHAR(50) NOT NULL,
    trigger_data JSONB DEFAULT '{}',

    -- Execution data
    input_data JSONB DEFAULT '{}',
    output_data JSONB,
    variables JSONB DEFAULT '{}',

    -- Current execution state
    current_node_id VARCHAR(255),
    completed_nodes JSONB DEFAULT '[]',

    -- Error handling
    error_message TEXT,
    error_stack TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_execution_status CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'waiting'))
);

CREATE INDEX IF NOT EXISTS idx_wf_exec_application_id ON k1.workflow_executions(application_id);
CREATE INDEX IF NOT EXISTS idx_wf_exec_workflow_id ON k1.workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wf_exec_correlation_id ON k1.workflow_executions(correlation_id);
CREATE INDEX IF NOT EXISTS idx_wf_exec_parent_id ON k1.workflow_executions(parent_execution_id);
CREATE INDEX IF NOT EXISTS idx_wf_exec_status ON k1.workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_wf_exec_started_at ON k1.workflow_executions(started_at);
CREATE INDEX IF NOT EXISTS idx_wf_exec_created_at ON k1.workflow_executions(created_at);

-- ============================================================================
-- Workflow Events Table (Event Bus persistence)
-- ============================================================================
CREATE TABLE IF NOT EXISTS k1.workflow_events (
    id VARCHAR(255) PRIMARY KEY,
    application_id VARCHAR(255) NOT NULL REFERENCES k1.applications(id) ON DELETE CASCADE,

    -- Event information
    event_name VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) DEFAULT 'custom',

    -- Correlation tracking
    correlation_id VARCHAR(255),

    -- Source information
    source_workflow_id VARCHAR(255) REFERENCES k1.workflows(id) ON DELETE SET NULL,
    source_node_id VARCHAR(255),
    source_execution_id VARCHAR(255) REFERENCES k1.workflow_executions(id) ON DELETE SET NULL,

    -- Event payload
    payload JSONB DEFAULT '{}',

    -- Processing status
    status VARCHAR(50) DEFAULT 'pending',
    processed_by JSONB DEFAULT '[]', -- Array of workflow IDs that processed this event

    -- Timing
    emitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_event_status CHECK (status IN ('pending', 'processing', 'processed', 'expired', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_wf_events_application_id ON k1.workflow_events(application_id);
CREATE INDEX IF NOT EXISTS idx_wf_events_event_name ON k1.workflow_events(event_name);
CREATE INDEX IF NOT EXISTS idx_wf_events_correlation_id ON k1.workflow_events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_wf_events_source_workflow ON k1.workflow_events(source_workflow_id);
CREATE INDEX IF NOT EXISTS idx_wf_events_status ON k1.workflow_events(status);
CREATE INDEX IF NOT EXISTS idx_wf_events_emitted_at ON k1.workflow_events(emitted_at);
CREATE INDEX IF NOT EXISTS idx_wf_events_expires_at ON k1.workflow_events(expires_at);

-- ============================================================================
-- Workflow Messages Table (Message Store persistence)
-- ============================================================================
CREATE TABLE IF NOT EXISTS k1.workflow_messages (
    id VARCHAR(255) PRIMARY KEY,
    application_id VARCHAR(255) NOT NULL REFERENCES k1.applications(id) ON DELETE CASCADE,

    -- Correlation tracking
    correlation_id VARCHAR(255) NOT NULL,

    -- Message direction
    source_workflow_id VARCHAR(255) REFERENCES k1.workflows(id) ON DELETE SET NULL,
    target_workflow_id VARCHAR(255) REFERENCES k1.workflows(id) ON DELETE SET NULL,

    -- Message type
    message_type VARCHAR(50) NOT NULL,

    -- Message content
    payload JSONB DEFAULT '{}',

    -- Response (for request-response patterns)
    response JSONB,
    response_at TIMESTAMP WITH TIME ZONE,

    -- Error handling
    error JSONB,

    -- TTL
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_message_type CHECK (message_type IN ('state_pass', 'subworkflow_call', 'subworkflow_response', 'event', 'error'))
);

CREATE INDEX IF NOT EXISTS idx_wf_messages_application_id ON k1.workflow_messages(application_id);
CREATE INDEX IF NOT EXISTS idx_wf_messages_correlation_id ON k1.workflow_messages(correlation_id);
CREATE INDEX IF NOT EXISTS idx_wf_messages_source ON k1.workflow_messages(source_workflow_id);
CREATE INDEX IF NOT EXISTS idx_wf_messages_target ON k1.workflow_messages(target_workflow_id);
CREATE INDEX IF NOT EXISTS idx_wf_messages_type ON k1.workflow_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_wf_messages_created_at ON k1.workflow_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_wf_messages_expires_at ON k1.workflow_messages(expires_at);

-- ============================================================================
-- Add triggers for updated_at
-- ============================================================================

CREATE TRIGGER IF NOT EXISTS update_workflow_connections_updated_at
BEFORE UPDATE ON k1.workflow_connections
FOR EACH ROW EXECUTE FUNCTION k1.update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_workflow_executions_updated_at
BEFORE UPDATE ON k1.workflow_executions
FOR EACH ROW EXECUTE FUNCTION k1.update_updated_at_column();

-- ============================================================================
-- Update applications table for multi-workflow count
-- ============================================================================

-- Add sub_workflow_count column
ALTER TABLE k1.applications
ADD COLUMN IF NOT EXISTS sub_workflow_count INTEGER DEFAULT 0;

-- Add workflow_connections_count column
ALTER TABLE k1.applications
ADD COLUMN IF NOT EXISTS workflow_connections_count INTEGER DEFAULT 0;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN k1.workflows.triggers IS 'Array of trigger configurations: user_action, event, schedule, api, direct_call';
COMMENT ON COLUMN k1.workflows.is_sub_workflow IS 'Whether this workflow is called by other workflows';
COMMENT ON COLUMN k1.workflows.events IS 'Event configuration: emits and listensTo arrays';
COMMENT ON COLUMN k1.workflows.parent_workflow_id IS 'Reference to parent workflow for nested sub-workflows';
COMMENT ON COLUMN k1.workflows.workflow_type IS 'Classification: main, sub, background, scheduled, event_handler';

COMMENT ON TABLE k1.workflow_connections IS 'Connections between workflows for event-based or direct call communication';
COMMENT ON TABLE k1.workflow_executions IS 'Runtime execution instances of workflows';
COMMENT ON TABLE k1.workflow_events IS 'Persisted events for event bus communication between workflows';
COMMENT ON TABLE k1.workflow_messages IS 'Messages for state passing between workflows';

-- ============================================================================
-- Cleanup function for expired events and messages
-- ============================================================================

CREATE OR REPLACE FUNCTION k1.cleanup_expired_workflow_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- Delete expired events
    DELETE FROM k1.workflow_events
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;

    -- Delete expired messages
    DELETE FROM k1.workflow_messages
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION k1.cleanup_expired_workflow_data() IS 'Removes expired events and messages from workflow tables';
