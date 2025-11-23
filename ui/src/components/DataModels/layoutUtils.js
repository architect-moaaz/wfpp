import dagre from 'dagre';

/**
 * Auto-layout nodes using Dagre algorithm
 * @param {Array} nodes - ReactFlow nodes
 * @param {Array} edges - ReactFlow edges
 * @param {Object} options - Layout options
 * @returns {Array} - Nodes with updated positions
 */
export const getLayoutedElements = (nodes, edges, options = {}) => {
  const {
    direction = 'TB', // TB = top to bottom, LR = left to right
    nodeWidth = 350,
    nodeHeight = 200,
    rankSep = 150, // Vertical spacing between ranks
    nodeSep = 100, // Horizontal spacing between nodes
    marginX = 50,
    marginY = 50,
  } = options;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Set graph configuration
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: rankSep,
    nodesep: nodeSep,
    marginx: marginX,
    marginy: marginY,
  });

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: nodeWidth,
      height: nodeHeight,
    });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Run the layout algorithm
  dagre.layout(dagreGraph);

  // Update node positions
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return layoutedNodes;
};

/**
 * Get layout direction based on number of nodes
 * @param {number} nodeCount - Number of nodes
 * @returns {string} - Layout direction
 */
export const getOptimalDirection = (nodeCount) => {
  // For small diagrams, top-to-bottom works well
  // For larger diagrams, left-to-right provides better readability
  return nodeCount <= 6 ? 'TB' : 'LR';
};

/**
 * Calculate optimal spacing based on diagram complexity
 * @param {Array} nodes - ReactFlow nodes
 * @param {Array} edges - ReactFlow edges
 * @returns {Object} - Spacing options
 */
export const getOptimalSpacing = (nodes, edges) => {
  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  const complexity = edgeCount / Math.max(nodeCount, 1);

  // More complex diagrams need more spacing
  if (complexity > 2) {
    return {
      rankSep: 200,
      nodeSep: 150,
    };
  } else if (complexity > 1) {
    return {
      rankSep: 150,
      nodeSep: 100,
    };
  } else {
    return {
      rankSep: 120,
      nodeSep: 80,
    };
  }
};
