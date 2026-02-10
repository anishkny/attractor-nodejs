/**
 * Start handler - no-op entry point
 */

import { Handler } from './handler.js';
import { Outcome, StageStatus } from '../models/outcome.js';

export class StartHandler extends Handler {
  async execute(node, context, graph, logsRoot) {
    return new Outcome({
      status: StageStatus.SUCCESS,
      notes: 'Pipeline started'
    });
  }
}
