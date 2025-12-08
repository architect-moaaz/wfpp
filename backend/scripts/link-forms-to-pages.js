/**
 * Link Forms to Pages Script
 * Intelligently assigns forms to pages based on their names, purposes, and descriptions
 */

const fs = require('fs').promises;
const path = require('path');

async function linkFormsToPages(appPath) {
  console.log(`\nProcessing app: ${appPath}`);

  const pagesPath = path.join(appPath, 'src/resources/pages.json');
  const formsPath = path.join(appPath, 'src/resources/forms.json');

  // Check if both files exist
  try {
    await fs.access(pagesPath);
    await fs.access(formsPath);
  } catch (error) {
    console.log(`  Skipping - missing pages or forms files`);
    return false;
  }

  // Load pages and forms
  const pagesData = await fs.readFile(pagesPath, 'utf8');
  const formsData = await fs.readFile(formsPath, 'utf8');

  const pages = JSON.parse(pagesData);
  const forms = JSON.parse(formsData);

  if (pages.length === 0 || forms.length === 0) {
    console.log(`  Skipping - no pages or forms to link`);
    return false;
  }

  console.log(`  Found ${pages.length} pages and ${forms.length} forms`);

  let linksCreated = 0;

  // Analyze and link forms to pages
  pages.forEach(page => {
    const pageName = page.name.toLowerCase();
    const pageRoute = (page.route || '').toLowerCase();
    const pageDescription = (page.description || '').toLowerCase();

    // Initialize forms array if it doesn't exist
    if (!page.forms) {
      page.forms = [];
    }

    forms.forEach(form => {
      const formName = form.name.toLowerCase();
      const formTitle = (form.title || '').toLowerCase();
      const formDescription = (form.description || '').toLowerCase();

      // Skip if already linked
      if (page.forms.includes(form.id)) {
        return;
      }

      let shouldLink = false;
      let reason = '';

      // Rule 1: Registration/Create forms → List pages
      if ((formName.includes('registration') || formName.includes('create') || formName.includes('new')) &&
          (pageName.includes('list') || pageRoute.endsWith('s') && !pageRoute.includes(':id'))) {
        shouldLink = true;
        reason = 'Registration form → List page';
      }

      // Rule 2: Edit/Update/Profile forms → Detail pages
      if ((formName.includes('edit') || formName.includes('update') || formName.includes('profile')) &&
          (pageName.includes('detail') || pageRoute.includes(':id'))) {
        shouldLink = true;
        reason = 'Edit form → Detail page';
      }

      // Rule 3: Same entity name (e.g., "customer" in both)
      const getEntityName = (str) => {
        const match = str.match(/(customer|product|order|user|item|task|project|invoice|payment)/);
        return match ? match[1] : null;
      };

      const pageEntity = getEntityName(pageName + ' ' + pageRoute);
      const formEntity = getEntityName(formName + ' ' + formDescription);

      if (pageEntity && formEntity && pageEntity === formEntity) {
        shouldLink = true;
        reason = reason || `Same entity: ${pageEntity}`;
      }

      // Rule 4: Form page type matches form
      if (page.type === 'form' || pageName.includes('form')) {
        shouldLink = true;
        reason = reason || 'Page is a form page';
      }

      // Rule 5: Keywords in descriptions
      const commonKeywords = ['submit', 'create', 'update', 'edit', 'register', 'log', 'add'];
      const pageKeywords = commonKeywords.filter(kw => pageDescription.includes(kw));
      const formKeywords = commonKeywords.filter(kw => formDescription.includes(kw));

      if (pageKeywords.length > 0 && formKeywords.length > 0 &&
          pageKeywords.some(kw => formKeywords.includes(kw))) {
        shouldLink = true;
        reason = reason || 'Matching keywords in descriptions';
      }

      if (shouldLink) {
        page.forms.push(form.id);
        linksCreated++;
        console.log(`    ✓ Linked "${form.name}" to "${page.name}" (${reason})`);
      }
    });
  });

  if (linksCreated > 0) {
    // Save updated pages
    await fs.writeFile(pagesPath, JSON.stringify(pages, null, 2));
    console.log(`  ✓ Created ${linksCreated} form-page links`);
    return true;
  } else {
    console.log(`  No links created`);
    return false;
  }
}

async function main() {
  const generatedAppsDir = path.join(__dirname, '../generated-apps');

  console.log('='.repeat(60));
  console.log('Link Forms to Pages Script');
  console.log('='.repeat(60));

  try {
    const apps = await fs.readdir(generatedAppsDir);

    let processed = 0;
    let updated = 0;

    for (const appName of apps) {
      const appPath = path.join(generatedAppsDir, appName);
      const stats = await fs.stat(appPath);

      if (stats.isDirectory()) {
        processed++;
        const result = await linkFormsToPages(appPath);
        if (result) updated++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`Summary: Processed ${processed} apps, updated ${updated} apps`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
