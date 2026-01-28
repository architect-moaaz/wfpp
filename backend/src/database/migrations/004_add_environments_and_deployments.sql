-- Migration: Add environments and deployments tables for Deployment Dashboard
-- Description: Stores environment configurations and deployment history
-- Author: Workflow++ Team
-- Date: 2025-12-24

SET search_path TO k1;

-- ============================================================================
-- Environments Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS k1.environments (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,

    -- Environment configuration
    config JSONB DEFAULT '{}',

    -- Connection details
    host VARCHAR(500),
    port INTEGER,
    base_url VARCHAR(500),

    -- Resource limits
    resources JSONB DEFAULT '{
        "cpu": "1",
        "memory": "512Mi",
        "replicas": 1
    }',

    -- Auto-scaling configuration
    auto_scaling JSONB DEFAULT '{
        "enabled": false,
        "min_replicas": 1,
        "max_replicas": 10,
        "target_cpu_utilization": 70
    }',

    -- Environment variables template
    env_vars JSONB DEFAULT '{}',

    -- Status
    status VARCHAR(50) DEFAULT 'active',
    is_default BOOLEAN DEFAULT false,

    -- Metadata
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_env_type CHECK (type IN ('local', 'development', 'staging', 'production', 'custom')),
    CONSTRAINT valid_env_status CHECK (status IN ('active', 'inactive', 'maintenance', 'error'))
);

CREATE INDEX idx_environments_name ON k1.environments(name);
CREATE INDEX idx_environments_type ON k1.environments(type);
CREATE INDEX idx_environments_status ON k1.environments(status);
CREATE INDEX idx_environments_is_default ON k1.environments(is_default);

-- ============================================================================
-- Deployments Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS k1.deployments (
    id VARCHAR(255) PRIMARY KEY,
    application_id VARCHAR(255) NOT NULL REFERENCES k1.applications(id) ON DELETE CASCADE,
    environment_id VARCHAR(255) NOT NULL REFERENCES k1.environments(id) ON DELETE CASCADE,

    -- Version information
    version VARCHAR(50) NOT NULL,
    build_number INTEGER,
    commit_hash VARCHAR(100),

    -- Deployment status
    status VARCHAR(50) DEFAULT 'pending',

    -- Deployment progress (percentage 0-100)
    progress INTEGER DEFAULT 0,
    current_step VARCHAR(255),

    -- Steps tracking
    steps JSONB DEFAULT '[]',

    -- Access URLs
    urls JSONB DEFAULT '{
        "frontend": null,
        "backend": null,
        "api_docs": null,
        "health": null
    }',

    -- Runtime information
    runtime JSONB DEFAULT '{
        "pid": null,
        "port": null,
        "memory_usage": null,
        "cpu_usage": null,
        "start_time": null
    }',

    -- Logs
    logs JSONB DEFAULT '[]',

    -- Test results
    test_results JSONB DEFAULT '{
        "passed": 0,
        "failed": 0,
        "skipped": 0,
        "duration_ms": 0,
        "details": []
    }',

    -- Error tracking
    error_message TEXT,
    error_details JSONB,

    -- Rollback info
    rollback_target_id VARCHAR(255),
    can_rollback BOOLEAN DEFAULT false,

    -- Metadata
    deployed_by VARCHAR(255),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_deployment_status CHECK (status IN (
        'pending', 'validating', 'building', 'testing', 'deploying',
        'starting', 'health_check', 'completed', 'failed', 'cancelled', 'rolled_back'
    )),
    CONSTRAINT valid_progress CHECK (progress >= 0 AND progress <= 100)
);

CREATE INDEX idx_deployments_application_id ON k1.deployments(application_id);
CREATE INDEX idx_deployments_environment_id ON k1.deployments(environment_id);
CREATE INDEX idx_deployments_status ON k1.deployments(status);
CREATE INDEX idx_deployments_started_at ON k1.deployments(started_at);
CREATE INDEX idx_deployments_version ON k1.deployments(version);

-- ============================================================================
-- Deployment History View (for quick access to deployment timeline)
-- ============================================================================
CREATE OR REPLACE VIEW k1.deployment_history AS
SELECT
    d.id,
    d.application_id,
    a.name as application_name,
    d.environment_id,
    e.name as environment_name,
    e.type as environment_type,
    d.version,
    d.status,
    d.progress,
    d.urls,
    d.deployed_by,
    d.started_at,
    d.completed_at,
    EXTRACT(EPOCH FROM (COALESCE(d.completed_at, NOW()) - d.started_at)) as duration_seconds
FROM k1.deployments d
JOIN k1.applications a ON d.application_id = a.id
JOIN k1.environments e ON d.environment_id = e.id
ORDER BY d.started_at DESC;

-- ============================================================================
-- Active Deployments View (currently running deployments)
-- ============================================================================
CREATE OR REPLACE VIEW k1.active_deployments AS
SELECT
    d.id,
    d.application_id,
    a.name as application_name,
    a.slug as application_slug,
    d.environment_id,
    e.name as environment_name,
    e.type as environment_type,
    d.version,
    d.status,
    d.urls,
    d.runtime,
    d.started_at
FROM k1.deployments d
JOIN k1.applications a ON d.application_id = a.id
JOIN k1.environments e ON d.environment_id = e.id
WHERE d.status = 'completed'
AND d.id = (
    SELECT id FROM k1.deployments
    WHERE application_id = d.application_id
    AND environment_id = d.environment_id
    AND status = 'completed'
    ORDER BY completed_at DESC
    LIMIT 1
);

-- ============================================================================
-- Add triggers for updated_at
-- ============================================================================
CREATE TRIGGER update_environments_updated_at BEFORE UPDATE ON k1.environments
    FOR EACH ROW EXECUTE FUNCTION k1.update_updated_at_column();

CREATE TRIGGER update_deployments_updated_at BEFORE UPDATE ON k1.deployments
    FOR EACH ROW EXECUTE FUNCTION k1.update_updated_at_column();

-- ============================================================================
-- Insert default environments
-- ============================================================================
INSERT INTO k1.environments (id, name, type, description, host, port, is_default, config)
VALUES
    ('env-local', 'Local Development', 'local', 'Local development environment', 'localhost', 4000, true,
     '{"auto_install_deps": true, "hot_reload": true}'),
    ('env-dev', 'Development', 'development', 'Shared development environment', NULL, NULL, false,
     '{"auto_deploy": false, "require_tests": false}'),
    ('env-staging', 'Staging', 'staging', 'Pre-production staging environment', NULL, NULL, false,
     '{"auto_deploy": false, "require_tests": true}'),
    ('env-prod', 'Production', 'production', 'Production environment', NULL, NULL, false,
     '{"auto_deploy": false, "require_tests": true, "require_approval": true}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE k1.environments IS 'Deployment environment configurations (local, dev, staging, prod)';
COMMENT ON TABLE k1.deployments IS 'Deployment history and status tracking';
COMMENT ON VIEW k1.deployment_history IS 'Historical view of all deployments with application and environment info';
COMMENT ON VIEW k1.active_deployments IS 'Currently active/running deployments per application per environment';
