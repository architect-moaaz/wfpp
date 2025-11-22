# Workflow Versioning UI Integration Guide

## Overview

The workflow versioning system allows you to:
- **Track workflow changes** over time
- **Compare** different versions
- **Restore** previous versions
- **Publish** versions for production
- **Manage** version lifecycle (Draft → Published → Deprecated → Archived)

## Quick Start

### 1. Import the Version History Panel

```javascript
import VersionHistoryPanel from './components/Panels/VersionHistoryPanel';
import versionApi from './services/versionApi';
```

### 2. Add to Your Layout

```javascript
// Example: In your Sidebar or Main Layout
<VersionHistoryPanel
  workflowId={currentWorkflow.id}
  onVersionRestore={(version) => {
    // Handle version restore
    setCurrentWorkflow(version.workflow);
    showToast('Version restored successfully!');
  }}
/>
```

## API Service Usage

### Creating Versions

```javascript
import versionApi from './services/versionApi';

// Save current workflow as a new version
const saveVersion = async () => {
  try {
    const result = await versionApi.createVersion(
      workflowId,
      currentWorkflow, // Your workflow object
      {
        author: 'john.doe@example.com',
        changeDescription: 'Added new validation rules',
        tags: ['feature', 'validation']
      }
    );

    console.log('Version created:', result.data.version);
  } catch (error) {
    console.error('Failed to create version:', error);
  }
};
```

### Loading Versions

```javascript
// Get all versions for a workflow
const loadVersions = async () => {
  const result = await versionApi.getVersions(workflowId, {
    includeArchived: false,
    status: 'PUBLISHED', // or 'DRAFT', 'DEPRECATED', 'ARCHIVED'
    limit: 10,
    offset: 0
  });

  return result.data;
};

// Get a specific version
const getVersion = async (versionNumber) => {
  const result = await versionApi.getVersion(workflowId, versionNumber);
  return result.data;
};

// Get the default version
const getDefault = async () => {
  const result = await versionApi.getDefaultVersion(workflowId);
  return result.data;
};
```

### Restoring a Version

```javascript
// Restore a previous version (creates a new version with old data)
const restoreVersion = async (versionNumber) => {
  try {
    const result = await versionApi.restoreVersion(workflowId, versionNumber, {
      author: 'user@example.com',
      changeDescription: `Restored from version ${versionNumber}`,
      tags: ['restored']
    });

    // Update your UI with restored workflow
    setCurrentWorkflow(result.data.version.workflow);

    console.log('Version restored as new version:', result.data.version.version);
  } catch (error) {
    console.error('Restore failed:', error);
  }
};
```

### Publishing Versions

```javascript
// Publish a draft version
const publishVersion = async (versionNumber, makeDefault = false) => {
  await versionApi.publishVersion(workflowId, versionNumber, makeDefault);
};

// Set a version as default
const setAsDefault = async (versionNumber) => {
  await versionApi.setDefaultVersion(workflowId, versionNumber);
};
```

### Comparing Versions

```javascript
// Compare two versions
const compareVersions = async (version1, version2) => {
  const result = await versionApi.compareVersions(workflowId, version1, version2);

  console.log('Changes:', result.data);
  console.log('Nodes added:', result.data.summary.nodesAdded);
  console.log('Nodes removed:', result.data.summary.nodesRemoved);
  console.log('Nodes modified:', result.data.summary.nodesModified);

  return result.data;
};
```

### Version Lifecycle Management

```javascript
// Clone a version
const cloneVersion = async (versionNumber) => {
  const result = await versionApi.cloneVersion(workflowId, versionNumber, {
    author: 'user@example.com',
    changeDescription: 'Cloned for experimentation'
  });
  return result.data;
};

// Deprecate a version
const deprecateVersion = async (versionNumber) => {
  await versionApi.deprecateVersion(
    workflowId,
    versionNumber,
    'Superseded by version ' + (versionNumber + 1)
  );
};

// Archive a version
const archiveVersion = async (versionNumber) => {
  await versionApi.archiveVersion(workflowId, versionNumber);
};

// Delete a version (only if no instances using it)
const deleteVersion = async (versionNumber) => {
  await versionApi.deleteVersion(workflowId, versionNumber);
};
```

### Export/Import Versions

```javascript
// Export a version
const exportVersion = async (versionNumber) => {
  const result = await versionApi.exportVersion(workflowId, versionNumber);

  // Download as JSON file
  const dataStr = JSON.stringify(result.data, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `workflow-${workflowId}-v${versionNumber}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

// Import a version
const importVersion = async (versionData) => {
  const result = await versionApi.importVersion(workflowId, versionData, {
    author: 'user@example.com',
    tags: ['imported']
  });
  return result.data;
};
```

### Getting Version Statistics

```javascript
// Get statistics for a specific version
const getVersionStats = async (versionNumber) => {
  const result = await versionApi.getVersionStats(workflowId, versionNumber);

  console.log('Total instances:', result.data.instanceCount);
  console.log('Active instances:', result.data.activeInstances);
  console.log('Completed:', result.data.completedInstances);
  console.log('Failed:', result.data.failedInstances);

  return result.data;
};

// Get instances using a version
const getVersionInstances = async (versionNumber) => {
  const result = await versionApi.getVersionInstances(workflowId, versionNumber);
  return result.data;
};
```

## Integration Examples

### Example 1: Auto-Save with Versioning

```javascript
const AutoSaveWorkflow = () => {
  const { currentWorkflow } = useWorkflow();
  const [lastSaved, setLastSaved] = useState(null);

  // Auto-save every 5 minutes
  useEffect(() => {
    const interval = setInterval(async () => {
      if (currentWorkflow) {
        await versionApi.createVersion(
          currentWorkflow.id,
          currentWorkflow,
          {
            author: 'auto-save',
            changeDescription: 'Auto-saved changes',
            tags: ['auto-save']
          }
        );
        setLastSaved(new Date());
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [currentWorkflow]);

  return <div>Last saved: {lastSaved?.toLocaleTimeString()}</div>;
};
```

### Example 2: Version Selector in Header

```javascript
const VersionSelector = ({ workflowId, currentVersion }) => {
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(currentVersion);

  useEffect(() => {
    loadVersions();
  }, [workflowId]);

  const loadVersions = async () => {
    const result = await versionApi.getPublishedVersions(workflowId);
    setVersions(result.data);
  };

  const handleVersionChange = async (versionNumber) => {
    const result = await versionApi.getVersion(workflowId, versionNumber);
    setSelectedVersion(versionNumber);
    // Update workflow in context
    setCurrentWorkflow(result.data.workflow);
  };

  return (
    <select
      value={selectedVersion}
      onChange={(e) => handleVersionChange(parseInt(e.target.value))}
    >
      {versions.map(v => (
        <option key={v.version} value={v.version}>
          v{v.version} {v.metadata.isDefault && '(Default)'}
        </option>
      ))}
    </select>
  );
};
```

### Example 3: Version Comparison View

```javascript
const CompareVersionsView = ({ workflowId }) => {
  const [version1, setVersion1] = useState(1);
  const [version2, setVersion2] = useState(2);
  const [comparison, setComparison] = useState(null);

  const compare = async () => {
    const result = await versionApi.compareVersions(workflowId, version1, version2);
    setComparison(result.data);
  };

  return (
    <div className="compare-view">
      <div className="version-selectors">
        <select value={version1} onChange={(e) => setVersion1(parseInt(e.target.value))}>
          {/* Version options */}
        </select>
        <span>vs</span>
        <select value={version2} onChange={(e) => setVersion2(parseInt(e.target.value))}>
          {/* Version options */}
        </select>
        <button onClick={compare}>Compare</button>
      </div>

      {comparison && (
        <div className="comparison-results">
          <h3>Changes Summary</h3>
          <ul>
            <li>Nodes Added: {comparison.summary.nodesAdded}</li>
            <li>Nodes Removed: {comparison.summary.nodesRemoved}</li>
            <li>Nodes Modified: {comparison.summary.nodesModified}</li>
          </ul>

          <h4>Detailed Changes</h4>
          {comparison.changes.nodes.added.map(node => (
            <div key={node.id} className="change added">
              + Added: {node.id} ({node.type})
            </div>
          ))}
          {comparison.changes.nodes.removed.map(node => (
            <div key={node.id} className="change removed">
              - Removed: {node.id} ({node.type})
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### Example 4: Restore with Confirmation

```javascript
const RestoreVersionButton = ({ workflowId, versionNumber, onRestore }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRestore = async () => {
    try {
      const result = await versionApi.restoreVersion(workflowId, versionNumber);

      if (onRestore) {
        onRestore(result.data.version);
      }

      setShowConfirm(false);
    } catch (error) {
      alert('Failed to restore version: ' + error.message);
    }
  };

  return (
    <>
      <button onClick={() => setShowConfirm(true)}>
        Restore Version {versionNumber}
      </button>

      {showConfirm && (
        <div className="confirm-dialog">
          <p>
            Are you sure you want to restore version {versionNumber}?
            This will create a new version with the data from version {versionNumber}.
          </p>
          <button onClick={handleRestore}>Confirm</button>
          <button onClick={() => setShowConfirm(false)}>Cancel</button>
        </div>
      )}
    </>
  );
};
```

## Adding to Sidebar

To add the Version History panel to your sidebar, update your Sidebar component:

```javascript
// In Sidebar.js
import VersionHistoryPanel from './Panels/VersionHistoryPanel';

const Sidebar = () => {
  const { currentWorkflow, setCurrentWorkflow } = useWorkflow();
  const [activePanel, setActivePanel] = useState('workflow-editor');

  const handleVersionRestore = (version) => {
    setCurrentWorkflow(version.workflow);
    // Show success message
    toast.success(`Restored to version ${version.version}`);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-tabs">
        <button onClick={() => setActivePanel('workflow-editor')}>
          Editor
        </button>
        <button onClick={() => setActivePanel('version-history')}>
          Version History
        </button>
        {/* Other tabs */}
      </div>

      <div className="sidebar-content">
        {activePanel === 'workflow-editor' && <WorkflowEditor />}
        {activePanel === 'version-history' && (
          <VersionHistoryPanel
            workflowId={currentWorkflow.id}
            onVersionRestore={handleVersionRestore}
          />
        )}
        {/* Other panels */}
      </div>
    </div>
  );
};
```

## Version Lifecycle Flow

```
1. Create Draft Version
   ↓
2. Edit & Test (Draft status)
   ↓
3. Publish Version (Published status)
   ↓
4. Set as Default (if needed)
   ↓
5. When superseded → Deprecate (Deprecated status)
   ↓
6. Archive old versions (Archived status)
```

## Best Practices

1. **Auto-Save Drafts**: Create draft versions automatically when users make changes
2. **Meaningful Descriptions**: Always provide clear change descriptions
3. **Tag Important Versions**: Use tags like 'production', 'tested', 'hotfix'
4. **Default Version**: Always have one default version for new workflow instances
5. **Don't Delete Active Versions**: The API prevents deleting versions with active instances
6. **Compare Before Restore**: Always show users what will change when restoring
7. **Publish for Production**: Only published versions should be used in production

## Error Handling

```javascript
const safeVersionOperation = async (operation) => {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    console.error('Version operation failed:', error);

    if (error.message.includes('not found')) {
      return { success: false, error: 'Version not found' };
    } else if (error.message.includes('active instances')) {
      return { success: false, error: 'Cannot delete version with active instances' };
    } else {
      return { success: false, error: error.message };
    }
  }
};

// Usage
const result = await safeVersionOperation(() =>
  versionApi.deleteVersion(workflowId, versionNumber)
);

if (!result.success) {
  showErrorToast(result.error);
}
```

## Environment Configuration

Add to your `.env` file:

```bash
REACT_APP_API_URL=http://localhost:5000/api
```

## Features of the VersionHistoryPanel

- ✅ View all versions with metadata
- ✅ Filter by status (Draft, Published, Deprecated)
- ✅ Expand/collapse version details
- ✅ Select multiple versions for comparison
- ✅ Visual diff showing changes
- ✅ Publish draft versions
- ✅ Set default version
- ✅ Restore previous versions
- ✅ Clone versions
- ✅ Export/import versions
- ✅ Archive old versions
- ✅ Delete unused versions
- ✅ View instance statistics per version
- ✅ Default version indicator
- ✅ Status badges
- ✅ Action buttons per version

## Complete Workflow

```javascript
// Complete example of version workflow management
const WorkflowVersionManager = () => {
  const { currentWorkflow, setCurrentWorkflow } = useWorkflow();

  // 1. Save current work as draft
  const saveDraft = async () => {
    await versionApi.createVersion(currentWorkflow.id, currentWorkflow, {
      author: 'user@example.com',
      changeDescription: 'Work in progress',
      tags: ['draft', 'wip']
    });
  };

  // 2. Publish when ready
  const publishCurrent = async (versionNumber) => {
    await versionApi.publishVersion(currentWorkflow.id, versionNumber, false);
  };

  // 3. Set as production default
  const makeDefault = async (versionNumber) => {
    await versionApi.setDefaultVersion(currentWorkflow.id, versionNumber);
  };

  // 4. Restore if needed
  const rollback = async (versionNumber) => {
    const result = await versionApi.restoreVersion(
      currentWorkflow.id,
      versionNumber
    );
    setCurrentWorkflow(result.data.version.workflow);
  };

  return (
    <div className="version-manager">
      <button onClick={saveDraft}>Save Draft</button>
      <VersionHistoryPanel
        workflowId={currentWorkflow.id}
        onVersionRestore={(version) => {
          setCurrentWorkflow(version.workflow);
        }}
      />
    </div>
  );
};
```

This guide covers all aspects of using the workflow versioning system in your UI. The Version History Panel component provides a complete, production-ready interface for managing workflow versions.
