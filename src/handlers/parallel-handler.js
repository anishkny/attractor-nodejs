/**
 * Parallel fan-out handler - marks the start of parallel execution branches
 * 
 * In this implementation, branches are executed sequentially but tracked as parallel.
 * The engine will execute the first available branch, and subsequent branches will
 * be executed in order until all converge at a fan-in node.
 */

import { Handler } from './handler.js';
import { Outcome, StageStatus } from '../models/outcome.js';

export class ParallelHandler extends Handler {
  async execute(node, context, graph, logsRoot) {
    // Get all outgoing edges - these define the parallel branches
    const branches = graph.getOutgoingEdges(node.id);
    
    if (branches.length === 0) {
      return new Outcome({
        status: StageStatus.FAIL,
        notes: `Parallel fan-out node ${node.id} has no outgoing edges`,
        failureReason: 'No branches to execute'
      });
    }

    // Store the branch targets in context
    const branchTargets = branches.map(edge => edge.to);
    
    // Note: The engine will select one edge to follow. This is just a marker node.
    return new Outcome({
      status: StageStatus.SUCCESS,
      notes: `Parallel fan-out: ${branches.length} branches available`,
      contextUpdates: {
        'parallel.active': true,
        'parallel.source': node.id,
        'parallel.branch_count': branches.length
      }
    });
  }
}
