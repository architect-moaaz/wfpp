import React, { useState, useEffect, useRef } from 'react';
import { GitBranch, Zap, AlertCircle, TrendingUp } from 'lucide-react';
import './RuleGraphVisualizer.css';

const RuleGraphVisualizer = ({ graph, executionOrder, statistics }) => {
  const svgRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [viewMode, setViewMode] = useState('graph'); // 'graph' or 'levels'

  useEffect(() => {
    if (graph && viewMode === 'graph') {
      renderGraph();
    }
  }, [graph, viewMode]);

  const renderGraph = () => {
    if (!graph || !graph.nodes || !svgRef.current) return;

    const svg = svgRef.current;
    const width = svg.clientWidth;
    const height = svg.clientHeight;

    // Calculate node positions based on levels
    const levelGroups = {};
    graph.nodes.forEach(node => {
      if (!levelGroups[node.level]) {
        levelGroups[node.level] = [];
      }
      levelGroups[node.level].push(node);
    });

    const maxLevel = Math.max(...Object.keys(levelGroups).map(Number));
    const levelWidth = width / (maxLevel + 2);
    const nodePositions = {};

    Object.entries(levelGroups).forEach(([level, nodes]) => {
      const levelHeight = height / (nodes.length + 1);
      nodes.forEach((node, index) => {
        nodePositions[node.id] = {
          x: levelWidth * (parseInt(level) + 1),
          y: levelHeight * (index + 1),
          level: parseInt(level)
        };
      });
    });

    return { nodePositions, levelGroups };
  };

  const handleNodeClick = (node) => {
    setSelectedNode(selectedNode?.id === node.id ? null : node);
  };

  const getNodeColor = (type) => {
    const colors = {
      validation: '#111827',
      decision: '#374151',
      transformation: '#6b7280',
      notification: '#9ca3af',
      automation: '#4b5563'
    };
    return colors[type] || '#111827';
  };

  const renderGraphView = () => {
    if (!graph || !graph.nodes) {
      return (
        <div className="graph-empty-state">
          <GitBranch size={48} />
          <p>No rule dependencies to visualize</p>
        </div>
      );
    }

    const graphData = renderGraph();
    if (!graphData) return null;

    const { nodePositions } = graphData;

    return (
      <div className="graph-container">
        <svg ref={svgRef} className="graph-svg">
          {/* Render edges */}
          {graph.edges && graph.edges.map((edge, index) => {
            const source = nodePositions[edge.source];
            const target = nodePositions[edge.target];

            if (!source || !target) return null;

            return (
              <g key={`edge-${index}`}>
                <defs>
                  <marker
                    id={`arrowhead-${index}`}
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill="#9ca3af" />
                  </marker>
                </defs>
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke="#d1d5db"
                  strokeWidth="2"
                  markerEnd={`url(#arrowhead-${index})`}
                />
              </g>
            );
          })}

          {/* Render nodes */}
          {graph.nodes.map((node) => {
            const pos = nodePositions[node.id];
            if (!pos) return null;

            const isSelected = selectedNode?.id === node.id;

            return (
              <g
                key={node.id}
                onClick={() => handleNodeClick(node)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isSelected ? 32 : 28}
                  fill={getNodeColor(node.type)}
                  stroke={isSelected ? '#6b7280' : '#e5e7eb'}
                  strokeWidth={isSelected ? 3 : 2}
                />
                <text
                  x={pos.x}
                  y={pos.y + 5}
                  textAnchor="middle"
                  fill="white"
                  fontSize="12"
                  fontWeight="600"
                >
                  {node.priority || 0}
                </text>
                <text
                  x={pos.x}
                  y={pos.y + 45}
                  textAnchor="middle"
                  fill="#374151"
                  fontSize="11"
                  fontWeight="500"
                >
                  {node.name.length > 15 ? node.name.substring(0, 15) + '...' : node.name}
                </text>
              </g>
            );
          })}
        </svg>

        {selectedNode && (
          <div className="node-details-panel">
            <div className="node-details-header">
              <h4>{selectedNode.name}</h4>
              <span className="node-type-badge">{selectedNode.type}</span>
            </div>
            <div className="node-details-body">
              <div className="node-detail-item">
                <span className="detail-label">Priority:</span>
                <span className="detail-value">{selectedNode.priority || 0}</span>
              </div>
              <div className="node-detail-item">
                <span className="detail-label">Execution Level:</span>
                <span className="detail-value">{selectedNode.level}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderLevelsView = () => {
    if (!executionOrder || executionOrder.length === 0) {
      return (
        <div className="graph-empty-state">
          <Zap size={48} />
          <p>No execution order available</p>
        </div>
      );
    }

    return (
      <div className="levels-container">
        {executionOrder.map((level, index) => (
          <div key={index} className="execution-level">
            <div className="level-header">
              <div className="level-indicator">
                <span className="level-number">Level {level.level}</span>
                {level.parallel && (
                  <span className="parallel-badge">
                    <Zap size={12} />
                    Parallel
                  </span>
                )}
              </div>
              <span className="rule-count">{level.rules.length} rules</span>
            </div>
            <div className="level-rules">
              {level.rules.map(ruleId => {
                const rule = graph?.nodes?.find(n => n.id === ruleId);
                if (!rule) return null;

                return (
                  <div
                    key={ruleId}
                    className="level-rule-card"
                    onClick={() => handleNodeClick(rule)}
                  >
                    <div className="rule-card-header">
                      <div
                        className="rule-priority-badge"
                        style={{ backgroundColor: getNodeColor(rule.type) }}
                      >
                        {rule.priority || 0}
                      </div>
                      <span className="rule-card-name">{rule.name}</span>
                    </div>
                    <span className="rule-card-type">{rule.type}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderStatistics = () => {
    if (!statistics) return null;

    return (
      <div className="graph-statistics">
        <div className="stat-item">
          <GitBranch size={16} />
          <div>
            <span className="stat-value">{statistics.totalRules || 0}</span>
            <span className="stat-label">Total Rules</span>
          </div>
        </div>

        <div className="stat-item">
          <Zap size={16} />
          <div>
            <span className="stat-value">{statistics.totalLevels || 0}</span>
            <span className="stat-label">Execution Levels</span>
          </div>
        </div>

        {statistics.hasCycles && (
          <div className="stat-item warning">
            <AlertCircle size={16} />
            <div>
              <span className="stat-value">{statistics.cycles?.length || 0}</span>
              <span className="stat-label">Circular Dependencies</span>
            </div>
          </div>
        )}

        {statistics.criticalPathLength > 0 && (
          <div className="stat-item">
            <TrendingUp size={16} />
            <div>
              <span className="stat-value">{statistics.criticalPathLength}</span>
              <span className="stat-label">Critical Path Length</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rule-graph-visualizer">
      <div className="visualizer-header">
        <h3>Rule Dependency Graph</h3>
        <div className="view-mode-toggle">
          <button
            className={`toggle-btn ${viewMode === 'graph' ? 'active' : ''}`}
            onClick={() => setViewMode('graph')}
          >
            Graph View
          </button>
          <button
            className={`toggle-btn ${viewMode === 'levels' ? 'active' : ''}`}
            onClick={() => setViewMode('levels')}
          >
            Levels View
          </button>
        </div>
      </div>

      {renderStatistics()}

      <div className="visualizer-content">
        {viewMode === 'graph' ? renderGraphView() : renderLevelsView()}
      </div>

      {statistics?.hasCycles && statistics.cycles && statistics.cycles.length > 0 && (
        <div className="cycles-warning">
          <AlertCircle size={20} />
          <div>
            <strong>Circular Dependencies Detected</strong>
            <p>
              {statistics.cycles.length} circular dependencies found. Rules with circular
              dependencies cannot be executed safely.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RuleGraphVisualizer;
