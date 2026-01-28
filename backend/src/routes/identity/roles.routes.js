const express = require('express');
const router = express.Router();

module.exports = (services) => {
  const { roleService } = services;

  // ============================================
  // ORG ROLES
  // ============================================

  // List org roles
  router.get('/org/:orgId', async (req, res) => {
    try {
      const { orgId } = req.params;
      const { includeSystem = 'true', flat = 'false' } = req.query;

      const roles = await roleService.listOrgRoles(orgId, {
        includeSystem: includeSystem === 'true',
        flat: flat === 'true'
      });

      res.json(roles);
    } catch (error) {
      console.error('Error listing org roles:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get org role by ID
  router.get('/org/role/:roleId', async (req, res) => {
    try {
      const { roleId } = req.params;
      const role = await roleService.getOrgRoleById(roleId);

      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }

      res.json(role);
    } catch (error) {
      console.error('Error fetching org role:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create org role
  router.post('/org/:orgId', async (req, res) => {
    try {
      const { orgId } = req.params;
      const roleData = req.body;

      const role = await roleService.createOrgRole(orgId, roleData);
      res.status(201).json(role);
    } catch (error) {
      console.error('Error creating org role:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update org role
  router.put('/org/role/:roleId', async (req, res) => {
    try {
      const { roleId } = req.params;
      const updates = req.body;

      const role = await roleService.updateOrgRole(roleId, updates);
      res.json(role);
    } catch (error) {
      console.error('Error updating org role:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete org role
  router.delete('/org/role/:roleId', async (req, res) => {
    try {
      const { roleId } = req.params;
      await roleService.deleteOrgRole(roleId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting org role:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get users with org role
  router.get('/org/role/:roleId/users', async (req, res) => {
    try {
      const { roleId } = req.params;
      const { includeDescendants = 'false' } = req.query;

      const users = await roleService.getUsersWithOrgRole(roleId, {
        includeDescendants: includeDescendants === 'true'
      });

      res.json(users);
    } catch (error) {
      console.error('Error fetching role users:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get role hierarchy (ancestors)
  router.get('/org/role/:roleId/ancestors', async (req, res) => {
    try {
      const { roleId } = req.params;
      const ancestors = await roleService.getRoleAncestors(roleId, false);
      res.json(ancestors);
    } catch (error) {
      console.error('Error fetching role ancestors:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get role descendants
  router.get('/org/role/:roleId/descendants', async (req, res) => {
    try {
      const { roleId } = req.params;
      const descendants = await roleService.getRoleDescendants(roleId, false);
      res.json(descendants);
    } catch (error) {
      console.error('Error fetching role descendants:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get effective permissions for role
  router.get('/org/role/:roleId/permissions', async (req, res) => {
    try {
      const { roleId } = req.params;
      const permissions = await roleService.getEffectivePermissions(roleId, false);
      res.json({ permissions });
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // APP ROLES
  // ============================================

  // List app roles
  router.get('/app/:appId', async (req, res) => {
    try {
      const { appId } = req.params;
      const { flat = 'false' } = req.query;

      const roles = await roleService.listAppRoles(appId, {
        flat: flat === 'true'
      });

      res.json(roles);
    } catch (error) {
      console.error('Error listing app roles:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get app role by ID
  router.get('/app/role/:roleId', async (req, res) => {
    try {
      const { roleId } = req.params;
      const role = await roleService.getAppRoleById(roleId);

      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }

      res.json(role);
    } catch (error) {
      console.error('Error fetching app role:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create app role
  router.post('/app/:appId', async (req, res) => {
    try {
      const { appId } = req.params;
      const { organizationId, ...roleData } = req.body;

      const role = await roleService.createAppRole(appId, organizationId, roleData);
      res.status(201).json(role);
    } catch (error) {
      console.error('Error creating app role:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update app role
  router.put('/app/role/:roleId', async (req, res) => {
    try {
      const { roleId } = req.params;
      const updates = req.body;

      const role = await roleService.updateAppRole(roleId, updates);
      res.json(role);
    } catch (error) {
      console.error('Error updating app role:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete app role
  router.delete('/app/role/:roleId', async (req, res) => {
    try {
      const { roleId } = req.params;
      await roleService.deleteAppRole(roleId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting app role:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get users with app role
  router.get('/app/role/:roleId/users', async (req, res) => {
    try {
      const { roleId } = req.params;
      const { includeDescendants = 'false' } = req.query;

      const users = await roleService.getUsersWithAppRole(roleId, {
        includeDescendants: includeDescendants === 'true'
      });

      res.json(users);
    } catch (error) {
      console.error('Error fetching role users:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create default app roles
  router.post('/app/:appId/default', async (req, res) => {
    try {
      const { appId } = req.params;
      const { organizationId } = req.body;

      await roleService.createDefaultAppRoles(appId, organizationId);
      const roles = await roleService.listAppRoles(appId);

      res.status(201).json(roles);
    } catch (error) {
      console.error('Error creating default app roles:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // ROLE ASSIGNMENT
  // ============================================

  // Assign org role to user
  router.post('/assign/org', async (req, res) => {
    try {
      const { userId, roleId, organizationId } = req.body;
      const assignedBy = req.user?.id;

      const result = await roleService.assignOrgRoleToUser(userId, roleId, organizationId, assignedBy);
      res.json(result);
    } catch (error) {
      console.error('Error assigning org role:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Remove org role from user
  router.post('/unassign/org', async (req, res) => {
    try {
      const { userId, roleId } = req.body;
      await roleService.removeOrgRoleFromUser(userId, roleId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing org role:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Assign app role to user
  router.post('/assign/app', async (req, res) => {
    try {
      const { userId, roleId, appId } = req.body;
      const assignedBy = req.user?.id;

      const result = await roleService.assignAppRoleToUser(userId, roleId, appId, assignedBy);
      res.json(result);
    } catch (error) {
      console.error('Error assigning app role:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Remove app role from user
  router.post('/unassign/app', async (req, res) => {
    try {
      const { userId, roleId } = req.body;
      await roleService.removeAppRoleFromUser(userId, roleId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing app role:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
