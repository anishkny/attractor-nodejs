/**
 * Tool handler - executes external commands
 */

import { Handler } from './handler.js';
import { Outcome, StageStatus } from '../models/outcome.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { parseDuration } from '../utils/helpers.js';

const execAsync = promisify(exec);

export class ToolHandler extends Handler {
  async execute(node, context, graph, logsRoot) {
    const command = node.attrs.tool_command;
    
    if (!command) {
      return new Outcome({
        status: StageStatus.FAIL,
        failureReason: 'No tool_command specified'
      });
    }

    try {
      // Parse timeout if specified
      const timeoutMs = node.attrs.timeout ? parseDuration(node.attrs.timeout) : 30000;
      
      // Execute command
      const { stdout, stderr } = await execAsync(command, {
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024 // 10MB
      });

      return new Outcome({
        status: StageStatus.SUCCESS,
        contextUpdates: {
          'tool.output': stdout.trim(),
          'tool.stderr': stderr.trim()
        },
        notes: `Tool completed: ${command}`
      });

    } catch (error) {
      return new Outcome({
        status: StageStatus.FAIL,
        failureReason: error.message,
        contextUpdates: {
          'tool.error': error.message
        }
      });
    }
  }
}
