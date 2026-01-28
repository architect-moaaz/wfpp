const express = require('express');
const router = express.Router();

module.exports = (services) => {
  const { userService, organizationService } = services;

  // Get current user
  router.get('/me', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await userService.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const organizations = await userService.getUserOrganizations(userId);

      res.json({
        ...user,
        organizations
      });
    } catch (error) {
      console.error('Error fetching current user:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update current user profile
  router.put('/me', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { name, firstName, lastName, avatarUrl, phone } = req.body;
      const user = await userService.updateUser(userId, {
        name, firstName, lastName, avatarUrl, phone
      });

      res.json(user);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user by ID
  router.get('/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await userService.getUserById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create user for organization
  router.post('/org/:orgId', async (req, res) => {
    try {
      const { orgId } = req.params;
      const { name, email, firstName, lastName, avatarUrl, phone } = req.body;

      if (!name && !email) {
        return res.status(400).json({ error: 'Name or email is required' });
      }

      // Create the user
      const user = await userService.createUser({
        name: name || `${firstName || ''} ${lastName || ''}`.trim(),
        email: email || `${name?.toLowerCase().replace(/\s+/g, '.')}@placeholder.local`,
        firstName,
        lastName,
        avatarUrl,
        phone,
        authProvider: 'local'
      });

      // Add user to organization membership
      await organizationService.addMember(orgId, user.id);

      res.status(201).json(user);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get users by organization
  router.get('/org/:orgId', async (req, res) => {
    try {
      const { orgId } = req.params;
      const { search, limit = 100, offset = 0 } = req.query;

      const users = await userService.getUsersByOrganization(orgId, {
        search,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      const total = await userService.getUsersCountByOrganization(orgId);

      res.json({
        users,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } catch (error) {
      console.error('Error fetching org users:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's context (roles, position, groups)
  router.get('/:userId/context/:orgId', async (req, res) => {
    try {
      const { userId, orgId } = req.params;
      const userContext = await userService.getUserWithContext(userId, orgId);

      if (!userContext) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(userContext);
    } catch (error) {
      console.error('Error fetching user context:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's manager
  router.get('/:userId/manager/:orgId', async (req, res) => {
    try {
      const { userId, orgId } = req.params;
      const manager = await userService.getUserManager(userId, orgId);
      res.json(manager);
    } catch (error) {
      console.error('Error fetching user manager:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's direct reports
  router.get('/:userId/direct-reports/:orgId', async (req, res) => {
    try {
      const { userId, orgId } = req.params;
      const reports = await userService.getUserDirectReports(userId, orgId);
      res.json(reports);
    } catch (error) {
      console.error('Error fetching direct reports:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get users by org role
  router.get('/by-role/:orgId/:roleId', async (req, res) => {
    try {
      const { orgId, roleId } = req.params;
      const { includeInherited = 'true' } = req.query;

      const users = await userService.getUsersByOrgRole(orgId, roleId, {
        includeInherited: includeInherited === 'true'
      });

      res.json(users);
    } catch (error) {
      console.error('Error fetching users by role:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get users by app role
  router.get('/by-app-role/:appId/:roleId', async (req, res) => {
    try {
      const { appId, roleId } = req.params;
      const users = await userService.getUsersByAppRole(appId, roleId);
      res.json(users);
    } catch (error) {
      console.error('Error fetching users by app role:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Assign org role to user
  router.post('/:userId/org-roles', async (req, res) => {
    try {
      const { userId } = req.params;
      const { roleId, organizationId } = req.body;
      const assignedBy = req.user?.id;

      const result = await userService.assignOrgRole(userId, roleId, organizationId, assignedBy);
      res.json(result);
    } catch (error) {
      console.error('Error assigning org role:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Remove org role from user
  router.delete('/:userId/org-roles/:roleId', async (req, res) => {
    try {
      const { userId, roleId } = req.params;
      await userService.removeOrgRole(userId, roleId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing org role:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Assign app role to user
  router.post('/:userId/app-roles', async (req, res) => {
    try {
      const { userId } = req.params;
      const { roleId, appId } = req.body;
      const assignedBy = req.user?.id;

      const result = await userService.assignAppRole(userId, roleId, appId, assignedBy);
      res.json(result);
    } catch (error) {
      console.error('Error assigning app role:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Remove app role from user
  router.delete('/:userId/app-roles/:roleId', async (req, res) => {
    try {
      const { userId, roleId } = req.params;
      await userService.removeAppRole(userId, roleId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing app role:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
