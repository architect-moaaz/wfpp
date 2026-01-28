const express = require('express');
const router = express.Router();

module.exports = (services) => {
  const { groupService } = services;

  // List groups for organization
  router.get('/org/:orgId', async (req, res) => {
    try {
      const { orgId } = req.params;
      const { type, search, limit = 100, offset = 0 } = req.query;

      const groups = await groupService.list(orgId, {
        type,
        search,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json(groups);
    } catch (error) {
      console.error('Error listing groups:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get group by ID
  router.get('/:groupId', async (req, res) => {
    try {
      const { groupId } = req.params;
      const group = await groupService.getWithDetails(groupId);

      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      res.json(group);
    } catch (error) {
      console.error('Error fetching group:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create group
  router.post('/org/:orgId', async (req, res) => {
    try {
      const { orgId } = req.params;
      const groupData = req.body;

      const group = await groupService.createGroup(orgId, groupData);
      res.status(201).json(group);
    } catch (error) {
      console.error('Error creating group:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update group
  router.put('/:groupId', async (req, res) => {
    try {
      const { groupId } = req.params;
      const updates = req.body;

      const group = await groupService.update(groupId, updates);
      res.json(group);
    } catch (error) {
      console.error('Error updating group:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete group
  router.delete('/:groupId', async (req, res) => {
    try {
      const { groupId } = req.params;
      await groupService.delete(groupId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting group:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // MEMBERSHIP
  // ============================================

  // Get group members
  router.get('/:groupId/members', async (req, res) => {
    try {
      const { groupId } = req.params;
      const { role, limit = 100, offset = 0 } = req.query;

      const members = await groupService.getMembers(groupId, {
        role,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json(members);
    } catch (error) {
      console.error('Error fetching group members:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Add member to group
  router.post('/:groupId/members', async (req, res) => {
    try {
      const { groupId } = req.params;
      const { userId, role = 'member' } = req.body;
      const addedBy = req.user?.id;

      const membership = await groupService.addMember(groupId, userId, role, addedBy);
      res.status(201).json(membership);
    } catch (error) {
      console.error('Error adding group member:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Add multiple members to group
  router.post('/:groupId/members/bulk', async (req, res) => {
    try {
      const { groupId } = req.params;
      const { userIds } = req.body;
      const addedBy = req.user?.id;

      await groupService.addMembers(groupId, userIds, addedBy);
      const members = await groupService.getMembers(groupId);

      res.json(members);
    } catch (error) {
      console.error('Error adding group members:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Remove member from group
  router.delete('/:groupId/members/:userId', async (req, res) => {
    try {
      const { groupId, userId } = req.params;
      await groupService.removeMember(groupId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing group member:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update member role
  router.put('/:groupId/members/:userId/role', async (req, res) => {
    try {
      const { groupId, userId } = req.params;
      const { role } = req.body;

      const membership = await groupService.updateMemberRole(groupId, userId, role);
      res.json(membership);
    } catch (error) {
      console.error('Error updating member role:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Set all members (replace)
  router.put('/:groupId/members', async (req, res) => {
    try {
      const { groupId } = req.params;
      const { userIds } = req.body;
      const addedBy = req.user?.id;

      await groupService.setMembers(groupId, userIds, addedBy);
      const members = await groupService.getMembers(groupId);

      res.json(members);
    } catch (error) {
      console.error('Error setting group members:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // USER'S GROUPS
  // ============================================

  // Get user's groups
  router.get('/user/:userId/org/:orgId', async (req, res) => {
    try {
      const { userId, orgId } = req.params;
      const groups = await groupService.getUserGroups(userId, orgId);
      res.json(groups);
    } catch (error) {
      console.error('Error fetching user groups:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
