import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import './MobileFlowCanvas.css';
import MobileScreenNode from './MobileScreenNode';
import { ArrowLeft, Smartphone, Zap, Layers, Grid } from 'lucide-react';
import { useWorkflow } from '../../context/WorkflowContext';

const nodeTypes = {
  mobileScreen: MobileScreenNode
};

const MobileFlowCanvas = ({ onBack }) => {
  const { currentWorkflow } = useWorkflow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [navigationInfo, setNavigationInfo] = useState(null);

  const mobileUI = currentWorkflow?.mobileUI;
  const screens = mobileUI?.screens || [];
  const navigation = mobileUI?.navigation || {};

  useEffect(() => {
    if (screens.length > 0) {
      convertScreensToFlow();
    }
  }, [screens]);

  const convertScreensToFlow = () => {
    // Create nodes from screens
    const flowNodes = screens.map((screen, index) => ({
      id: screen.id,
      type: 'mobileScreen',
      position: {
        x: (index % 4) * 300,
        y: Math.floor(index / 4) * 220
      },
      data: {
        label: screen.name,
        type: screen.type,
        platform: screen.platform,
        screenData: screen
      }
    }));

    // Create edges based on navigation structure
    const flowEdges = [];
    let edgeId = 0;

    // Tab bar navigation - connect all tab screens to initial screen
    if (navigation.type === 'tab_bar' && navigation.tabs) {
      const initialScreenId = navigation.initialScreen;

      navigation.tabs.forEach((tab, index) => {
        const tabScreen = screens.find(s => s.id === tab.screen);
        if (tabScreen && tabScreen.id !== initialScreenId) {
          flowEdges.push({
            id: `tab-${edgeId++}`,
            source: initialScreenId || screens[0].id,
            target: tabScreen.id,
            label: tab.label,
            type: 'smoothstep',
            animated: false,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20
            },
            style: {
              stroke: '#3b82f6',
              strokeWidth: 2,
              strokeDasharray: '5,5'
            },
            data: { navigationType: 'tab' }
          });
        }
      });
    }

    // Drawer navigation
    if (navigation.type === 'drawer' && navigation.menuItems) {
      const initialScreenId = navigation.initialScreen;

      navigation.menuItems.forEach((item) => {
        const targetScreen = screens.find(s => s.id === item.screen);
        if (targetScreen && targetScreen.id !== initialScreenId) {
          flowEdges.push({
            id: `drawer-${edgeId++}`,
            source: initialScreenId || screens[0].id,
            target: targetScreen.id,
            label: item.label,
            type: 'smoothstep',
            animated: false,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20
            },
            style: {
              stroke: '#8b5cf6',
              strokeWidth: 2,
              strokeDasharray: '3,3'
            },
            data: { navigationType: 'drawer' }
          });
        }
      });
    }

    // Stack navigation - connect screens based on workflow nodes
    screens.forEach((screen) => {
      if (screen.workflowNodeId) {
        // Find next screen in workflow
        const node = currentWorkflow?.nodes?.find(n => n.id === screen.workflowNodeId);
        if (node) {
          // Find connections from this node
          const connections = currentWorkflow?.connections?.filter(c => c.source === node.id) || [];

          connections.forEach((conn) => {
            // Find screen for target node
            const targetScreen = screens.find(s => s.workflowNodeId === conn.target);
            if (targetScreen) {
              // Avoid duplicate edges
              const exists = flowEdges.some(e =>
                e.source === screen.id && e.target === targetScreen.id
              );

              if (!exists) {
                flowEdges.push({
                  id: `stack-${edgeId++}`,
                  source: screen.id,
                  target: targetScreen.id,
                  label: conn.label || 'next',
                  type: 'smoothstep',
                  animated: true,
                  markerEnd: {
                    type: MarkerType.ArrowClosed,
                    width: 20,
                    height: 20
                  },
                  style: {
                    stroke: '#10b981',
                    strokeWidth: 2
                  },
                  data: { navigationType: 'stack' }
                });
              }
            }
          });
        }
      }
    });

    setNodes(flowNodes);
    setEdges(flowEdges);
    setNavigationInfo(navigation);
  };

  const handleAutoLayout = () => {
    if (navigation.type === 'tab_bar') {
      // Hub and spoke layout for tabs
      const initialScreen = screens.find(s => s.id === navigation.initialScreen) || screens[0];
      const initialIndex = screens.findIndex(s => s.id === initialScreen.id);

      const updatedNodes = screens.map((screen, index) => {
        if (index === initialIndex) {
          // Center node
          return {
            ...nodes.find(n => n.id === screen.id),
            position: { x: 400, y: 200 }
          };
        } else {
          // Surrounding nodes in a circle
          const angle = ((index - (index > initialIndex ? 1 : 0)) / (screens.length - 1)) * Math.PI * 2;
          const radius = 300;
          return {
            ...nodes.find(n => n.id === screen.id),
            position: {
              x: 400 + Math.cos(angle) * radius,
              y: 200 + Math.sin(angle) * radius
            }
          };
        }
      });
      setNodes(updatedNodes);
    } else {
      // Hierarchical layout for stack navigation
      const nodeMap = new Map();
      nodes.forEach(node => nodeMap.set(node.id, { ...node, children: [], parents: [] }));

      edges.forEach(edge => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (source && target) {
          source.children.push(target);
          target.parents.push(source);
        }
      });

      const roots = Array.from(nodeMap.values()).filter(n => n.parents.length === 0);
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

      const HORIZONTAL_SPACING = 320;
      const VERTICAL_SPACING = 220;
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
              x: startX + (nodeIndex * HORIZONTAL_SPACING) + (levelIndex * 40),
              y: y
            }
          });
        });
      });

      setNodes(updatedNodes);
    }
  };

  const getNavigationDescription = () => {
    if (!navigationInfo) return 'No navigation structure';

    switch (navigationInfo.type) {
      case 'tab_bar':
        return `Tab Bar Navigation (${navigationInfo.tabs?.length || 0} tabs)`;
      case 'drawer':
        return `Drawer Navigation (${navigationInfo.menuItems?.length || 0} items)`;
      case 'stack':
        return 'Stack Navigation (push/pop)';
      default:
        return 'Custom Navigation';
    }
  };

  if (screens.length === 0) {
    return (
      <div className="mobile-flow-canvas">
        <div className="mobile-flow-header">
          <button className="btn-back" onClick={onBack}>
            <ArrowLeft size={20} />
            Back to Mobile Screens
          </button>
          <h2>Mobile Screen Flow</h2>
        </div>
        <div className="mobile-flow-empty">
          <Smartphone size={64} className="empty-icon" />
          <h3>No Mobile Screens</h3>
          <p>Generate a workflow with mobile UI to see the screen flow.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-flow-canvas">
      {/* Header */}
      <div className="mobile-flow-header">
        <button className="btn-back" onClick={onBack}>
          <ArrowLeft size={20} />
          Back to Mobile Screens
        </button>
        <div className="mobile-flow-title">
          <h2>Mobile Screen Flow</h2>
          <span className="screen-count">{screens.length} screens</span>
        </div>
        <div className="mobile-flow-actions">
          <button className="btn-secondary" onClick={handleAutoLayout} title="Auto Layout">
            <Zap size={18} />
            Auto Layout
          </button>
        </div>
      </div>

      {/* Navigation Info Panel */}
      <div className="mobile-flow-info">
        <div className="info-item">
          <Layers size={16} />
          <span>{getNavigationDescription()}</span>
        </div>
        {navigationInfo?.initialScreen && (
          <div className="info-item">
            <Grid size={16} />
            <span>Initial: {screens.find(s => s.id === navigationInfo.initialScreen)?.name || 'Unknown'}</span>
          </div>
        )}
      </div>

      {/* React Flow Canvas */}
      <div className="mobile-flow-container">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
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
                auth: '#ef4444'
              };
              return colors[node.data.type] || '#6b7280';
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        </ReactFlow>
      </div>

      {/* Legend */}
      <div className="mobile-flow-legend">
        <div className="legend-title">Navigation Types:</div>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-line" style={{ borderColor: '#3b82f6', borderStyle: 'dashed' }}></div>
            <span>Tab Navigation</span>
          </div>
          <div className="legend-item">
            <div className="legend-line" style={{ borderColor: '#8b5cf6', borderStyle: 'dashed' }}></div>
            <span>Drawer Menu</span>
          </div>
          <div className="legend-item">
            <div className="legend-line" style={{ borderColor: '#10b981' }}></div>
            <span>Stack Push/Pop</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileFlowCanvas;
