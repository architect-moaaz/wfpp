import React, { useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './ERDiagram.css';
import { Database, Workflow } from 'lucide-react';
import ERNode from './ERNode';
import { getLayoutedElements, getOptimalDirection, getOptimalSpacing } from './layoutUtils';

const ERDiagram = ({ dataModels, onEditModel }) => {
  // Define custom node types
  const nodeTypes = useMemo(() => ({ erNode: ERNode }), []);

  // Track if initial layout has been applied
  const [layoutApplied, setLayoutApplied] = React.useState(false);
  const [layoutDirection, setLayoutDirection] = React.useState('auto'); // 'auto', 'TB', 'LR'

  // Convert data models to ReactFlow nodes
  const initialNodes = useMemo(() => {
    if (!dataModels || dataModels.length === 0) return [];

    return dataModels.map((model, index) => {
      // Calculate position in a grid layout with better spacing
      const col = index % 3;
      const row = Math.floor(index / 3);

      // Increase spacing to prevent overlap
      const horizontalSpacing = 450;
      const verticalSpacing = 500;

      return {
        id: model.id,
        type: 'erNode',
        position: { x: col * horizontalSpacing + 50, y: row * verticalSpacing + 50 },
        data: {
          model: model,
          onEditModel: onEditModel
        }
      };
    });
  }, [dataModels, onEditModel]);

  // Convert relationships to ReactFlow edges with field-level connections
  const initialEdges = useMemo(() => {
    if (!dataModels || dataModels.length === 0) return [];

    const edges = [];

    dataModels.forEach(model => {
      if (model.relationships && model.relationships.length > 0) {
        model.relationships.forEach((rel, idx) => {
          // Find target model - support both 'targetModel' and 'target' fields
          const targetName = rel.targetModel || rel.target;
          const targetModel = dataModels.find(m =>
            m.name === targetName ||
            m.displayName === targetName ||
            m.id === targetName
          );

          if (targetModel) {
            // Find foreign key field in source model
            const foreignKeyField = model.fields?.find(f =>
              f.name === rel.foreignKey ||
              f.foreignKey === true ||
              f.name.endsWith('_id')
            );

            // Find primary key field in target model (usually 'id')
            const targetPrimaryKey = targetModel.fields?.find(f =>
              f.primaryKey === true ||
              f.name === 'id'
            );

            // Determine connection points based on relationship type
            let sourceHandle, targetHandle;

            if (foreignKeyField) {
              // Connect from foreign key field
              sourceHandle = `${model.id}-${foreignKeyField.name}-right`;
            } else {
              // Fallback to right side of model
              sourceHandle = `${model.id}-bottom`;
            }

            if (targetPrimaryKey) {
              // Connect to primary key field
              targetHandle = `${targetModel.id}-${targetPrimaryKey.name}-left`;
            } else {
              // Fallback to left side of target model
              targetHandle = `${targetModel.id}-top`;
            }

            // Determine edge style based on relationship type
            const getEdgeStyle = (type) => {
              switch (type) {
                case 'hasMany':
                  return { stroke: '#10b981', strokeWidth: 2.5 };
                case 'hasOne':
                  return { stroke: '#3b82f6', strokeWidth: 2.5 };
                case 'belongsTo':
                  return { stroke: '#8b5cf6', strokeWidth: 2.5 };
                case 'manyToMany':
                  return { stroke: '#f59e0b', strokeWidth: 2.5 };
                default:
                  return { stroke: '#6b7280', strokeWidth: 2 };
              }
            };

            edges.push({
              id: `${model.id}-${targetModel.id}-${idx}`,
              source: model.id,
              target: targetModel.id,
              sourceHandle: sourceHandle,
              targetHandle: targetHandle,
              label: rel.type,
              type: 'smoothstep',
              animated: false,
              style: getEdgeStyle(rel.type),
              labelStyle: {
                fill: '#374151',
                fontWeight: 600,
                fontSize: 11,
                background: '#ffffff',
                padding: '4px 8px',
                borderRadius: '4px'
              },
              labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95 },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: getEdgeStyle(rel.type).stroke,
              }
            });
          }
        });
      }
    });

    return edges;
  }, [dataModels]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when dataModels change
  useEffect(() => {
    setNodes(initialNodes);
    setLayoutApplied(false); // Reset layout flag when nodes change
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Apply auto-layout on initial load
  useEffect(() => {
    if (nodes.length > 0 && edges.length > 0 && !layoutApplied) {
      // Apply layout after a short delay to ensure nodes are rendered
      const timer = setTimeout(() => {
        const direction = getOptimalDirection(nodes.length);
        const spacing = getOptimalSpacing(nodes, edges);

        const layoutedNodes = getLayoutedElements(nodes, edges, {
          direction,
          nodeWidth: 350,
          nodeHeight: 200,
          ...spacing,
        });

        setNodes(layoutedNodes);
        setLayoutApplied(true);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [nodes, edges, layoutApplied, setNodes]);

  const onConnect = useCallback((params) => {
    // We don't allow creating connections in this view
  }, []);

  // Auto-layout function
  const onLayout = useCallback((customDirection) => {
    const direction = customDirection || (layoutDirection === 'auto' ? getOptimalDirection(nodes.length) : layoutDirection);
    const spacing = getOptimalSpacing(nodes, edges);

    const layoutedNodes = getLayoutedElements(nodes, edges, {
      direction,
      nodeWidth: 350,
      nodeHeight: 200,
      ...spacing,
    });

    setNodes(layoutedNodes);
  }, [nodes, edges, layoutDirection, setNodes]);

  return (
    <div className="er-diagram-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        minZoom={0.3}
        maxZoom={1.5}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
        }}
      >
        <Background variant="dots" gap={20} color="#d1d5db" />
        <Controls />
        <MiniMap
          nodeColor="#e5e7eb"
          maskColor="rgba(0, 0, 0, 0.1)"
          style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
        />

        {/* Auto-layout Panel */}
        <Panel position="top-right" className="er-controls-panel">
          <div className="layout-controls">
            <button
              onClick={() => onLayout()}
              className="er-layout-btn"
              title="Auto-arrange diagram"
            >
              <Workflow size={16} />
              <span>Auto Layout</span>
            </button>
            <div className="layout-direction-btns">
              <button
                onClick={() => {
                  setLayoutDirection('TB');
                  onLayout('TB');
                }}
                className={`layout-dir-btn ${layoutDirection === 'TB' ? 'active' : ''}`}
                title="Top to Bottom layout"
              >
                ↓ Vertical
              </button>
              <button
                onClick={() => {
                  setLayoutDirection('LR');
                  onLayout('LR');
                }}
                className={`layout-dir-btn ${layoutDirection === 'LR' ? 'active' : ''}`}
                title="Left to Right layout"
              >
                → Horizontal
              </button>
            </div>
          </div>
        </Panel>
      </ReactFlow>

      {dataModels.length === 0 && (
        <div className="er-empty">
          <Database size={48} style={{ opacity: 0.3 }} />
          <p>No data models to display</p>
        </div>
      )}

      {/* Relationship Legend */}
      {dataModels.length > 0 && edges.length > 0 && (
        <div className="er-legend">
          <h4>Relationships</h4>
          <div className="er-legend-item">
            <div className="er-legend-color hasMany"></div>
            <span>hasMany</span>
          </div>
          <div className="er-legend-item">
            <div className="er-legend-color hasOne"></div>
            <span>hasOne</span>
          </div>
          <div className="er-legend-item">
            <div className="er-legend-color belongsTo"></div>
            <span>belongsTo</span>
          </div>
          <div className="er-legend-item">
            <div className="er-legend-color manyToMany"></div>
            <span>manyToMany</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ERDiagram;
