import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  ConnectionLineType
} from 'reactflow';
import 'reactflow/dist/style.css';
import OrgChartNode from './OrgChartNode';
import PositionPanel from './PositionPanel';
import './OrgChart.css';

const nodeTypes = {
  orgPosition: OrgChartNode
};

const OrgChartCanvas = ({ organizationId, onPositionSelect }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [showPositionPanel, setShowPositionPanel] = useState(false);
  const [orgChart, setOrgChart] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentOrgId, setCurrentOrgId] = useState(organizationId);

  // Fetch org chart data
  const fetchOrgChart = useCallback(async () => {
    try {
      setLoading(true);

      // If no organizationId provided, fetch the default/first organization
      let orgId = currentOrgId;
      if (!orgId) {
        const orgsRes = await fetch('http://localhost:5000/api/identity/organizations');
        if (orgsRes.ok) {
          const data = await orgsRes.json();
          const orgs = data.organizations || data;
          if (orgs && orgs.length > 0) {
            orgId = orgs[0].id;
            setCurrentOrgId(orgId);
          } else {
            setLoading(false);
            return;
          }
        }
      }

      const [chartRes, deptsRes, usersRes] = await Promise.all([
        fetch(`http://localhost:5000/api/identity/positions/org/${orgId}/chart`),
        fetch(`http://localhost:5000/api/identity/departments/org/${orgId}?flat=true`),
        fetch(`http://localhost:5000/api/identity/users/org/${orgId}`)
      ]);

      const chartData = await chartRes.json();
      const deptsData = await deptsRes.json();
      const usersData = await usersRes.json();

      setOrgChart(chartData);
      setDepartments(deptsData);
      setUsers(usersData.users || []);

      // Convert to React Flow nodes and edges
      const { nodes: flowNodes, edges: flowEdges } = convertToFlowElements(chartData);
      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (error) {
      console.error('Error fetching org chart:', error);
    } finally {
      setLoading(false);
    }
  }, [currentOrgId, setNodes, setEdges]);

  useEffect(() => {
    fetchOrgChart();
  }, [fetchOrgChart]);

  // Convert hierarchical data to React Flow format
  const convertToFlowElements = (chartData, parentId = null, x = 0, level = 0) => {
    const nodes = [];
    const edges = [];
    const horizontalSpacing = 280;
    const verticalSpacing = 150;

    const processNode = (position, index, siblings, parentX) => {
      const totalWidth = siblings.length * horizontalSpacing;
      const startX = parentX - totalWidth / 2 + horizontalSpacing / 2;
      const nodeX = startX + index * horizontalSpacing;
      const nodeY = level * verticalSpacing + 50;

      const node = {
        id: position.id,
        type: 'orgPosition',
        position: { x: nodeX, y: nodeY },
        data: {
          ...position,
          onEdit: () => handleEditPosition(position),
          onAddReport: () => handleAddReport(position),
          onDelete: () => handleDeletePosition(position.id)
        }
      };
      nodes.push(node);

      if (parentId) {
        edges.push({
          id: `${parentId}-${position.id}`,
          source: parentId,
          target: position.id,
          type: 'smoothstep',
          style: { stroke: '#cbd5e1', strokeWidth: 2 },
          animated: false
        });
      }

      // Process children
      if (position.children && position.children.length > 0) {
        position.children.forEach((child, childIndex) => {
          const childElements = processNodeRecursive(child, childIndex, position.children, nodeX, level + 1, position.id);
          nodes.push(...childElements.nodes);
          edges.push(...childElements.edges);
        });
      }
    };

    const processNodeRecursive = (position, index, siblings, parentX, currentLevel, currentParentId) => {
      const nodeNodes = [];
      const nodeEdges = [];
      const totalWidth = siblings.length * horizontalSpacing;
      const startX = parentX - totalWidth / 2 + horizontalSpacing / 2;
      const nodeX = startX + index * horizontalSpacing;
      const nodeY = currentLevel * verticalSpacing + 50;

      const node = {
        id: position.id,
        type: 'orgPosition',
        position: { x: nodeX, y: nodeY },
        data: {
          ...position,
          onEdit: () => handleEditPosition(position),
          onAddReport: () => handleAddReport(position),
          onDelete: () => handleDeletePosition(position.id)
        }
      };
      nodeNodes.push(node);

      nodeEdges.push({
        id: `${currentParentId}-${position.id}`,
        source: currentParentId,
        target: position.id,
        type: 'smoothstep',
        style: { stroke: '#cbd5e1', strokeWidth: 2 },
        animated: false
      });

      if (position.children && position.children.length > 0) {
        position.children.forEach((child, childIndex) => {
          const childElements = processNodeRecursive(child, childIndex, position.children, nodeX, currentLevel + 1, position.id);
          nodeNodes.push(...childElements.nodes);
          nodeEdges.push(...childElements.edges);
        });
      }

      return { nodes: nodeNodes, edges: nodeEdges };
    };

    // Process root nodes - processNode already adds to outer nodes/edges arrays
    chartData.forEach((rootPosition, index) => {
      processNode(rootPosition, index, chartData, 400);
    });

    return { nodes, edges };
  };

  const handleEditPosition = (position) => {
    setSelectedPosition(position);
    setShowPositionPanel(true);
    if (onPositionSelect) {
      onPositionSelect(position);
    }
  };

  const handleAddReport = (parentPosition) => {
    setSelectedPosition({
      isNew: true,
      parentPositionId: parentPosition.id,
      parentTitle: parentPosition.title,
      organization_id: currentOrgId
    });
    setShowPositionPanel(true);
  };

  const handleAddRootPosition = () => {
    setSelectedPosition({
      isNew: true,
      parentPositionId: null,
      organization_id: currentOrgId
    });
    setShowPositionPanel(true);
  };

  const handleSavePosition = async (positionData) => {
    try {
      let response;
      if (positionData.isNew) {
        response = await fetch(`http://localhost:5000/api/identity/positions/org/${currentOrgId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(positionData)
        });
      } else {
        response = await fetch(`http://localhost:5000/api/identity/positions/${positionData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(positionData)
        });
      }

      if (response.ok) {
        setShowPositionPanel(false);
        setSelectedPosition(null);
        fetchOrgChart();
      }
    } catch (error) {
      console.error('Error saving position:', error);
    }
  };

  const handleDeletePosition = async (positionId) => {
    if (!window.confirm('Are you sure you want to delete this position?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/identity/positions/${positionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setShowPositionPanel(false);
        setSelectedPosition(null);
        fetchOrgChart();
      }
    } catch (error) {
      console.error('Error deleting position:', error);
    }
  };

  const handleAssignUser = async (positionId, userId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/identity/positions/${positionId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        fetchOrgChart();
      }
    } catch (error) {
      console.error('Error assigning user:', error);
    }
  };

  const onNodeClick = useCallback((event, node) => {
    handleEditPosition(node.data);
  }, []);

  if (loading) {
    return (
      <div className="org-chart-loading">
        <div className="loading-spinner"></div>
        <p>Loading organization chart...</p>
      </div>
    );
  }

  // Empty state when no organization exists
  if (!currentOrgId && !loading) {
    return (
      <div className="org-chart-empty">
        <div className="empty-state-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <h2>No Organization Chart</h2>
        <p>Create an organization first to build your org chart.</p>
      </div>
    );
  }

  // Empty state when organization exists but has no positions
  if (currentOrgId && nodes.length === 0 && !loading) {
    return (
      <div className="org-chart-container">
        <div className="org-chart-toolbar">
          <h2>Organization Chart</h2>
          <div className="toolbar-actions">
            <button className="btn-add-position" onClick={handleAddRootPosition}>
              + Add Position
            </button>
          </div>
        </div>
        <div className="org-chart-empty-positions">
          <div className="empty-state-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="8.5" y="14" width="7" height="7" rx="1" />
              <line x1="6.5" y1="10" x2="6.5" y2="12" />
              <line x1="17.5" y1="10" x2="17.5" y2="12" />
              <line x1="6.5" y1="12" x2="17.5" y2="12" />
              <line x1="12" y1="12" x2="12" y2="14" />
            </svg>
          </div>
          <h3>No Positions Yet</h3>
          <p>Start building your organization chart by adding the first position.</p>
          <button className="btn-add-first-position" onClick={handleAddRootPosition}>
            + Add First Position
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="org-chart-container">
      <div className="org-chart-toolbar">
        <h2>Organization Chart</h2>
        <div className="toolbar-actions">
          <button className="btn-add-position" onClick={handleAddRootPosition}>
            + Add Position
          </button>
        </div>
      </div>

      <div className="org-chart-canvas">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            connectionLineType={ConnectionLineType.SmoothStep}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 0.8 }}
            minZoom={0.3}
            maxZoom={1.5}
          >
            <Background variant={BackgroundVariant.Dots} color="#cbd5e1" gap={24} size={1} />
            <Controls />
          </ReactFlow>
        </ReactFlowProvider>
      </div>

      {showPositionPanel && (
        <PositionPanel
          position={selectedPosition}
          departments={departments}
          users={users}
          organizationId={currentOrgId}
          onSave={handleSavePosition}
          onDelete={handleDeletePosition}
          onAssignUser={handleAssignUser}
          onUserCreated={(newUser) => {
            // Add new user to the list
            setUsers(prev => [...prev, newUser]);
          }}
          onClose={() => {
            setShowPositionPanel(false);
            setSelectedPosition(null);
          }}
        />
      )}
    </div>
  );
};

export default OrgChartCanvas;
