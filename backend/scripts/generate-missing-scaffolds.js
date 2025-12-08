/**
 * Generate Missing Application Scaffolds
 *
 * This script finds all applications that have incomplete scaffolds
 * and generates the complete application structure for them.
 */

const ApplicationDatabase = require('../src/database/ApplicationDatabase');
const ApplicationGenerator = require('../src/generators/ApplicationGenerator');
const fs = require('fs').promises;
const path = require('path');

async function generateMissingScaffolds() {
  console.log('==========================================');
  console.log('Generating Missing Application Scaffolds');
  console.log('==========================================\n');

  try {
    // Initialize database
    const appDb = new ApplicationDatabase();
    await appDb.initialize();
    console.log('✓ Database connected\n');

    // Get all applications
    const applications = await appDb.loadApplications();
    console.log(`Found ${applications.length} applications\n`);

    let generatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const app of applications) {
      console.log(`\n[${app.name}] Checking...`);

      // Create folder path
      const sanitizedName = (app.name || 'app')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const appPath = path.join(__dirname, '../../generated-apps', sanitizedName);
      const serverPath = path.join(appPath, 'src/server.js');

      // Check if server.js exists (indicator of complete scaffold)
      try {
        await fs.access(serverPath);
        console.log(`  ✓ Scaffold already complete`);
        skippedCount++;
        continue;
      } catch (err) {
        // server.js doesn't exist, needs generation
        console.log(`  → Generating scaffold...`);
      }

      try {
        // Generate the application
        const generator = new ApplicationGenerator(app);
        const result = await generator.generate();

        console.log(`  ✓ Generated ${result.files.length} files`);
        console.log(`  Path: ${result.path}`);
        generatedCount++;
      } catch (error) {
        console.error(`  ✗ Failed to generate:`, error.message);
        errorCount++;
      }
    }

    console.log('\n==========================================');
    console.log('Scaffold Generation Complete!');
    console.log('==========================================');
    console.log(`✓ Generated: ${generatedCount} apps`);
    console.log(`⚠ Skipped:   ${skippedCount} apps (already complete)`);
    console.log(`✗ Errors:    ${errorCount} apps`);
    console.log('==========================================\n');

  } catch (error) {
    console.error('Fatal error during scaffold generation:', error);
    process.exit(1);
  }
}

// Run the script
generateMissingScaffolds()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
