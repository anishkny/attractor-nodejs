/**
 * Codergen handler - LLM task executor (default handler)
 */

import { Handler } from './handler.js';
import { Outcome, StageStatus } from '../models/outcome.js';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

export class CodergenHandler extends Handler {
  constructor(backend = null) {
    super();
    this.backend = backend;
  }

  async execute(node, context, graph, logsRoot) {
    // 1. Build prompt
    let prompt = node.attrs.prompt;
    if (!prompt) {
      prompt = node.attrs.label;
    }
    prompt = this.expandVariables(prompt, graph, context);

    // 2. Create stage directory and write prompt
    const stageDir = join(logsRoot, node.id);
    await mkdir(stageDir, { recursive: true });
    await writeFile(join(stageDir, 'prompt.md'), prompt, 'utf-8');

    // 3. Call LLM backend
    let responseText;
    if (this.backend) {
      try {
        const result = await this.backend.run(node, prompt, context);
        if (result instanceof Outcome) {
          await this.writeStatus(stageDir, result);
          return result;
        }
        responseText = String(result);
      } catch (error) {
        return new Outcome({
          status: StageStatus.FAIL,
          failureReason: error.message
        });
      }
    } else {
      // Simulation mode
      responseText = `[Simulated] Response for stage: ${node.id}`;
    }

    // 4. Write response
    await writeFile(join(stageDir, 'response.md'), responseText, 'utf-8');

    // 5. Create and write outcome
    const outcome = new Outcome({
      status: StageStatus.SUCCESS,
      notes: `Stage completed: ${node.id}`,
      contextUpdates: {
        'last_stage': node.id,
        'last_response': this.truncate(responseText, 200)
      }
    });

    await this.writeStatus(stageDir, outcome);
    return outcome;
  }

  expandVariables(text, graph, context) {
    // Simple variable expansion for $goal
    let result = text;
    if (graph.attrs.goal) {
      result = result.replace(/\$goal/g, graph.attrs.goal);
    }
    return result;
  }

  truncate(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  async writeStatus(stageDir, outcome) {
    const statusPath = join(stageDir, 'status.json');
    await writeFile(statusPath, JSON.stringify(outcome.toJSON(), null, 2), 'utf-8');
  }
}
