-- Migration: Create k1 schema for Workflow++ platform database
-- Description: This schema stores application metadata, workflows, forms, data models, pages, and other resources
-- Author: Workflow++ Team
-- Date: 2025-11-15

-- Create schema
CREATE SCHEMA IF NOT EXISTS k1;

-- Set search path
SET search_path TO k1;

-- ============================================================================
-- Applications Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS k1.applications (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100) DEFAULT 'Business Application',
    domain VARCHAR(100),
    industry VARCHAR(100),
    version VARCHAR(50) DEFAULT '1.0.0',
    status VARCHAR(50) DEFAULT 'development',
    icon VARCHAR(255),

    -- Theme configuration (stored as JSONB)
    theme JSONB DEFAULT '{}',

    -- Statistics
    workflow_count INTEGER DEFAULT 0,
    model_count INTEGER DEFAULT 0,
    form_count INTEGER DEFAULT 0,
    page_count INTEGER DEFAULT 0,
    rule_count INTEGER DEFAULT 0,

    -- Runtime configuration
    runtime JSONB DEFAULT '{}',

    -- Deployment configuration
    deployment JSONB DEFAULT '{}',

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Indexes
    CONSTRAINT valid_status CHECK (status IN ('development', 'testing', 'staging', 'production', 'archived'))
);

CREATE INDEX idx_applications_name ON k1.applications(name);
CREATE INDEX idx_applications_type ON k1.applications(type);
CREATE INDEX idx_applications_domain ON k1.applications(domain);
CREATE INDEX idx_applications_status ON k1.applications(status);
CREATE INDEX idx_applications_created_at ON k1.applications(created_at);

-- ============================================================================
-- Workflows Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS k1.workflows (
    id VARCHAR(255) PRIMARY KEY,
    application_id VARCHAR(255) NOT NULL REFERENCES k1.applications(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) DEFAULT '1.0.0',

    -- Workflow definition (nodes, edges, configuration)
    nodes JSONB DEFAULT '[]',
    edges JSONB DEFAULT '[]',
    connections JSONB DEFAULT '[]',

    -- Workflow metadata
    metadata JSONB DEFAULT '{}',

    -- Statistics
    node_count INTEGER DEFAULT 0,
    edge_count INTEGER DEFAULT 0,

    -- State
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_workflows_application_id ON k1.workflows(application_id);
CREATE INDEX idx_workflows_name ON k1.workflows(name);
CREATE INDEX idx_workflows_is_active ON k1.workflows(is_active);

-- ============================================================================
-- Data Models Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS k1.data_models (
    id VARCHAR(255) PRIMARY KEY,
    application_id VARCHAR(255) NOT NULL REFERENCES k1.applications(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Schema definition
    fields JSONB DEFAULT '[]',
    relationships JSONB DEFAULT '[]',
    indexes JSONB DEFAULT '[]',
    constraints JSONB DEFAULT '[]',

    -- Configuration
    config JSONB DEFAULT '{}',

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_data_models_application_id ON k1.data_models(application_id);
CREATE INDEX idx_data_models_name ON k1.data_models(name);

-- ============================================================================
-- Forms Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS k1.forms (
    id VARCHAR(255) PRIMARY KEY,
    application_id VARCHAR(255) NOT NULL REFERENCES k1.applications(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Form definition
    fields JSONB DEFAULT '[]',
    layout JSONB DEFAULT '{}',
    validation JSONB DEFAULT '{}',

    -- Linked data model
    data_model_id VARCHAR(255) REFERENCES k1.data_models(id),

    -- Configuration
    config JSONB DEFAULT '{}',

    -- Styling
    styling JSONB DEFAULT '{}',

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_forms_application_id ON k1.forms(application_id);
CREATE INDEX idx_forms_name ON k1.forms(name);
CREATE INDEX idx_forms_data_model_id ON k1.forms(data_model_id);

-- ============================================================================
-- Pages Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS k1.pages (
    id VARCHAR(255) PRIMARY KEY,
    application_id VARCHAR(255) NOT NULL REFERENCES k1.applications(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    route VARCHAR(255),

    -- Page structure
    components JSONB DEFAULT '[]',
    layout JSONB DEFAULT '{}',

    -- Linked resources
    forms JSONB DEFAULT '[]',
    workflows JSONB DEFAULT '[]',
    data_sources JSONB DEFAULT '[]',

    -- Configuration
    config JSONB DEFAULT '{}',

    -- Styling
    styling JSONB DEFAULT '{}',

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pages_application_id ON k1.pages(application_id);
CREATE INDEX idx_pages_name ON k1.pages(name);
CREATE INDEX idx_pages_route ON k1.pages(route);

-- ============================================================================
-- Mobile UI Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS k1.mobile_ui (
    id VARCHAR(255) PRIMARY KEY,
    application_id VARCHAR(255) NOT NULL REFERENCES k1.applications(id) ON DELETE CASCADE,

    -- Mobile UI definition
    screens JSONB DEFAULT '[]',
    navigation JSONB DEFAULT '{}',
    theme JSONB DEFAULT '{}',

    -- Configuration
    config JSONB DEFAULT '{}',

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- One mobile UI per application
    UNIQUE(application_id)
);

CREATE INDEX idx_mobile_ui_application_id ON k1.mobile_ui(application_id);

-- ============================================================================
-- Rules Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS k1.rules (
    id VARCHAR(255) PRIMARY KEY,
    application_id VARCHAR(255) NOT NULL REFERENCES k1.applications(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Rule definition
    conditions JSONB DEFAULT '[]',
    actions JSONB DEFAULT '[]',

    -- Rule type
    type VARCHAR(100),

    -- Priority and execution
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rules_application_id ON k1.rules(application_id);
CREATE INDEX idx_rules_type ON k1.rules(type);
CREATE INDEX idx_rules_is_active ON k1.rules(is_active);
CREATE INDEX idx_rules_priority ON k1.rules(priority);

-- ============================================================================
-- APIs Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS k1.apis (
    id VARCHAR(255) PRIMARY KEY,
    application_id VARCHAR(255) NOT NULL REFERENCES k1.applications(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- API definition
    endpoint VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL,

    -- Request/Response schema
    request_schema JSONB DEFAULT '{}',
    response_schema JSONB DEFAULT '{}',

    -- Configuration
    config JSONB DEFAULT '{}',

    -- Security
    authentication JSONB DEFAULT '{}',

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_apis_application_id ON k1.apis(application_id);
CREATE INDEX idx_apis_endpoint ON k1.apis(endpoint);
CREATE INDEX idx_apis_method ON k1.apis(method);

-- ============================================================================
-- Application Version History Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS k1.application_versions (
    id SERIAL PRIMARY KEY,
    application_id VARCHAR(255) NOT NULL REFERENCES k1.applications(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,

    -- Snapshot of the application state
    snapshot JSONB NOT NULL,

    -- Version metadata
    commit_message TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(application_id, version)
);

CREATE INDEX idx_app_versions_application_id ON k1.application_versions(application_id);
CREATE INDEX idx_app_versions_created_at ON k1.application_versions(created_at);

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION k1.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to all tables
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON k1.applications
    FOR EACH ROW EXECUTE FUNCTION k1.update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON k1.workflows
    FOR EACH ROW EXECUTE FUNCTION k1.update_updated_at_column();

CREATE TRIGGER update_data_models_updated_at BEFORE UPDATE ON k1.data_models
    FOR EACH ROW EXECUTE FUNCTION k1.update_updated_at_column();

CREATE TRIGGER update_forms_updated_at BEFORE UPDATE ON k1.forms
    FOR EACH ROW EXECUTE FUNCTION k1.update_updated_at_column();

CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON k1.pages
    FOR EACH ROW EXECUTE FUNCTION k1.update_updated_at_column();

CREATE TRIGGER update_mobile_ui_updated_at BEFORE UPDATE ON k1.mobile_ui
    FOR EACH ROW EXECUTE FUNCTION k1.update_updated_at_column();

CREATE TRIGGER update_rules_updated_at BEFORE UPDATE ON k1.rules
    FOR EACH ROW EXECUTE FUNCTION k1.update_updated_at_column();

CREATE TRIGGER update_apis_updated_at BEFORE UPDATE ON k1.apis
    FOR EACH ROW EXECUTE FUNCTION k1.update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON SCHEMA k1 IS 'Workflow++ platform database schema for application metadata and resources';
COMMENT ON TABLE k1.applications IS 'Main applications registry';
COMMENT ON TABLE k1.workflows IS 'Workflow definitions belonging to applications';
COMMENT ON TABLE k1.data_models IS 'Data model schemas';
COMMENT ON TABLE k1.forms IS 'Form definitions';
COMMENT ON TABLE k1.pages IS 'Page definitions';
COMMENT ON TABLE k1.mobile_ui IS 'Mobile UI configurations';
COMMENT ON TABLE k1.rules IS 'Business rules';
COMMENT ON TABLE k1.apis IS 'API endpoint definitions';
COMMENT ON TABLE k1.application_versions IS 'Version history for applications';
