const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

class BulkUploadService {
  constructor(db, services) {
    this.db = db;
    this.organizationService = services.organizationService;
    this.departmentService = services.departmentService;
    this.roleService = services.roleService;
    this.groupService = services.groupService;
    this.userService = services.userService;
    this.positionService = services.positionService;
  }

  /**
   * Generate a sample Excel template for bulk upload
   */
  generateSampleTemplate() {
    const wb = XLSX.utils.book_new();

    // Organization sheet
    const orgData = [
      ['Organization Name', 'Description', 'Industry', 'Website'],
      ['Acme Corporation', 'A sample technology company', 'Technology', 'https://acme.example.com']
    ];
    const orgSheet = XLSX.utils.aoa_to_sheet(orgData);
    orgSheet['!cols'] = [{ wch: 25 }, { wch: 40 }, { wch: 15 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, orgSheet, 'Organization');

    // Departments sheet
    const deptData = [
      ['Department Name', 'Description', 'Parent Department', 'Color'],
      ['Engineering', 'Software development team', '', '#3b82f6'],
      ['Frontend', 'UI/UX development', 'Engineering', '#10b981'],
      ['Backend', 'Server-side development', 'Engineering', '#8b5cf6'],
      ['Human Resources', 'People operations', '', '#f59e0b'],
      ['Finance', 'Financial operations', '', '#ef4444'],
      ['Marketing', 'Brand and growth', '', '#ec4899']
    ];
    const deptSheet = XLSX.utils.aoa_to_sheet(deptData);
    deptSheet['!cols'] = [{ wch: 20 }, { wch: 35 }, { wch: 20 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, deptSheet, 'Departments');

    // Roles sheet
    const rolesData = [
      ['Role Name', 'Description', 'Permissions (comma-separated)', 'Is System Role'],
      ['Admin', 'Full system access', 'admin,read,write,delete,manage_users,manage_roles', 'Yes'],
      ['Manager', 'Department management access', 'read,write,approve,manage_team', 'No'],
      ['Employee', 'Standard employee access', 'read,write,submit', 'No'],
      ['Viewer', 'Read-only access', 'read', 'No']
    ];
    const rolesSheet = XLSX.utils.aoa_to_sheet(rolesData);
    rolesSheet['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 50 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, rolesSheet, 'Roles');

    // Groups sheet
    const groupsData = [
      ['Group Name', 'Description', 'Group Type'],
      ['Leadership Team', 'Executive leadership group', 'management'],
      ['All Hands', 'All company employees', 'general'],
      ['Tech Team', 'All technical staff', 'functional'],
      ['Project Alpha', 'Project Alpha team members', 'project']
    ];
    const groupsSheet = XLSX.utils.aoa_to_sheet(groupsData);
    groupsSheet['!cols'] = [{ wch: 20 }, { wch: 35 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, groupsSheet, 'Groups');

    // Employees sheet
    const empData = [
      ['Email', 'First Name', 'Last Name', 'Position Title', 'Department', 'Reports To (Email)', 'Role', 'Groups (comma-separated)', 'Phone', 'Avatar URL'],
      ['ceo@acme.example.com', 'John', 'Smith', 'Chief Executive Officer', '', '', 'Admin', 'Leadership Team,All Hands', '+1-555-0101', ''],
      ['cto@acme.example.com', 'Sarah', 'Johnson', 'Chief Technology Officer', 'Engineering', 'ceo@acme.example.com', 'Admin', 'Leadership Team,All Hands,Tech Team', '+1-555-0102', ''],
      ['hr.director@acme.example.com', 'Michael', 'Brown', 'HR Director', 'Human Resources', 'ceo@acme.example.com', 'Manager', 'Leadership Team,All Hands', '+1-555-0103', ''],
      ['dev.lead@acme.example.com', 'Emily', 'Davis', 'Development Lead', 'Frontend', 'cto@acme.example.com', 'Manager', 'All Hands,Tech Team,Project Alpha', '+1-555-0104', ''],
      ['developer1@acme.example.com', 'James', 'Wilson', 'Senior Developer', 'Frontend', 'dev.lead@acme.example.com', 'Employee', 'All Hands,Tech Team,Project Alpha', '+1-555-0105', ''],
      ['developer2@acme.example.com', 'Lisa', 'Martinez', 'Developer', 'Backend', 'cto@acme.example.com', 'Employee', 'All Hands,Tech Team', '+1-555-0106', '']
    ];
    const empSheet = XLSX.utils.aoa_to_sheet(empData);
    empSheet['!cols'] = [
      { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 25 },
      { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 35 },
      { wch: 15 }, { wch: 40 }
    ];
    XLSX.utils.book_append_sheet(wb, empSheet, 'Employees');

    // Instructions sheet
    const instructionsData = [
      ['Bulk Upload Instructions'],
      [''],
      ['This template helps you create an organization with departments, roles, groups, and employees.'],
      [''],
      ['IMPORTANT NOTES:'],
      ['1. Organization sheet: Only one organization per upload. Fill in the first row only.'],
      ['2. Departments: Can have parent departments. Leave "Parent Department" empty for top-level departments.'],
      ['3. Roles: Permissions should be comma-separated. "Is System Role" should be "Yes" or "No".'],
      ['4. Groups: Group Type can be: general, management, functional, project, or custom.'],
      ['5. Employees: "Reports To" should match an email from another employee (for org chart hierarchy).'],
      ['6. The order matters: Employees who are managers should appear BEFORE their direct reports.'],
      [''],
      ['TIPS:'],
      ['- All names are case-sensitive for matching (departments, roles, groups).'],
      ['- Leave cells empty (not "N/A" or "-") if data is not applicable.'],
      ['- Emails must be unique across all employees.'],
      ['- Default password for all users will be "Welcome123!" - users should change on first login.']
    ];
    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsSheet['!cols'] = [{ wch: 100 }];
    XLSX.utils.book_append_sheet(wb, instructionsSheet, 'Instructions');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Process uploaded Excel file and create organization structure
   */
  async processUpload(fileBuffer, createdBy = null) {
    const results = {
      success: true,
      organization: null,
      departments: { created: 0, errors: [] },
      roles: { created: 0, errors: [] },
      groups: { created: 0, errors: [] },
      employees: { created: 0, errors: [] },
      positions: { created: 0, errors: [] }
    };

    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

      // Step 1: Create Organization
      const orgSheet = workbook.Sheets['Organization'];
      if (!orgSheet) {
        throw new Error('Organization sheet not found in Excel file');
      }
      const orgData = XLSX.utils.sheet_to_json(orgSheet);
      if (!orgData.length) {
        throw new Error('No organization data found');
      }

      const orgRow = orgData[0];
      const orgName = orgRow['Organization Name'];
      // Generate slug from organization name
      const slug = orgName.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') + '-' + Date.now().toString(36);

      const organization = await this.organizationService.createOrganization({
        name: orgName,
        slug: slug,
        description: orgRow['Description'] || null,
        industry: orgRow['Industry'] || null,
        website: orgRow['Website'] || null
      });
      results.organization = organization;

      // Maps for lookups
      const departmentMap = new Map(); // name -> id
      const roleMap = new Map(); // name -> id
      const groupMap = new Map(); // name -> id
      const userMap = new Map(); // email -> { id, positionId }
      const positionMap = new Map(); // email -> positionId

      // Step 2: Create Roles
      const rolesSheet = workbook.Sheets['Roles'];
      if (rolesSheet) {
        const rolesData = XLSX.utils.sheet_to_json(rolesSheet);
        for (const row of rolesData) {
          try {
            const permissions = row['Permissions (comma-separated)']
              ? row['Permissions (comma-separated)'].split(',').map(p => p.trim())
              : [];

            const role = await this.roleService.createOrgRole(organization.id, {
              name: row['Role Name'],
              description: row['Description'] || null,
              permissions,
              isSystemRole: row['Is System Role']?.toLowerCase() === 'yes'
            });
            roleMap.set(row['Role Name'], role.id);
            results.roles.created++;
          } catch (err) {
            results.roles.errors.push({ row: row['Role Name'], error: err.message });
          }
        }
      }

      // Step 3: Create Departments (handle hierarchy)
      const deptSheet = workbook.Sheets['Departments'];
      if (deptSheet) {
        const deptData = XLSX.utils.sheet_to_json(deptSheet);

        // First pass: create all departments without parents
        for (const row of deptData) {
          try {
            const dept = await this.departmentService.createDepartment(organization.id, {
              name: row['Department Name'],
              description: row['Description'] || null,
              color: row['Color'] || null,
              parentDepartmentId: null
            });
            departmentMap.set(row['Department Name'], { id: dept.id, parentName: row['Parent Department'] || null });
            results.departments.created++;
          } catch (err) {
            results.departments.errors.push({ row: row['Department Name'], error: err.message });
          }
        }

        // Second pass: update parent relationships
        for (const [deptName, deptInfo] of departmentMap) {
          if (deptInfo.parentName && departmentMap.has(deptInfo.parentName)) {
            try {
              await this.departmentService.update(deptInfo.id, {
                parentDepartmentId: departmentMap.get(deptInfo.parentName).id
              });
            } catch (err) {
              results.departments.errors.push({ row: deptName, error: `Failed to set parent: ${err.message}` });
            }
          }
        }
      }

      // Step 4: Create Groups
      const groupsSheet = workbook.Sheets['Groups'];
      if (groupsSheet) {
        const groupsData = XLSX.utils.sheet_to_json(groupsSheet);
        for (const row of groupsData) {
          try {
            const group = await this.groupService.createGroup(organization.id, {
              name: row['Group Name'],
              description: row['Description'] || null,
              groupType: row['Group Type'] || 'general'
            });
            groupMap.set(row['Group Name'], group.id);
            results.groups.created++;
          } catch (err) {
            results.groups.errors.push({ row: row['Group Name'], error: err.message });
          }
        }
      }

      // Step 5: Create Employees with Positions
      const empSheet = workbook.Sheets['Employees'];
      if (empSheet) {
        const empData = XLSX.utils.sheet_to_json(empSheet);

        // First pass: create all users and positions
        for (const row of empData) {
          const email = row['Email'];
          if (!email) continue;

          try {
            // Check if user already exists
            let user = await this.userService.getUserByEmail(email.toLowerCase());

            if (!user) {
              // Create new user
              const defaultPassword = 'Welcome123!';
              user = await this.userService.createUser({
                email: email.toLowerCase(),
                name: `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim(),
                firstName: row['First Name'] || null,
                lastName: row['Last Name'] || null,
                phone: row['Phone'] || null,
                avatarUrl: row['Avatar URL'] || null,
                password: defaultPassword,
                authProvider: 'local'
              });
            }

            // Add to organization (will fail silently if already a member)
            try {
              await this.organizationService.addMember(organization.id, user.id);
            } catch (e) {
              // Ignore if already a member
            }

            // Assign role if specified
            if (row['Role'] && roleMap.has(row['Role'])) {
              await this.userService.assignOrgRole(user.id, roleMap.get(row['Role']), organization.id, createdBy);
            }

            // Get department ID
            let departmentId = null;
            if (row['Department'] && departmentMap.has(row['Department'])) {
              departmentId = departmentMap.get(row['Department']).id;
            }

            // Create position
            const position = await this.positionService.createPosition(organization.id, {
              title: row['Position Title'] || 'Team Member',
              departmentId,
              userId: user.id
            });

            userMap.set(email.toLowerCase(), { id: user.id, positionId: position.id });
            positionMap.set(email.toLowerCase(), position.id);

            results.employees.created++;
            results.positions.created++;
          } catch (err) {
            results.employees.errors.push({ row: email, error: err.message });
          }
        }

        // Second pass: set up reporting relationships
        for (const row of empData) {
          const email = row['Email']?.toLowerCase();
          const reportsTo = row['Reports To (Email)']?.toLowerCase();

          if (email && reportsTo && positionMap.has(email) && positionMap.has(reportsTo)) {
            try {
              await this.positionService.update(positionMap.get(email), {
                parentPositionId: positionMap.get(reportsTo)
              });
            } catch (err) {
              results.positions.errors.push({ row: email, error: `Failed to set manager: ${err.message}` });
            }
          }
        }

        // Third pass: assign groups
        for (const row of empData) {
          const email = row['Email']?.toLowerCase();
          const groupNames = row['Groups (comma-separated)'];

          if (email && groupNames && userMap.has(email)) {
            const userId = userMap.get(email).id;
            const groups = groupNames.split(',').map(g => g.trim());

            for (const groupName of groups) {
              if (groupMap.has(groupName)) {
                try {
                  await this.groupService.addMember(groupMap.get(groupName), userId);
                } catch (err) {
                  // Ignore duplicate membership errors
                }
              }
            }
          }
        }
      }

      // Check for any errors
      const totalErrors =
        results.departments.errors.length +
        results.roles.errors.length +
        results.groups.errors.length +
        results.employees.errors.length +
        results.positions.errors.length;

      if (totalErrors > 0) {
        results.success = false;
        results.message = `Organization created with ${totalErrors} error(s). Please review.`;
      } else {
        results.message = 'Organization created successfully!';
      }

    } catch (error) {
      results.success = false;
      results.message = error.message;
      results.error = error.message;
    }

    return results;
  }

  /**
   * Export organization data to Excel format
   */
  async exportOrganization(orgId) {
    const wb = XLSX.utils.book_new();

    // Get organization details
    const org = await this.organizationService.getById(orgId);
    if (!org) {
      throw new Error('Organization not found');
    }

    // Organization sheet
    const orgData = [
      ['Organization Name', 'Description', 'Industry', 'Website'],
      [org.name, org.description || '', org.industry || '', org.website || '']
    ];
    const orgSheet = XLSX.utils.aoa_to_sheet(orgData);
    orgSheet['!cols'] = [{ wch: 25 }, { wch: 40 }, { wch: 15 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, orgSheet, 'Organization');

    // Get departments
    const departments = await this.departmentService.list(orgId, { flat: true });
    const deptRows = [['Department Name', 'Description', 'Parent Department', 'Color']];

    // Create a map of department id to name for parent lookup
    const deptIdToName = new Map();
    for (const dept of departments) {
      deptIdToName.set(dept.id, dept.name);
    }

    for (const dept of departments) {
      const parentName = dept.parent_department_id ? deptIdToName.get(dept.parent_department_id) || '' : '';
      deptRows.push([
        dept.name,
        dept.description || '',
        parentName,
        dept.color || ''
      ]);
    }
    const deptSheet = XLSX.utils.aoa_to_sheet(deptRows);
    deptSheet['!cols'] = [{ wch: 20 }, { wch: 35 }, { wch: 20 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, deptSheet, 'Departments');

    // Get roles
    const roles = await this.roleService.listOrgRoles(orgId);
    const roleRows = [['Role Name', 'Description', 'Permissions (comma-separated)', 'Is System Role']];
    for (const role of roles) {
      const permissions = Array.isArray(role.permissions) ? role.permissions.join(', ') : '';
      roleRows.push([
        role.name,
        role.description || '',
        permissions,
        role.is_system_role ? 'Yes' : 'No'
      ]);
    }
    const rolesSheet = XLSX.utils.aoa_to_sheet(roleRows);
    rolesSheet['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 50 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, rolesSheet, 'Roles');

    // Get groups
    const groups = await this.groupService.list(orgId);
    const groupRows = [['Group Name', 'Description', 'Group Type']];
    for (const group of groups) {
      groupRows.push([
        group.name,
        group.description || '',
        group.group_type || group.type || 'general'
      ]);
    }
    const groupsSheet = XLSX.utils.aoa_to_sheet(groupRows);
    groupsSheet['!cols'] = [{ wch: 20 }, { wch: 35 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, groupsSheet, 'Groups');

    // Get positions with users (employees)
    const positions = await this.positionService.list(orgId, { flat: true, includeVacant: false });

    // Build position email map for "Reports To" lookup
    const positionIdToEmail = new Map();
    for (const pos of positions) {
      if (pos.user_email) {
        positionIdToEmail.set(pos.id, pos.user_email);
      }
    }

    const empRows = [['Email', 'First Name', 'Last Name', 'Position Title', 'Department', 'Reports To (Email)', 'Role', 'Groups (comma-separated)', 'Phone', 'Avatar URL']];

    for (const pos of positions) {
      if (!pos.user_id) continue; // Skip vacant positions

      // Get user details
      const user = await this.userService.getUserById(pos.user_id);
      if (!user) continue;

      // Get user's role in this org
      const userRoles = await this.userService.getUserOrgRoles(user.id, orgId);
      const roleName = userRoles.length > 0 ? userRoles[0].name : '';

      // Get user's groups
      const userGroups = await this.userService.getUserGroups(user.id, orgId);
      const groupNames = userGroups.map(g => g.name).join(', ');

      // Get department name
      const deptName = pos.department_id ? deptIdToName.get(pos.department_id) || '' : '';

      // Get manager email
      const reportsToEmail = pos.parent_position_id ? positionIdToEmail.get(pos.parent_position_id) || '' : '';

      empRows.push([
        user.email,
        user.first_name || '',
        user.last_name || '',
        pos.title,
        deptName,
        reportsToEmail,
        roleName,
        groupNames,
        user.phone || '',
        user.avatar_url || ''
      ]);
    }

    const empSheet = XLSX.utils.aoa_to_sheet(empRows);
    empSheet['!cols'] = [
      { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 25 },
      { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 35 },
      { wch: 15 }, { wch: 40 }
    ];
    XLSX.utils.book_append_sheet(wb, empSheet, 'Employees');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Validate Excel file structure before processing
   */
  validateExcelStructure(fileBuffer) {
    const errors = [];

    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

      // Check required sheets
      const requiredSheets = ['Organization', 'Employees'];
      for (const sheet of requiredSheets) {
        if (!workbook.Sheets[sheet]) {
          errors.push(`Missing required sheet: ${sheet}`);
        }
      }

      // Validate Organization sheet
      if (workbook.Sheets['Organization']) {
        const orgData = XLSX.utils.sheet_to_json(workbook.Sheets['Organization']);
        if (!orgData.length) {
          errors.push('Organization sheet is empty');
        } else if (!orgData[0]['Organization Name']) {
          errors.push('Organization Name is required');
        }
      }

      // Validate Employees sheet headers
      if (workbook.Sheets['Employees']) {
        const empData = XLSX.utils.sheet_to_json(workbook.Sheets['Employees']);
        if (empData.length > 0) {
          const firstRow = empData[0];
          if (!('Email' in firstRow)) {
            errors.push('Employees sheet must have an "Email" column');
          }
        }
      }

    } catch (err) {
      errors.push(`Invalid Excel file: ${err.message}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = BulkUploadService;
