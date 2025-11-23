/**
 * Database Migration Runner
 * Executes SQL migrations for the k1 schema
 */

const fs = require('fs').promises;
const path = require('path');
const db = require('../config/database');

async function runMigration() {
  console.log('[Migration] Starting database migration...');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', '001_create_k1_schema.sql');
    const sql = await fs.readFile(migrationPath, 'utf8');

    console.log('[Migration] Executing k1 schema creation...');

    // Execute the migration
    await db.query(sql);

    console.log('[Migration] ✓ k1 schema created successfully');
    console.log('[Migration] Tables created:');
    console.log('  - k1.applications');
    console.log('  - k1.workflows');
    console.log('  - k1.data_models');
    console.log('  - k1.forms');
    console.log('  - k1.pages');
    console.log('  - k1.mobile_ui');
    console.log('  - k1.rules');
    console.log('  - k1.apis');
    console.log('  - k1.application_versions');

    console.log('[Migration] Migration completed successfully!');

    // Close the database connection
    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('[Migration] Migration failed:', error.message);
    console.error(error);
    await db.close();
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
