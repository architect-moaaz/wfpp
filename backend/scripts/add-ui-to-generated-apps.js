/**
 * Add UI Layer to Generated Applications
 *
 * This script adds complete UI capabilities to generated applications:
 * - EJS view templates for forms, pages, workflows
 * - UI routes for serving views
 * - Server-side rendering setup
 * - Bootstrap styling
 */

const fs = require('fs').promises;
const path = require('path');
const UIGenerator = require('../src/generators/UIGenerator');

async function addUIToApp(appPath) {
  try {
    console.log(`\nAdding UI to: ${path.basename(appPath)}`);

    // 1. Create views directory
    const viewsDir = path.join(appPath, 'src/views');
    await fs.mkdir(viewsDir, { recursive: true });

    // 2. Generate and save all view templates
    const views = UIGenerator.generateViews();
    for (const [filename, content] of Object.entries(views)) {
      await fs.writeFile(path.join(viewsDir, filename), content, 'utf8');
    }
    console.log(`  ✓ Created ${Object.keys(views).length} view templates`);

    // 3. Copy UI routes template
    const uiRoutesTemplate = await fs.readFile(
      path.join(__dirname, '../src/generators/templates/ui-routes.template.js'),
      'utf8'
    );
    await fs.writeFile(
      path.join(appPath, 'src/routes/ui.js'),
      uiRoutesTemplate,
      'utf8'
    );
    console.log('  ✓ Created UI routes');

    // 4. Update server.js to include EJS and UI routes
    const serverPath = path.join(appPath, 'src/server.js');
    let serverContent = await fs.readFile(serverPath, 'utf8');

    // Add EJS setup if not already there
    if (!serverContent.includes('app.set(\'view engine\'')) {
      const ejsSetup = `\n// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '../public')));
`;

      // Insert after middleware setup
      serverContent = serverContent.replace(
        /app\.use\(bodyParser\.json\(\)\);/,
        `app.use(bodyParser.json());\n${ejsSetup}`
      );

      // Add path require if not there
      if (!serverContent.includes("const path = require('path')")) {
        serverContent = serverContent.replace(
          /const express = require\('express'\);/,
          "const express = require('express');\nconst path = require('path');"
        );
      }
    }

    // Add UI routes if not already there
    if (!serverContent.includes("require('./routes/ui')")) {
      const uiRoutesMount = `const uiRoutes = require('./routes/ui');\n`;
      serverContent = serverContent.replace(
        /const apiRoutes = require\('\.\/routes\/api'\);/,
        `const apiRoutes = require('./routes/api');\n${uiRoutesMount}`
      );

      serverContent = serverContent.replace(
        /app\.use\('\/api', apiRoutes\);/,
        `// UI Routes (must come before API routes to handle root path)\napp.use('/', uiRoutes);\n\n// API Routes\napp.use('/api', apiRoutes);`
      );
    }

    await fs.writeFile(serverPath, serverContent, 'utf8');
    console.log('  ✓ Updated server.js with EJS and UI routes');

    // 5. Update package.json to include EJS dependency
    const packagePath = path.join(appPath, 'package.json');
    const packageContent = await fs.readFile(packagePath, 'utf8');
    const packageJson = JSON.parse(packageContent);

    if (!packageJson.dependencies.ejs) {
      packageJson.dependencies.ejs = '^3.1.9';
      await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2), 'utf8');
      console.log('  ✓ Added EJS dependency to package.json');
    }

    // 6. Create public directory for static assets (if needed later)
    const publicDir = path.join(appPath, 'public');
    await fs.mkdir(publicDir, { recursive: true });

    console.log(`  ✓ UI layer added successfully!`);
    return true;
  } catch (error) {
    console.error(`  ✗ Error adding UI:`, error.message);
    return false;
  }
}

async function main() {
  console.log('==========================================');
  console.log('Adding UI Layer to Generated Applications');
  console.log('==========================================');

  const generatedAppsDir = path.join(__dirname, '../generated-apps');

  try {
    const apps = await fs.readdir(generatedAppsDir);

    let successCount = 0;
    let errorCount = 0;

    for (const appName of apps) {
      const appPath = path.join(generatedAppsDir, appName);
      const stats = await fs.stat(appPath);

      if (stats.isDirectory()) {
        // Check if it has src/server.js (valid generated app)
        const serverPath = path.join(appPath, 'src/server.js');
        try {
          await fs.access(serverPath);
          const success = await addUIToApp(appPath);
          if (success) successCount++;
          else errorCount++;
        } catch (err) {
          console.log(`\nSkipping ${appName} - not a valid generated app`);
        }
      }
    }

    console.log('\n==========================================');
    console.log('UI Addition Complete!');
    console.log('==========================================');
    console.log(`✓ Success: ${successCount} apps`);
    console.log(`✗ Errors:  ${errorCount} apps`);
    console.log('==========================================\n');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });
