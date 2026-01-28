const express = require('express');
const router = express.Router();

module.exports = (services) => {
  const { positionService } = services;

  // ============================================
  // ORG CHART
  // ============================================

  // Get org chart (hierarchical positions)
  router.get('/org/:orgId/chart', async (req, res) => {
    try {
      const { orgId } = req.params;
      const { departmentId, includeVacant = 'true' } = req.query;

      const chart = await positionService.list(orgId, {
        departmentId,
        includeVacant: includeVacant === 'true',
        flat: false
      });

      res.json(chart);
    } catch (error) {
      console.error('Error fetching org chart:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get flat list of positions
  router.get('/org/:orgId', async (req, res) => {
    try {
      const { orgId } = req.params;
      const { departmentId, includeVacant = 'true' } = req.query;

      const positions = await positionService.list(orgId, {
        departmentId,
        includeVacant: includeVacant === 'true',
        flat: true
      });

      res.json(positions);
    } catch (error) {
      console.error('Error fetching positions:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get org chart stats
  router.get('/org/:orgId/stats', async (req, res) => {
    try {
      const { orgId } = req.params;
      const stats = await positionService.getStats(orgId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching position stats:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // POSITION CRUD
  // ============================================

  // Get position by ID
  router.get('/:positionId', async (req, res) => {
    try {
      const { positionId } = req.params;
      const position = await positionService.getById(positionId);

      if (!position) {
        return res.status(404).json({ error: 'Position not found' });
      }

      res.json(position);
    } catch (error) {
      console.error('Error fetching position:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create position
  router.post('/org/:orgId', async (req, res) => {
    try {
      const { orgId } = req.params;
      const positionData = req.body;

      const position = await positionService.createPosition(orgId, positionData);
      res.status(201).json(position);
    } catch (error) {
      console.error('Error creating position:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update position
  router.put('/:positionId', async (req, res) => {
    try {
      const { positionId } = req.params;
      const updates = req.body;

      const position = await positionService.update(positionId, updates);
      res.json(position);
    } catch (error) {
      console.error('Error updating position:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete position
  router.delete('/:positionId', async (req, res) => {
    try {
      const { positionId } = req.params;
      await positionService.delete(positionId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting position:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // USER ASSIGNMENT
  // ============================================

  // Assign user to position
  router.post('/:positionId/assign', async (req, res) => {
    try {
      const { positionId } = req.params;
      const { userId } = req.body;

      const position = await positionService.assignUser(positionId, userId);
      res.json(position);
    } catch (error) {
      console.error('Error assigning user to position:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Unassign user from position
  router.post('/:positionId/unassign', async (req, res) => {
    try {
      const { positionId } = req.params;
      const position = await positionService.unassignUser(positionId);
      res.json(position);
    } catch (error) {
      console.error('Error unassigning user from position:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get position by user ID
  router.get('/user/:userId/org/:orgId', async (req, res) => {
    try {
      const { userId, orgId } = req.params;
      const position = await positionService.getByUserId(userId, orgId);
      res.json(position);
    } catch (error) {
      console.error('Error fetching user position:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // HIERARCHY QUERIES
  // ============================================

  // Get direct reports
  router.get('/:positionId/direct-reports', async (req, res) => {
    try {
      const { positionId } = req.params;
      const reports = await positionService.getDirectReports(positionId);
      res.json(reports);
    } catch (error) {
      console.error('Error fetching direct reports:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get reporting chain (up to root)
  router.get('/:positionId/reporting-chain', async (req, res) => {
    try {
      const { positionId } = req.params;
      const chain = await positionService.getReportingChain(positionId);
      res.json(chain);
    } catch (error) {
      console.error('Error fetching reporting chain:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all descendants
  router.get('/:positionId/descendants', async (req, res) => {
    try {
      const { positionId } = req.params;
      const descendants = await positionService.getAllDescendants(positionId);
      res.json(descendants);
    } catch (error) {
      console.error('Error fetching descendants:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Move position in org chart
  router.post('/:positionId/move', async (req, res) => {
    try {
      const { positionId } = req.params;
      const { newParentId } = req.body;

      const position = await positionService.movePosition(positionId, newParentId);
      res.json(position);
    } catch (error) {
      console.error('Error moving position:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // MANAGER QUERIES (for workflow)
  // ============================================

  // Get user's manager
  router.get('/manager/user/:userId/org/:orgId', async (req, res) => {
    try {
      const { userId, orgId } = req.params;
      const manager = await positionService.getManager(userId, orgId);
      res.json(manager);
    } catch (error) {
      console.error('Error fetching manager:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's skip-level manager
  router.get('/skip-manager/user/:userId/org/:orgId', async (req, res) => {
    try {
      const { userId, orgId } = req.params;
      const manager = await positionService.getSkipLevelManager(userId, orgId);
      res.json(manager);
    } catch (error) {
      console.error('Error fetching skip-level manager:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's direct reports
  router.get('/user-reports/:userId/org/:orgId', async (req, res) => {
    try {
      const { userId, orgId } = req.params;
      const reports = await positionService.getUserDirectReports(userId, orgId);
      res.json(reports);
    } catch (error) {
      console.error('Error fetching user direct reports:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's department head
  router.get('/department-head/user/:userId/org/:orgId', async (req, res) => {
    try {
      const { userId, orgId } = req.params;
      const head = await positionService.getDepartmentHead(userId, orgId);
      res.json(head);
    } catch (error) {
      console.error('Error fetching department head:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
