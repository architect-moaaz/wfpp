const express = require('express');
const multer = require('multer');
const BulkUploadService = require('../../services/identity/BulkUploadService');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only Excel files
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowedMimes.includes(file.mimetype) || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  }
});

module.exports = (services) => {
  const router = express.Router();

  // Initialize BulkUploadService with all required services
  const bulkUploadService = new BulkUploadService(services.db, {
    organizationService: services.organizationService,
    departmentService: services.departmentService,
    roleService: services.roleService,
    groupService: services.groupService,
    userService: services.userService,
    positionService: services.positionService
  });

  /**
   * GET /api/identity/bulk-upload/template
   * Download sample Excel template
   */
  router.get('/template', (req, res) => {
    try {
      const buffer = bulkUploadService.generateSampleTemplate();

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=organization-template.xlsx');
      res.send(buffer);
    } catch (error) {
      console.error('Error generating template:', error);
      res.status(500).json({ error: 'Failed to generate template' });
    }
  });

  /**
   * POST /api/identity/bulk-upload/validate
   * Validate Excel file structure without creating anything
   */
  router.post('/validate', upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const validation = bulkUploadService.validateExcelStructure(req.file.buffer);
      res.json(validation);
    } catch (error) {
      console.error('Error validating file:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/identity/bulk-upload/process
   * Process Excel file and create organization with all entities
   */
  router.post('/process', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // First validate
      const validation = bulkUploadService.validateExcelStructure(req.file.buffer);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid file structure',
          validationErrors: validation.errors
        });
      }

      // Process the upload
      const createdBy = req.user?.id || null; // If you have authentication
      const results = await bulkUploadService.processUpload(req.file.buffer, createdBy);

      if (results.success) {
        res.status(201).json(results);
      } else {
        res.status(results.organization ? 207 : 400).json(results); // 207 Multi-Status if partial success
      }
    } catch (error) {
      console.error('Error processing bulk upload:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/identity/bulk-upload/export/:orgId
   * Export organization data to Excel
   */
  router.get('/export/:orgId', async (req, res) => {
    try {
      const { orgId } = req.params;
      const buffer = await bulkUploadService.exportOrganization(orgId);

      // Get org name for filename
      const org = await services.organizationService.getById(orgId);
      const filename = org ? `${org.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-export.xlsx` : 'organization-export.xlsx';

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      console.error('Error exporting organization:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/identity/bulk-upload/preview
   * Preview what will be created without actually creating
   */
  router.post('/preview', upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const XLSX = require('xlsx');
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

      const preview = {
        organization: null,
        departments: [],
        roles: [],
        groups: [],
        employees: []
      };

      // Parse Organization
      if (workbook.Sheets['Organization']) {
        const orgData = XLSX.utils.sheet_to_json(workbook.Sheets['Organization']);
        if (orgData.length > 0) {
          preview.organization = {
            name: orgData[0]['Organization Name'],
            description: orgData[0]['Description'],
            industry: orgData[0]['Industry']
          };
        }
      }

      // Parse Departments
      if (workbook.Sheets['Departments']) {
        const deptData = XLSX.utils.sheet_to_json(workbook.Sheets['Departments']);
        preview.departments = deptData.map(row => ({
          name: row['Department Name'],
          description: row['Description'],
          parent: row['Parent Department'] || null
        }));
      }

      // Parse Roles
      if (workbook.Sheets['Roles']) {
        const rolesData = XLSX.utils.sheet_to_json(workbook.Sheets['Roles']);
        preview.roles = rolesData.map(row => ({
          name: row['Role Name'],
          description: row['Description'],
          permissions: row['Permissions (comma-separated)']?.split(',').map(p => p.trim()) || []
        }));
      }

      // Parse Groups
      if (workbook.Sheets['Groups']) {
        const groupsData = XLSX.utils.sheet_to_json(workbook.Sheets['Groups']);
        preview.groups = groupsData.map(row => ({
          name: row['Group Name'],
          description: row['Description'],
          type: row['Group Type']
        }));
      }

      // Parse Employees
      if (workbook.Sheets['Employees']) {
        const empData = XLSX.utils.sheet_to_json(workbook.Sheets['Employees']);
        preview.employees = empData.map(row => ({
          email: row['Email'],
          name: `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim(),
          position: row['Position Title'],
          department: row['Department'],
          reportsTo: row['Reports To (Email)'],
          role: row['Role'],
          groups: row['Groups (comma-separated)']?.split(',').map(g => g.trim()) || []
        }));
      }

      // Summary
      preview.summary = {
        totalDepartments: preview.departments.length,
        totalRoles: preview.roles.length,
        totalGroups: preview.groups.length,
        totalEmployees: preview.employees.length
      };

      res.json(preview);
    } catch (error) {
      console.error('Error previewing file:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
