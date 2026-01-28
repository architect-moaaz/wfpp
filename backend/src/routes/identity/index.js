const express = require('express');
const usersRoutes = require('./users.routes');
const organizationsRoutes = require('./organizations.routes');
const rolesRoutes = require('./roles.routes');
const groupsRoutes = require('./groups.routes');
const positionsRoutes = require('./positions.routes');
const departmentsRoutes = require('./departments.routes');
const bulkUploadRoutes = require('./bulk-upload.routes');

module.exports = (services) => {
  const router = express.Router();

  // Mount all identity routes
  router.use('/users', usersRoutes(services));
  router.use('/organizations', organizationsRoutes(services));
  router.use('/roles', rolesRoutes(services));
  router.use('/groups', groupsRoutes(services));
  router.use('/positions', positionsRoutes(services));
  router.use('/departments', departmentsRoutes(services));
  router.use('/bulk-upload', bulkUploadRoutes(services));

  return router;
};
