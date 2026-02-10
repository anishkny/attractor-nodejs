/**
 * Base handler interface for node execution
 */

export class Handler {
  /**
   * Execute a node and return an outcome
   * @param {Node} node - The node to execute
   * @param {Context} context - The shared context
   * @param {Graph} graph - The full graph
   * @param {string} logsRoot - Path to logs directory
   * @returns {Promise<Outcome>} The execution outcome
   */
  async execute(node, context, graph, logsRoot) {
    throw new Error('Handler.execute must be implemented by subclass');
  }
}

/**
 * Handler registry - maps type strings to handler instances
 */
export class HandlerRegistry {
  constructor() {
    this.handlers = new Map();
    this.defaultHandler = null;
    this.shapeToType = {
      'Mdiamond': 'start',
      'Msquare': 'exit',
      'box': 'codergen',
      'hexagon': 'wait.human',
      'diamond': 'conditional',
      'component': 'parallel',
      'tripleoctagon': 'parallel.fan_in',
      'parallelogram': 'tool',
      'house': 'stack.manager_loop'
    };
  }

  register(type, handler) {
    this.handlers.set(type, handler);
  }

  setDefault(handler) {
    this.defaultHandler = handler;
  }

  resolve(node) {
    // 1. Explicit type attribute
    if (node.attrs.type && this.handlers.has(node.attrs.type)) {
      return this.handlers.get(node.attrs.type);
    }

    // 2. Shape-based resolution
    const handlerType = this.shapeToType[node.attrs.shape];
    if (handlerType && this.handlers.has(handlerType)) {
      return this.handlers.get(handlerType);
    }

    // 3. Default handler
    if (this.defaultHandler) {
      return this.defaultHandler;
    }

    throw new Error(`No handler found for node ${node.id} (shape: ${node.attrs.shape}, type: ${node.attrs.type})`);
  }
}
