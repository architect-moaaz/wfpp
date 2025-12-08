/**
 * Backfill Script: Update Generated App Resource Files
 *
 * This script updates all generated apps' resource files (workflows.json, forms.json, etc.)
 * with the actual data from the PostgreSQL database.
 *
 * Usage: node scripts/backfill-generated-app-resources.js
 */

const ApplicationDatabase = require('../src/database/ApplicationDatabase');
const ApplicationService = require('../src/services/ApplicationService');
const fs = require('fs').promises;
const path = require('path');

async function backfillResources() {
  console.log('==========================================');
  console.log('Starting Resource Backfill Process');
  console.log('==========================================\n');

  try {
    // Initialize database
    const appDb = new ApplicationDatabase();
    await appDb.initialize();
    console.log('✓ Database connected\n');

    // Get all applications
    const applications = await appDb.loadApplications();
    console.log(`Found ${applications.length} applications\n`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const app of applications) {
      console.log(`\n[${app.name}] Processing...`);
      console.log(`  ID: ${app.id}`);

      // Check if generated app folder exists
      const appFolderPath = ApplicationService.getAppFolderPath(app.name);
      const resourcesPath = path.join(appFolderPath, 'src/resources');

      try {
        await fs.access(resourcesPath);
      } catch (err) {
        console.log(`  ⚠ Skipped - Generated app folder not found at ${appFolderPath}`);
        skippedCount++;
        continue;
      }

      // Count resources
      const resourceCounts = {
        workflows: (app.resources?.workflows || []).length,
        forms: (app.resources?.forms || []).length,
        dataModels: (app.resources?.dataModels || []).length,
        pages: (app.resources?.pages || []).length
      };

      console.log(`  Resources in DB: ${resourceCounts.workflows} workflows, ${resourceCounts.forms} forms, ${resourceCounts.dataModels} data models, ${resourceCounts.pages} pages`);

      try {
        // Update all resource files
        await ApplicationService.saveResourceToFolder(
          app.name,
          'workflows',
          app.resources?.workflows || []
        );

        await ApplicationService.saveResourceToFolder(
          app.name,
          'forms',
          app.resources?.forms || []
        );

        await ApplicationService.saveResourceToFolder(
          app.name,
          'dataModels',
          app.resources?.dataModels || []
        );

        await ApplicationService.saveResourceToFolder(
          app.name,
          'pages',
          app.resources?.pages || []
        );

        console.log(`  ✓ Successfully updated resource files`);
        successCount++;
      } catch (error) {
        console.error(`  ✗ Failed to update files:`, error.message);
        errorCount++;
      }
    }

    console.log('\n==========================================');
    console.log('Backfill Complete!');
    console.log('==========================================');
    console.log(`✓ Success: ${successCount} apps`);
    console.log(`⚠ Skipped: ${skippedCount} apps (no generated folder)`);
    console.log(`✗ Errors:  ${errorCount} apps`);
    console.log('==========================================\n');

  } catch (error) {
    console.error('Fatal error during backfill:', error);
    process.exit(1);
  }
}

// Run the backfill
backfillResources()
  .then(() => {
    console.log('Backfill script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Backfill script failed:', error);
    process.exit(1);
  });
