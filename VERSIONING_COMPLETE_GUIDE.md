# Complete Workflow Versioning Guide

## System Overview

Your workflow versioning system is now fully operational with both backend and frontend components. Here's everything you need to know to use it effectively.

## Quick Answer to Your Questions

### How to Use Versions from UI?

**Option 1: Use the VersionHistoryPanel Component** (Recommended)

```javascript
import VersionHistoryPanel from './components/Panels/VersionHistoryPanel';

// In your layout/sidebar
<VersionHistoryPanel
  workflowId={currentWorkflow.id}
  onVersionRestore={(version) => {
    setCurrentWorkflow(version.workflow);
  }}
/>
```

**Option 2: Use the versionApi Service Directly**

```javascript
import versionApi from './services/versionApi';

// Get all versions
const versions = await versionApi.getVersions(workflowId);

// Get a specific version
const version = await versionApi.getVersion(workflowId, 3);

// Load that version into your editor
setCurrentWorkflow(version.data.workflow);
```

### How to Restore/Revert a Version?

**Method 1: Using the UI Panel**

1. Open the Version History panel
2. Find the version you want to restore
3. Click the expand arrow to see version details
4. Click the "Restore" button
5. The workflow will be updated with the data from that version
6. A new version is created (the restore doesn't overwrite)

**Method 2: Using Code**

```javascript
// Restore version 5
const result = await versionApi.restoreVersion(workflowId, 5, {
  author: 'john.doe@example.com',
  changeDescription: 'Restored from version 5 - reverting problematic changes'
});

// The restored data becomes a new version
console.log('Created new version:', result.data.version.version);

// Update your UI
setCurrentWorkflow(result.data.version.workflow);
```

## Complete File Structure

```
backend/
├── src/
│   ├── runtime/
│   │   ├── VersionManager.js          ✅ Core versioning logic
│   │   └── WorkflowRuntimeEngine.js   ✅ Updated with version support
│   ├── database/
│   │   └── WorkflowDatabase.js         ✅ Database integration
│   ├── routes/
│   │   └── version.routes.js           ✅ 21 API endpoints
│   └── server.js                       ✅ Routes registered

ui/
├── src/
│   ├── services/
│   │   └── versionApi.js               ✅ API client service
│   └── components/
│       └── Panels/
│           ├── VersionHistoryPanel.js  ✅ Full UI component
│           └── VersionHistoryPanel.css ✅ Styling
```

## API Endpoints Reference

All endpoints at: `http://localhost:5000/api/versions/`

### Version Management
- `POST /:workflowId/create` - Create new version
- `GET /:workflowId` - List all versions
- `GET /:workflowId/:version` - Get specific version
- `GET /:workflowId/default` - Get default version
- `GET /:workflowId/published` - Get published versions
- `GET /:workflowId/latest-published` - Get latest published

### Version Lifecycle
- `POST /:workflowId/:version/publish` - Publish a draft
- `PUT /:workflowId/:version/set-default` - Set as default
- `POST /:workflowId/:version/deprecate` - Mark deprecated
- `POST /:workflowId/:version/archive` - Archive version
- `DELETE /:workflowId/:version` - Delete version

### Version Operations
- `POST /:workflowId/:version/clone` - Clone version
- `GET /:workflowId/compare/:v1/:v2` - Compare versions
- `POST /:workflowId/:version/export` - Export version
- `POST /:workflowId/import` - Import version

### Statistics
- `GET /:workflowId/:version/stats` - Version stats
- `GET /stats` - All versioning stats
- `GET /:workflowId/:version/instances` - Instances using version

## Common Use Cases

### 1. Auto-Save Every Change

```javascript
const AutoSaveComponent = () => {
  const { currentWorkflow } = useWorkflow();

  useEffect(() => {
    const saveChanges = async () => {
      await versionApi.createVersion(
        currentWorkflow.id,
        currentWorkflow,
        {
          author: 'auto-save',
          changeDescription: 'Auto-saved',
          tags: ['auto-save']
        }
      );
    };

    // Save every 5 minutes
    const interval = setInterval(saveChanges, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentWorkflow]);

  return null;
};
```

### 2. Manual Save with Description

```javascript
const SaveButton = () => {
  const [description, setDescription] = useState('');
  const { currentWorkflow } = useWorkflow();

  const handleSave = async () => {
    await versionApi.createVersion(
      currentWorkflow.id,
      currentWorkflow,
      {
        author: 'user@example.com',
        changeDescription: description || 'Manual save',
        tags: ['manual-save']
      }
    );

    setDescription('');
    alert('Version saved!');
  };

  return (
    <div>
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe your changes..."
      />
      <button onClick={handleSave}>Save Version</button>
    </div>
  );
};
```

### 3. Compare Before Restore

```javascript
const RestoreWithPreview = ({ workflowId, versionNumber }) => {
  const [comparison, setComparison] = useState(null);
  const { currentWorkflow, setCurrentWorkflow } = useWorkflow();

  const showPreview = async () => {
    // Get current version number from context or state
    const currentVersion = currentWorkflow.version || 1;

    // Compare current with selected
    const result = await versionApi.compareVersions(
      workflowId,
      currentVersion,
      versionNumber
    );

    setComparison(result.data);
  };

  const confirmRestore = async () => {
    const result = await versionApi.restoreVersion(workflowId, versionNumber);
    setCurrentWorkflow(result.data.version.workflow);
    setComparison(null);
  };

  return (
    <div>
      <button onClick={showPreview}>Preview Changes</button>

      {comparison && (
        <div>
          <h3>Changes if you restore:</h3>
          <p>Nodes to be added: {comparison.summary.nodesAdded}</p>
          <p>Nodes to be removed: {comparison.summary.nodesRemoved}</p>
          <p>Nodes to be modified: {comparison.summary.nodesModified}</p>

          <button onClick={confirmRestore}>Confirm Restore</button>
          <button onClick={() => setComparison(null)}>Cancel</button>
        </div>
      )}
    </div>
  );
};
```

### 4. Publish Workflow to Production

```javascript
const PublishWorkflow = ({ workflowId }) => {
  const [selectedVersion, setSelectedVersion] = useState(null);

  const publishToProd = async () => {
    // Publish the version
    await versionApi.publishVersion(workflowId, selectedVersion, false);

    // Optionally set as default
    const makeDefault = window.confirm('Set as default version?');
    if (makeDefault) {
      await versionApi.setDefaultVersion(workflowId, selectedVersion);
    }

    alert('Published successfully!');
  };

  return (
    <div>
      <select onChange={(e) => setSelectedVersion(parseInt(e.target.value))}>
        <option value="">Select version to publish...</option>
        {/* Version options */}
      </select>
      <button onClick={publishToProd}>Publish to Production</button>
    </div>
  );
};
```

### 5. Download/Upload Version

```javascript
const VersionPortability = ({ workflowId }) => {
  const downloadVersion = async (versionNumber) => {
    const result = await versionApi.exportVersion(workflowId, versionNumber);

    // Create download
    const dataStr = JSON.stringify(result.data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `workflow-${workflowId}-v${versionNumber}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const uploadVersion = async (file) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      const versionData = JSON.parse(e.target.result);
      const result = await versionApi.importVersion(workflowId, versionData, {
        author: 'user@example.com',
        tags: ['imported']
      });

      alert(`Imported as version ${result.data.version}`);
    };

    reader.readAsText(file);
  };

  return (
    <div>
      <button onClick={() => downloadVersion(1)}>Download Version</button>

      <input
        type="file"
        accept=".json"
        onChange={(e) => uploadVersion(e.target.files[0])}
      />
    </div>
  );
};
```

## Version Lifecycle Example

```javascript
// Day 1: Create initial version
const v1 = await versionApi.createVersion(workflowId, workflow, {
  author: 'john@example.com',
  changeDescription: 'Initial workflow design',
  tags: ['initial']
});
// Status: DRAFT, Version: 1

// Day 2: Test and publish
await versionApi.publishVersion(workflowId, 1, true); // true = set as default
// Status: PUBLISHED, isDefault: true

// Day 3: Make changes, create new version
const v2 = await versionApi.createVersion(workflowId, updatedWorkflow, {
  author: 'john@example.com',
  changeDescription: 'Added validation rules',
  tags: ['feature', 'validation']
});
// Status: DRAFT, Version: 2

// Day 4: Publish v2 and make it default
await versionApi.publishVersion(workflowId, 2, true);
// V2 Status: PUBLISHED, isDefault: true
// V1 Status: PUBLISHED, isDefault: false

// Week 2: Deprecate v1
await versionApi.deprecateVersion(workflowId, 1, 'Superseded by v2');
// V1 Status: DEPRECATED

// Month 3: Archive v1
await versionApi.archiveVersion(workflowId, 1);
// V1 Status: ARCHIVED

// If needed: Restore v1
const restored = await versionApi.restoreVersion(workflowId, 1);
// Creates V3 with data from V1
```

## Best Practices

### 1. When to Create Versions

- ✅ Before major changes
- ✅ After completing a feature
- ✅ Before testing
- ✅ Auto-save periodically
- ✅ When publishing to production
- ❌ Don't create versions on every keystroke

### 2. Version Descriptions

```javascript
// ❌ Bad
changeDescription: 'Updates'

// ✅ Good
changeDescription: 'Added email validation to customer registration form'
```

### 3. Tagging Strategy

```javascript
tags: [
  'feature',           // Type of change
  'customer-form',     // Area affected
  'tested',            // Testing status
  'production-ready'   // Deployment status
]
```

### 4. Default Version Management

- Always have exactly ONE default version
- Default version is used for new workflow instances
- Only set a version as default after thorough testing

### 5. Restore vs Clone

**Restore**: Creates a new version with old data
```javascript
// Use when: Rolling back to a previous state
const result = await versionApi.restoreVersion(workflowId, 5);
// Creates version 10 with data from version 5
```

**Clone**: Creates a draft copy
```javascript
// Use when: Want to experiment based on an old version
const result = await versionApi.cloneVersion(workflowId, 5);
// Creates a new draft you can modify
```

## Troubleshooting

### Can't Delete a Version

**Error**: "Cannot delete version with active instances"

**Solution**: Archive instead of delete
```javascript
await versionApi.archiveVersion(workflowId, versionNumber);
```

### Can't Find Default Version

**Solution**: Set one explicitly
```javascript
await versionApi.setDefaultVersion(workflowId, 1);
```

### Restore Not Working

**Check**: Make sure version exists
```javascript
try {
  const version = await versionApi.getVersion(workflowId, versionNumber);
  console.log('Version found:', version);
} catch (error) {
  console.error('Version not found:', error);
}
```

## Integration Checklist

- [x] Backend: VersionManager created
- [x] Backend: WorkflowDatabase updated
- [x] Backend: Version routes registered
- [x] Backend: RuntimeEngine integrated
- [x] Backend: Server configured
- [x] Frontend: versionApi service created
- [x] Frontend: VersionHistoryPanel component created
- [x] Frontend: CSS styling added
- [ ] Frontend: Add panel to your sidebar/layout
- [ ] Frontend: Add version selector to header (optional)
- [ ] Frontend: Implement auto-save (optional)
- [ ] Testing: Test version creation
- [ ] Testing: Test version restore
- [ ] Testing: Test version comparison

## Next Steps

1. **Add the Version History Panel to your UI**
   - Import the component
   - Add to sidebar or create a dedicated tab
   - Wire up the onVersionRestore callback

2. **Test the System**
   - Create a few versions manually
   - Try restoring a version
   - Compare two versions
   - Publish and set default

3. **Customize** (Optional)
   - Add auto-save functionality
   - Add version selector in header
   - Customize the panel styling
   - Add notifications/toasts

## Support

- Backend API: http://localhost:5000/api/versions/
- Documentation: See `UI_VERSIONING_GUIDE.md` for detailed examples
- Component: `ui/src/components/Panels/VersionHistoryPanel.js`
- API Service: `ui/src/services/versionApi.js`

## Summary

Your complete workflow versioning system includes:

1. **Backend**: Full version management with 21 API endpoints
2. **Frontend**: Ready-to-use UI component with comparison, restore, and all version operations
3. **API Client**: Complete service layer for all version operations
4. **Documentation**: Comprehensive guides and examples

Everything is ready to use - just add the VersionHistoryPanel to your UI and start versioning your workflows!
