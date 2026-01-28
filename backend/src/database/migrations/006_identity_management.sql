-- Identity Management Schema
-- Supports multi-org, OAuth, hierarchical roles, org chart

-- ============================================
-- ORGANIZATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  industry VARCHAR(100),
  website VARCHAR(255),
  settings JSONB DEFAULT '{}',
  auth_providers JSONB DEFAULT '["local"]',  -- ['local', 'google', 'saml']
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- USERS (Platform-wide)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,
  phone VARCHAR(50),
  auth_provider VARCHAR(50) DEFAULT 'local',  -- 'local', 'google', 'saml'
  auth_provider_id VARCHAR(255),
  password_hash VARCHAR(255),  -- only for local auth
  email_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ORGANIZATION MEMBERSHIPS
-- ============================================
CREATE TABLE IF NOT EXISTS organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active',  -- active, invited, suspended
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMP,
  joined_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- ============================================
-- DEPARTMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  code VARCHAR(20),  -- e.g., 'ENG', 'FIN', 'OPS'
  parent_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  head_position_id UUID,  -- FK added after positions table
  color VARCHAR(20),  -- for UI display
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

-- ============================================
-- POSITIONS (Org Chart nodes)
-- ============================================
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  parent_position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
  level INTEGER DEFAULT 1,  -- 1=C-suite, 2=VP, 3=Director, 4=Manager, 5=IC
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- who holds this position
  is_vacant BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add FK constraint to departments after positions table exists
ALTER TABLE departments
ADD CONSTRAINT fk_head_position
FOREIGN KEY (head_position_id) REFERENCES positions(id) ON DELETE SET NULL;

-- ============================================
-- REPORTING RELATIONSHIPS (for matrix orgs)
-- ============================================
CREATE TABLE IF NOT EXISTS reporting_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  manager_position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  reportee_position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  relationship_type VARCHAR(20) DEFAULT 'direct',  -- direct, dotted, matrix
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(manager_position_id, reportee_position_id)
);

-- ============================================
-- ORG ROLES (Organization-wide roles)
-- ============================================
CREATE TABLE IF NOT EXISTS org_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100),
  description TEXT,
  parent_role_id UUID REFERENCES org_roles(id) ON DELETE SET NULL,  -- for hierarchy
  permissions JSONB DEFAULT '[]',
  is_system BOOLEAN DEFAULT FALSE,  -- built-in roles cannot be deleted
  is_default BOOLEAN DEFAULT FALSE,  -- auto-assign to new members
  level INTEGER DEFAULT 0,  -- hierarchy level (0=root)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- ============================================
-- USER ORG ROLES
-- ============================================
CREATE TABLE IF NOT EXISTS user_org_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_role_id UUID NOT NULL REFERENCES org_roles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, org_role_id)
);

-- ============================================
-- GROUPS
-- ============================================
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(20) DEFAULT 'custom',  -- custom, department, project, team
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- ============================================
-- GROUP MEMBERS
-- ============================================
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',  -- member, admin
  added_by UUID REFERENCES users(id),
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- ============================================
-- APP ROLES (Per-application roles)
-- ============================================
CREATE TABLE IF NOT EXISTS app_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL,  -- references applications table
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100),
  description TEXT,
  parent_role_id UUID REFERENCES app_roles(id) ON DELETE SET NULL,
  permissions JSONB DEFAULT '[]',
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(app_id, name)
);

-- ============================================
-- USER APP ROLES
-- ============================================
CREATE TABLE IF NOT EXISTS user_app_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  app_role_id UUID NOT NULL REFERENCES app_roles(id) ON DELETE CASCADE,
  app_id UUID NOT NULL,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, app_role_id)
);

-- ============================================
-- AUTH TOKENS (for sessions)
-- ============================================
CREATE TABLE IF NOT EXISTS auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  type VARCHAR(20) DEFAULT 'access',  -- access, refresh, api_key
  expires_at TIMESTAMP NOT NULL,
  last_used_at TIMESTAMP,
  user_agent TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- OAUTH CONNECTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS oauth_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,  -- google, microsoft, github
  provider_user_id VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  profile_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(provider, provider_user_id)
);

-- ============================================
-- INVITATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  invited_by UUID NOT NULL REFERENCES users(id),
  org_role_id UUID REFERENCES org_roles(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',  -- pending, accepted, expired, cancelled
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth_provider ON users(auth_provider, auth_provider_id);
CREATE INDEX idx_org_memberships_user ON organization_memberships(user_id);
CREATE INDEX idx_org_memberships_org ON organization_memberships(organization_id);
CREATE INDEX idx_positions_org ON positions(organization_id);
CREATE INDEX idx_positions_parent ON positions(parent_position_id);
CREATE INDEX idx_positions_user ON positions(user_id);
CREATE INDEX idx_positions_dept ON positions(department_id);
CREATE INDEX idx_departments_org ON departments(organization_id);
CREATE INDEX idx_departments_parent ON departments(parent_department_id);
CREATE INDEX idx_org_roles_org ON org_roles(organization_id);
CREATE INDEX idx_org_roles_parent ON org_roles(parent_role_id);
CREATE INDEX idx_user_org_roles_user ON user_org_roles(user_id);
CREATE INDEX idx_groups_org ON groups(organization_id);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_app_roles_app ON app_roles(app_id);
CREATE INDEX idx_user_app_roles_user ON user_app_roles(user_id);
CREATE INDEX idx_auth_tokens_user ON auth_tokens(user_id);
CREATE INDEX idx_auth_tokens_hash ON auth_tokens(token_hash);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Create default organization
INSERT INTO organizations (id, name, slug, description)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Organization',
  'default',
  'Default organization for the platform'
) ON CONFLICT (slug) DO NOTHING;

-- Create default system roles for the default org
INSERT INTO org_roles (organization_id, name, display_name, description, is_system, level, permissions) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  'org_admin',
  'Organization Admin',
  'Full administrative access to the organization',
  TRUE,
  0,
  '["org:manage", "users:manage", "roles:manage", "apps:manage", "billing:manage"]'
),
(
  '00000000-0000-0000-0000-000000000001',
  'org_manager',
  'Organization Manager',
  'Can manage users and apps but not billing or org settings',
  TRUE,
  1,
  '["users:manage", "apps:manage", "apps:create"]'
),
(
  '00000000-0000-0000-0000-000000000001',
  'org_member',
  'Organization Member',
  'Standard member with access to assigned apps',
  TRUE,
  2,
  '["apps:access", "profile:manage"]'
),
(
  '00000000-0000-0000-0000-000000000001',
  'org_viewer',
  'Organization Viewer',
  'Read-only access',
  TRUE,
  3,
  '["apps:view", "profile:view"]'
) ON CONFLICT (organization_id, name) DO NOTHING;

-- Create default sample groups for the default org
INSERT INTO groups (id, organization_id, name, description, type) VALUES
(
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'Approvers',
  'Team responsible for approving requests and tasks',
  'custom'
),
(
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000001',
  'Finance Team',
  'Finance and accounting department members',
  'department'
),
(
  '00000000-0000-0000-0000-000000000013',
  '00000000-0000-0000-0000-000000000001',
  'HR Team',
  'Human resources department members',
  'department'
),
(
  '00000000-0000-0000-0000-000000000014',
  '00000000-0000-0000-0000-000000000001',
  'IT Support',
  'IT support and helpdesk team',
  'custom'
),
(
  '00000000-0000-0000-0000-000000000015',
  '00000000-0000-0000-0000-000000000001',
  'Management',
  'Senior management and executives',
  'custom'
) ON CONFLICT (id) DO NOTHING;
