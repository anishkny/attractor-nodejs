/**
 * Checkpoint - serializable snapshot of execution state
 */

import { writeFile, readFile } from 'fs/promises';

export class Checkpoint {
  constructor({
    timestamp = new Date(),
    currentNode = '',
    completedNodes = [],
    nodeRetries = {},
    contextValues = {},
    logs = []
  } = {}) {
    this.timestamp = timestamp;
    this.currentNode = currentNode;
    this.completedNodes = completedNodes;
    this.nodeRetries = nodeRetries;
    this.contextValues = contextValues;
    this.logs = logs;
  }

  async save(path) {
    const data = {
      timestamp: this.timestamp.toISOString(),
      currentNode: this.currentNode,
      completedNodes: this.completedNodes,
      nodeRetries: this.nodeRetries,
      context: this.contextValues,
      logs: this.logs
    };
    await writeFile(path, JSON.stringify(data, null, 2), 'utf-8');
  }

  static async load(path) {
    const content = await readFile(path, 'utf-8');
    const data = JSON.parse(content);
    return new Checkpoint({
      timestamp: new Date(data.timestamp),
      currentNode: data.currentNode,
      completedNodes: data.completedNodes,
      nodeRetries: data.nodeRetries,
      contextValues: data.context,
      logs: data.logs
    });
  }

  toJSON() {
    return {
      timestamp: this.timestamp.toISOString(),
      currentNode: this.currentNode,
      completedNodes: this.completedNodes,
      nodeRetries: this.nodeRetries,
      contextValues: this.contextValues,
      logs: this.logs
    };
  }
}
