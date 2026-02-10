/**
 * Conditional handler - no-op routing point
 * Actual routing is handled by edge selection algorithm
 */

import { Handler } from './handler.js';
import { Outcome, StageStatus } from '../models/outcome.js';

export class ConditionalHandler extends Handler {
  async execute(node, context, graph, logsRoot) {
    return new Outcome({
      status: StageStatus.SUCCESS,
      notes: `Conditional node evaluated: ${node.id}`
    });
  }
}
