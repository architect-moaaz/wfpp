import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import './PageFlowCanvas.css';
import PageNode from './PageNode';
import { ArrowLeft, Save, Zap, Trash2, RefreshCw, Plus, X } from 'lucide-react';

const nodeTypes = {
  pageNode: PageNode
};

const PageFlowCanvas = ({ onBack }) => {
  const [pages, setPages] = useState([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPageModal, setShowPageModal] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [isNewPage, setIsNewPage] = useState(false);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/pages');
      const data = await response.json();

      if (data.success) {
        setPages(data.pages);
        convertPagesToFlow(data.pages);
      }
    } catch (error) {
      console.error('Failed to fetch pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const convertPagesToFlow = (pagesData) => {
    // Create nodes from pages
    const flowNodes = pagesData.map((page, index) => ({
      id: page.id,
      type: 'pageNode',
      position: {
        x: (index % 4) * 300,
        y: Math.floor(index / 4) * 200
      },
      data: {
        label: page.name,
        type: page.type,
        route: page.route,
        platform: page.platform,
        pageData: page
      }
    }));

    // Create edges from navigation data
    const flowEdges = [];
    let edgeId = 0;

    pagesData.forEach((page) => {
      if (page.navigation && page.navigation.onAction) {
        Object.entries(page.navigation.onAction).forEach(([actionName, actionData]) => {
          if (actionData.type === 'navigate') {
            // Find target page by route
            const targetPage = pagesData.find(p => p.route === actionData.target);
            if (targetPage) {
              flowEdges.push({
                id: `edge-${edgeId++}`,
                source: page.id,
                target: targetPage.id,
                label: actionName,
                type: 'smoothstep',
                animated: false,
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 20,
                  height: 20
                },
                style: { stroke: '#6b7280' }
              });
            }
          }
        });
      }

      // Also check for menu navigation
      if (page.navigation && page.navigation.menu) {
        page.navigation.menu.forEach((menuItem) => {
          const targetPage = pagesData.find(p => p.route === menuItem.route);
          if (targetPage && targetPage.id !== page.id) {
            // Avoid duplicate edges
            const exists = flowEdges.some(e =>
              e.source === page.id && e.target === targetPage.id
            );
            if (!exists) {
              flowEdges.push({
                id: `edge-${edgeId++}`,
                source: page.id,
                target: targetPage.id,
                label: menuItem.label || 'menu',
                type: 'smoothstep',
                animated: false,
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 20,
                  height: 20
                },
                style: { stroke: '#9ca3af', strokeDasharray: '5,5' }
              });
            }
          }
        });
      }
    });

    setNodes(flowNodes);
    setEdges(flowEdges);
  };

  const onConnect = useCallback(
    (params) => {
      const newEdge = {
        ...params,
        id: `edge-${Date.now()}`,
        label: 'navigate',
        type: 'smoothstep',
        animated: false,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20
        },
        style: { stroke: '#6b7280' }
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const onEdgeClick = (event, edge) => {
    setSelectedEdge(edge);
  };

  const handleDeleteEdge = () => {
    if (selectedEdge) {
      setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
      setSelectedEdge(null);
    }
  };

  const handleAutoLayout = () => {
    // Simple hierarchical layout
    const nodeMap = new Map();
    nodes.forEach(node => nodeMap.set(node.id, { ...node, children: [], parents: [] }));

    // Build hierarchy
    edges.forEach(edge => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (source && target) {
        source.children.push(target);
        target.parents.push(source);
      }
    });

    // Find root nodes (no parents)
    const roots = Array.from(nodeMap.values()).filter(n => n.parents.length === 0);

    // Layout nodes level by level
    const levels = [];
    const visited = new Set();

    const assignLevel = (node, level) => {
      if (visited.has(node.id)) return;
      visited.add(node.id);

      if (!levels[level]) levels[level] = [];
      levels[level].push(node);

      node.children.forEach(child => assignLevel(child, level + 1));
    };

    roots.forEach(root => assignLevel(root, 0));

    // Position nodes (vertical layout: top-to-bottom)
    const HORIZONTAL_SPACING = 350;
    const VERTICAL_SPACING = 250;
    const START_X = 100;
    const START_Y = 100;

    const updatedNodes = [];
    levels.forEach((levelNodes, levelIndex) => {
      const y = START_Y + (levelIndex * VERTICAL_SPACING);
      const totalWidth = (levelNodes.length - 1) * HORIZONTAL_SPACING;
      const startX = START_X - (totalWidth / 2);

      levelNodes.forEach((node, nodeIndex) => {
        updatedNodes.push({
          ...node,
          position: {
            x: startX + (nodeIndex * HORIZONTAL_SPACING) + (levelIndex * 50), // Slight offset per level
            y: y
          }
        });
      });
    });

    setNodes(updatedNodes);
  };

  const handleSave = async () => {
    try {
      // Convert edges back to navigation structure
      const updatedPages = pages.map(page => {
        const pageNode = nodes.find(n => n.id === page.id);
        const outgoingEdges = edges.filter(e => e.source === page.id);

        const navigation = {
          ...(page.navigation || {}),
          onAction: {},
          menu: []
        };

        outgoingEdges.forEach(edge => {
          const targetNode = nodes.find(n => n.id === edge.target);
          if (targetNode) {
            const targetPage = pages.find(p => p.id === targetNode.id);
            if (targetPage) {
              const actionName = edge.label || 'navigate';
              navigation.onAction[actionName] = {
                type: 'navigate',
                target: targetPage.route
              };
            }
          }
        });

        return {
          ...page,
          navigation
        };
      });

      // Save all pages
      const savePromises = updatedPages.map(page =>
        fetch('http://localhost:5000/api/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(page)
        })
      );

      await Promise.all(savePromises);
      alert('Page flow saved successfully!');
    } catch (error) {
      console.error('Failed to save page flow:', error);
      alert('Failed to save page flow');
    }
  };

  const onNodeClick = (event, node) => {
    const page = pages.find(p => p.id === node.id);
    if (page) {
      setEditingPage({ ...page });
      setIsNewPage(false);
      setShowPageModal(true);
    }
  };

  const handleAddNewPage = () => {
    setEditingPage({
      id: `page-${Date.now()}`,
      name: '',
      route: '',
      type: 'list',
      platform: 'both',
      sections: [],
      navigation: {}
    });
    setIsNewPage(true);
    setShowPageModal(true);
  };

  const handleSavePage = async () => {
    if (!editingPage) return;

    try {
      const response = await fetch('http://localhost:5000/api/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingPage)
      });

      const data = await response.json();

      if (data.success) {
        setShowPageModal(false);
        setEditingPage(null);
        setIsNewPage(false);
        await fetchPages(); // Refresh pages
      }
    } catch (error) {
      console.error('Failed to save page:', error);
      alert('Failed to save page');
    }
  };

  const handleCancelEdit = () => {
    setShowPageModal(false);
    setEditingPage(null);
    setIsNewPage(false);
  };

  const handleDeletePage = async () => {
    if (!editingPage || !window.confirm('Are you sure you want to delete this page?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/pages/${editingPage.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setShowPageModal(false);
        setEditingPage(null);
        setIsNewPage(false);
        await fetchPages(); // Refresh pages
      }
    } catch (error) {
      console.error('Failed to delete page:', error);
      alert('Failed to delete page');
    }
  };

  if (loading) {
    return (
      <div className="page-flow-loading">
        <div>Loading page flow...</div>
      </div>
    );
  }

  return (
    <div className="page-flow-canvas">
      {/* Header */}
      <div className="page-flow-header">
        <button className="btn-back" onClick={onBack}>
          <ArrowLeft size={20} />
          Back to Pages
        </button>
        <div className="page-flow-title">
          <h2>Page Flow Designer</h2>
          <span className="page-count">{nodes.length} pages</span>
        </div>
        <div className="page-flow-actions">
          <button className="btn-secondary" onClick={handleAddNewPage} title="Add New Page">
            <Plus size={18} />
            Add Page
          </button>
          <button className="btn-secondary" onClick={fetchPages} title="Refresh">
            <RefreshCw size={18} />
            Refresh
          </button>
          <button className="btn-secondary" onClick={handleAutoLayout} title="Auto Layout">
            <Zap size={18} />
            Auto Layout
          </button>
          {selectedEdge && (
            <button className="btn-danger" onClick={handleDeleteEdge}>
              <Trash2 size={18} />
              Delete Connection
            </button>
          )}
          <button className="btn-primary" onClick={handleSave}>
            <Save size={18} />
            Save Flow
          </button>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="page-flow-container">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#e5e7eb" gap={16} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const colors = {
                list: '#3b82f6',
                detail: '#10b981',
                form: '#f59e0b',
                dashboard: '#8b5cf6',
                auth: '#ef4444',
                confirmation: '#06b6d4'
              };
              return colors[node.data.type] || '#6b7280';
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        </ReactFlow>
      </div>

      {/* Instructions */}
      {nodes.length === 0 && (
        <div className="page-flow-empty">
          <p>No pages found. Create pages in your workflow to see the page flow.</p>
        </div>
      )}

      {nodes.length > 0 && edges.length === 0 && (
        <div className="page-flow-hint">
          <p>Connect pages by dragging from one page's bottom handle to another page's top handle</p>
        </div>
      )}

      {/* Page Editor Modal */}
      {showPageModal && editingPage && (
        <div className="modal-overlay" onClick={handleCancelEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>{isNewPage ? 'Add New Page' : 'Edit Page'}</h2>
              <button className="icon-btn" onClick={handleCancelEdit}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="form-group">
                <label>Page Name</label>
                <input
                  type="text"
                  value={editingPage.name || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, name: e.target.value })}
                  className="form-input"
                  placeholder="e.g., User List"
                />
              </div>

              <div className="form-group">
                <label>Route</label>
                <input
                  type="text"
                  value={editingPage.route || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, route: e.target.value })}
                  className="form-input"
                  placeholder="e.g., /users"
                />
              </div>

              <div className="form-group">
                <label>Page Type</label>
                <select
                  value={editingPage.type || 'list'}
                  onChange={(e) => setEditingPage({ ...editingPage, type: e.target.value })}
                  className="form-input"
                >
                  <option value="list">List</option>
                  <option value="detail">Detail</option>
                  <option value="form">Form</option>
                  <option value="dashboard">Dashboard</option>
                  <option value="auth">Auth</option>
                  <option value="confirmation">Confirmation</option>
                </select>
              </div>

              <div className="form-group">
                <label>Platform</label>
                <select
                  value={editingPage.platform || 'both'}
                  onChange={(e) => setEditingPage({ ...editingPage, platform: e.target.value })}
                  className="form-input"
                >
                  <option value="web">Web</option>
                  <option value="mobile">Mobile</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={editingPage.title || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                  className="form-input"
                  placeholder="Page title (optional)"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editingPage.description || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, description: e.target.value })}
                  className="form-input"
                  rows="3"
                  placeholder="Page description (optional)"
                />
              </div>
            </div>
            <div className="modal-footer">
              {!isNewPage && (
                <button className="btn-danger" onClick={handleDeletePage} style={{ marginRight: 'auto' }}>
                  <Trash2 size={16} />
                  Delete
                </button>
              )}
              <button className="btn-secondary" onClick={handleCancelEdit}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSavePage}>
                {isNewPage ? 'Create Page' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageFlowCanvas;
