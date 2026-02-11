/**
 * Parallel fan-in handler - marks convergence point of parallel execution branches
 * 
 * In this implementation, this is primarily a marker node that indicates
 * all parallel branches should be complete before proceeding.
 */

import { Handler } from './handler.js';
import { Outcome, StageStatus } from '../models/outcome.js';

export class ParallelFanInHandler extends Handler {
  async execute(node, context, graph, logsRoot) {
    // Check if we're in a parallel region
    const parallelActive = context.get('parallel.active');
    
    if (!parallelActive) {
      // Not in a parallel region, just pass through
      return new Outcome({
        status: StageStatus.SUCCESS,
        notes: `Fan-in node ${node.id}: no active parallel region`
      });
    }

    // Clear parallel tracking state
    return new Outcome({
      status: StageStatus.SUCCESS,
      notes: `Fan-in node ${node.id}: parallel branches converged`,
      contextUpdates: {
        'parallel.active': false,
        'parallel.source': '',
        'parallel.branch_count': 0
      }
    });
  }
}
