const express = require('express');
const router = express.Router();

module.exports = (services) => {
  const { organizationService, userService } = services;

  // List organizations (for platform admin or user's orgs)
  router.get('/', async (req, res) => {
    try {
      const userId = req.user?.id;
      const { search, limit = 50, offset = 0 } = req.query;

      // If user is authenticated, return their organizations
      if (userId) {
        const orgs = await userService.getUserOrganizations(userId);
        return res.json({ organizations: orgs });
      }

      // Otherwise return all (for platform admins)
      const orgs = await organizationService.list({
        search,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({ organizations: orgs });
    } catch (error) {
      console.error('Error listing organizations:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get organization by ID
  router.get('/:orgId', async (req, res) => {
    try {
      const { orgId } = req.params;
      const org = await organizationService.getById(orgId);

      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      res.json(org);
    } catch (error) {
      console.error('Error fetching organization:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get organization by slug
  router.get('/slug/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const org = await organizationService.getBySlug(slug);

      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      res.json(org);
    } catch (error) {
      console.error('Error fetching organization:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create organization
  router.post('/', async (req, res) => {
    try {
      const { name, slug, description, logoUrl, settings, authProviders } = req.body;
      const creatorUserId = req.user?.id;

      if (!name || !slug) {
        return res.status(400).json({ error: 'Name and slug are required' });
      }

      const org = await organizationService.createOrganization({
        name,
        slug: slug.toLowerCase(),
        description,
        logoUrl,
        settings,
        authProviders
      }, creatorUserId);

      res.status(201).json(org);
    } catch (error) {
      console.error('Error creating organization:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update organization
  router.put('/:orgId', async (req, res) => {
    try {
      const { orgId } = req.params;
      const updates = req.body;

      const org = await organizationService.update(orgId, updates);

      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      res.json(org);
    } catch (error) {
      console.error('Error updating organization:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get organization stats
  router.get('/:orgId/stats', async (req, res) => {
    try {
      const { orgId } = req.params;
      const stats = await organizationService.getStats(orgId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching org stats:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // MEMBERSHIP
  // ============================================

  // Add member to organization
  router.post('/:orgId/members', async (req, res) => {
    try {
      const { orgId } = req.params;
      const { userId, status = 'active' } = req.body;
      const invitedBy = req.user?.id;

      const membership = await organizationService.addMember(orgId, userId, status, invitedBy);
      res.status(201).json(membership);
    } catch (error) {
      console.error('Error adding member:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Remove member from organization
  router.delete('/:orgId/members/:userId', async (req, res) => {
    try {
      const { orgId, userId } = req.params;
      await organizationService.removeMember(orgId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing member:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update member status
  router.put('/:orgId/members/:userId/status', async (req, res) => {
    try {
      const { orgId, userId } = req.params;
      const { status } = req.body;

      const membership = await organizationService.updateMemberStatus(orgId, userId, status);
      res.json(membership);
    } catch (error) {
      console.error('Error updating member status:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // INVITATIONS
  // ============================================

  // Create invitation
  router.post('/:orgId/invitations', async (req, res) => {
    try {
      const { orgId } = req.params;
      const { email, roleId } = req.body;
      const invitedBy = req.user?.id;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const invitation = await organizationService.createInvitation(orgId, email, invitedBy, roleId);
      res.status(201).json(invitation);
    } catch (error) {
      console.error('Error creating invitation:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get pending invitations
  router.get('/:orgId/invitations', async (req, res) => {
    try {
      const { orgId } = req.params;
      const invitations = await organizationService.getPendingInvitations(orgId);
      res.json(invitations);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Accept invitation (by token)
  router.post('/invitations/:token/accept', async (req, res) => {
    try {
      const { token } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const invitation = await organizationService.acceptInvitation(token, userId);
      res.json(invitation);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Cancel invitation
  router.delete('/:orgId/invitations/:invitationId', async (req, res) => {
    try {
      const { invitationId } = req.params;
      await organizationService.cancelInvitation(invitationId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // AUTH PROVIDERS
  // ============================================

  // Get auth providers
  router.get('/:orgId/auth-providers', async (req, res) => {
    try {
      const { orgId } = req.params;
      const providers = await organizationService.getAuthProviders(orgId);
      res.json({ providers });
    } catch (error) {
      console.error('Error fetching auth providers:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update auth providers
  router.put('/:orgId/auth-providers', async (req, res) => {
    try {
      const { orgId } = req.params;
      const { providers } = req.body;

      const org = await organizationService.updateAuthProviders(orgId, providers);
      res.json(org);
    } catch (error) {
      console.error('Error updating auth providers:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
