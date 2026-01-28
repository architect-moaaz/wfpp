const express = require('express');
const router = express.Router();

module.exports = (services) => {
  const { departmentService } = services;

  // List departments (hierarchical or flat)
  router.get('/org/:orgId', async (req, res) => {
    try {
      const { orgId } = req.params;
      const { flat = 'false', includeStats = 'false' } = req.query;

      const departments = await departmentService.list(orgId, {
        flat: flat === 'true',
        includeStats: includeStats === 'true'
      });

      res.json(departments);
    } catch (error) {
      console.error('Error listing departments:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get department by ID
  router.get('/:deptId', async (req, res) => {
    try {
      const { deptId } = req.params;
      const department = await departmentService.getById(deptId);

      if (!department) {
        return res.status(404).json({ error: 'Department not found' });
      }

      res.json(department);
    } catch (error) {
      console.error('Error fetching department:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get department by code
  router.get('/org/:orgId/code/:code', async (req, res) => {
    try {
      const { orgId, code } = req.params;
      const department = await departmentService.getByCode(orgId, code);

      if (!department) {
        return res.status(404).json({ error: 'Department not found' });
      }

      res.json(department);
    } catch (error) {
      console.error('Error fetching department:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create department
  router.post('/org/:orgId', async (req, res) => {
    try {
      const { orgId } = req.params;
      const deptData = req.body;

      const department = await departmentService.createDepartment(orgId, deptData);
      res.status(201).json(department);
    } catch (error) {
      console.error('Error creating department:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update department
  router.put('/:deptId', async (req, res) => {
    try {
      const { deptId } = req.params;
      const updates = req.body;

      const department = await departmentService.update(deptId, updates);
      res.json(department);
    } catch (error) {
      console.error('Error updating department:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete department
  router.delete('/:deptId', async (req, res) => {
    try {
      const { deptId } = req.params;
      await departmentService.delete(deptId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting department:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // HIERARCHY
  // ============================================

  // Get subdepartments
  router.get('/:deptId/subdepartments', async (req, res) => {
    try {
      const { deptId } = req.params;
      const subdepts = await departmentService.getSubdepartments(deptId);
      res.json(subdepts);
    } catch (error) {
      console.error('Error fetching subdepartments:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get ancestors
  router.get('/:deptId/ancestors', async (req, res) => {
    try {
      const { deptId } = req.params;
      const ancestors = await departmentService.getAncestors(deptId);
      res.json(ancestors);
    } catch (error) {
      console.error('Error fetching ancestors:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Move department
  router.post('/:deptId/move', async (req, res) => {
    try {
      const { deptId } = req.params;
      const { newParentId } = req.body;

      const department = await departmentService.moveDepartment(deptId, newParentId);
      res.json(department);
    } catch (error) {
      console.error('Error moving department:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // MEMBERS
  // ============================================

  // Get department members
  router.get('/:deptId/members', async (req, res) => {
    try {
      const { deptId } = req.params;
      const { includeSubdepts = 'false', limit = 100, offset = 0 } = req.query;

      const members = await departmentService.getMembers(deptId, {
        includeSubdepts: includeSubdepts === 'true',
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json(members);
    } catch (error) {
      console.error('Error fetching department members:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get member count
  router.get('/:deptId/member-count', async (req, res) => {
    try {
      const { deptId } = req.params;
      const { includeSubdepts = 'false' } = req.query;

      const count = await departmentService.getMemberCount(deptId, includeSubdepts === 'true');
      res.json({ count });
    } catch (error) {
      console.error('Error fetching member count:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // DEPARTMENT HEAD
  // ============================================

  // Set department head
  router.post('/:deptId/head', async (req, res) => {
    try {
      const { deptId } = req.params;
      const { positionId } = req.body;

      const department = await departmentService.setHead(deptId, positionId);
      res.json(department);
    } catch (error) {
      console.error('Error setting department head:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get department head
  router.get('/:deptId/head', async (req, res) => {
    try {
      const { deptId } = req.params;
      const head = await departmentService.getHead(deptId);
      res.json(head);
    } catch (error) {
      console.error('Error fetching department head:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // STATS
  // ============================================

  // Get department stats
  router.get('/:deptId/stats', async (req, res) => {
    try {
      const { deptId } = req.params;
      const stats = await departmentService.getStats(deptId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching department stats:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
