/**
 * Graph model - represents parsed DOT graph structure
 */

export class Graph {
  constructor(name = '') {
    this.name = name;
    this.attrs = {};
    this.nodes = new Map();
    this.edges = [];
  }

  addNode(id, attrs = {}) {
    const node = new Node(id, attrs);
    this.nodes.set(id, node);
    return node;
  }

  getNode(id) {
    return this.nodes.get(id);
  }

  addEdge(fromId, toId, attrs = {}) {
    const edge = new Edge(fromId, toId, attrs);
    this.edges.push(edge);
    return edge;
  }

  getOutgoingEdges(nodeId) {
    return this.edges.filter(e => e.from === nodeId);
  }

  getIncomingEdges(nodeId) {
    return this.edges.filter(e => e.to === nodeId);
  }

  findStartNode() {
    // Look for shape=Mdiamond first
    for (const node of this.nodes.values()) {
      if (node.attrs.shape === 'Mdiamond') {
        return node;
      }
    }
    // Fallback to id="start" or "Start"
    return this.nodes.get('start') || this.nodes.get('Start');
  }

  findExitNode() {
    // Look for shape=Msquare first
    for (const node of this.nodes.values()) {
      if (node.attrs.shape === 'Msquare') {
        return node;
      }
    }
    // Fallback to id="exit" or "Exit"
    return this.nodes.get('exit') || this.nodes.get('Exit');
  }

  isTerminalNode(node) {
    return node.attrs.shape === 'Msquare' || 
           node.id === 'exit' || 
           node.id === 'Exit';
  }
}

export class Node {
  constructor(id, attrs = {}) {
    this.id = id;
    this.attrs = {
      label: attrs.label || id,
      shape: attrs.shape || 'box',
      type: attrs.type || '',
      prompt: attrs.prompt || '',
      max_retries: attrs.max_retries !== undefined ? parseInt(attrs.max_retries) : 0,
      goal_gate: attrs.goal_gate === 'true' || attrs.goal_gate === true,
      retry_target: attrs.retry_target || '',
      fallback_retry_target: attrs.fallback_retry_target || '',
      timeout: attrs.timeout || '',
      auto_status: attrs.auto_status === 'true' || attrs.auto_status === true,
      allow_partial: attrs.allow_partial === 'true' || attrs.allow_partial === true,
      ...attrs
    };
  }
}

export class Edge {
  constructor(from, to, attrs = {}) {
    this.from = from;
    this.to = to;
    this.attrs = {
      label: attrs.label || '',
      condition: attrs.condition || '',
      weight: attrs.weight !== undefined ? parseInt(attrs.weight) : 0,
      ...attrs
    };
  }
}
