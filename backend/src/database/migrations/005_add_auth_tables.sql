-- Migration: Add authentication and authorization tables
-- Description: Users, roles, permissions, and sessions for RBAC
-- Author: Workflow++ Team
-- Date: 2025-12-22

-- Set search path
SET search_path TO k1;

-- ============================================================================
-- Users Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS k1.users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'active',
    email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_user_status CHECK (status IN ('active', 'inactive', 'suspended', 'pending'))
);

CREATE INDEX idx_users_email ON k1.users(email);
CREATE INDEX idx_users_status ON k1.users(status);
CREATE INDEX idx_users_created_at ON k1.users(created_at);

-- ============================================================================
-- Roles Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS k1.roles (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    permissions JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_roles_name ON k1.roles(name);
CREATE INDEX idx_roles_is_system ON k1.roles(is_system);

-- ============================================================================
-- Permissions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS k1.permissions (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_permissions_resource ON k1.permissions(resource);
CREATE INDEX idx_permissions_action ON k1.permissions(action);

-- ============================================================================
-- User Roles Table (Many-to-Many with Application context)
-- ============================================================================
CREATE TABLE IF NOT EXISTS k1.user_roles (
    user_id VARCHAR(255) REFERENCES k1.users(id) ON DELETE CASCADE,
    role_id VARCHAR(255) REFERENCES k1.roles(id) ON DELETE CASCADE,
    application_id VARCHAR(255) REFERENCES k1.applications(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by VARCHAR(255),
    PRIMARY KEY (user_id, role_id, application_id)
);

CREATE INDEX idx_user_roles_user ON k1.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON k1.user_roles(role_id);
CREATE INDEX idx_user_roles_app ON k1.user_roles(application_id);

-- ============================================================================
-- Sessions Table (for token management)
-- ============================================================================
CREATE TABLE IF NOT EXISTS k1.sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES k1.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON k1.sessions(user_id);
CREATE INDEX idx_sessions_expires ON k1.sessions(expires_at);
CREATE INDEX idx_sessions_token ON k1.sessions(token_hash);

-- ============================================================================
-- Audit Log Table (for tracking auth events)
-- ============================================================================
CREATE TABLE IF NOT EXISTS k1.audit_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES k1.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON k1.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON k1.audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON k1.audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON k1.audit_logs(created_at);

-- ============================================================================
-- Add triggers for updated_at
-- ============================================================================
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON k1.users
    FOR EACH ROW EXECUTE FUNCTION k1.update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON k1.roles
    FOR EACH ROW EXECUTE FUNCTION k1.update_updated_at_column();

-- ============================================================================
-- Default Roles
-- ============================================================================
INSERT INTO k1.roles (id, name, description, is_system, permissions) VALUES
    ('role_admin', 'Administrator', 'Full system access with all permissions', true, '["*"]'),
    ('role_developer', 'Developer', 'Create and edit applications, workflows, forms, and data models', true,
     '["app:create", "app:read", "app:update", "app:delete", "workflow:*", "form:*", "datamodel:*", "page:*", "rule:*"]'),
    ('role_viewer', 'Viewer', 'Read-only access to applications and resources', true,
     '["app:read", "workflow:read", "form:read", "datamodel:read", "page:read"]'),
    ('role_operator', 'Operator', 'Execute workflows and manage runtime instances', true,
     '["app:read", "workflow:read", "workflow:execute", "instance:*", "data:read", "data:write"]')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Default Permissions
-- ============================================================================
INSERT INTO k1.permissions (id, name, resource, action, description) VALUES
    ('perm_app_create', 'Create Applications', 'application', 'create', 'Create new applications'),
    ('perm_app_read', 'Read Applications', 'application', 'read', 'View applications and their details'),
    ('perm_app_update', 'Update Applications', 'application', 'update', 'Modify existing applications'),
    ('perm_app_delete', 'Delete Applications', 'application', 'delete', 'Delete applications'),
    ('perm_workflow_create', 'Create Workflows', 'workflow', 'create', 'Create new workflows'),
    ('perm_workflow_read', 'Read Workflows', 'workflow', 'read', 'View workflow definitions'),
    ('perm_workflow_update', 'Update Workflows', 'workflow', 'update', 'Modify workflows'),
    ('perm_workflow_delete', 'Delete Workflows', 'workflow', 'delete', 'Delete workflows'),
    ('perm_workflow_execute', 'Execute Workflows', 'workflow', 'execute', 'Start and manage workflow instances'),
    ('perm_form_create', 'Create Forms', 'form', 'create', 'Create new forms'),
    ('perm_form_read', 'Read Forms', 'form', 'read', 'View form definitions'),
    ('perm_form_update', 'Update Forms', 'form', 'update', 'Modify forms'),
    ('perm_form_delete', 'Delete Forms', 'form', 'delete', 'Delete forms'),
    ('perm_data_read', 'Read Data', 'data', 'read', 'Read application data records'),
    ('perm_data_write', 'Write Data', 'data', 'write', 'Create and update data records'),
    ('perm_data_delete', 'Delete Data', 'data', 'delete', 'Delete data records'),
    ('perm_user_manage', 'Manage Users', 'user', 'manage', 'Create, update, and delete users'),
    ('perm_role_manage', 'Manage Roles', 'role', 'manage', 'Create, update, and delete roles')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE k1.users IS 'User accounts for authentication';
COMMENT ON TABLE k1.roles IS 'Role definitions with permission sets';
COMMENT ON TABLE k1.permissions IS 'Individual permission definitions';
COMMENT ON TABLE k1.user_roles IS 'User-role assignments per application';
COMMENT ON TABLE k1.sessions IS 'Active user sessions for token management';
COMMENT ON TABLE k1.audit_logs IS 'Audit trail for security-relevant actions';
