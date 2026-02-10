/**
 * Pipeline execution engine
 */

import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { Context } from '../models/context.js';
import { Checkpoint } from '../models/checkpoint.js';
import { StageStatus } from '../models/outcome.js';
import { EdgeSelector } from './edge-selector.js';
import { RetryPolicy, executeWithRetry } from './retry.js';
import { HandlerRegistry } from '../handlers/handler.js';
import { StartHandler } from '../handlers/start-handler.js';
import { ExitHandler } from '../handlers/exit-handler.js';
import { CodergenHandler } from '../handlers/codergen-handler.js';
import { ConditionalHandler } from '../handlers/conditional-handler.js';
import { ToolHandler } from '../handlers/tool-handler.js';
import { WaitForHumanHandler } from '../handlers/wait-human-handler.js';
import { AutoApproveInterviewer } from '../models/interviewer.js';

export class ExecutionEngine {
  constructor(config = {}) {
    this.config = config;
    this.registry = new HandlerRegistry();
    this.edgeSelector = new EdgeSelector();
    
    // Use provided interviewer or auto-approve by default
    const interviewer = config.interviewer || new AutoApproveInterviewer();
    
    // Register built-in handlers
    this.registry.register('start', new StartHandler());
    this.registry.register('exit', new ExitHandler());
    this.registry.register('codergen', new CodergenHandler(config.backend));
    this.registry.register('conditional', new ConditionalHandler());
    this.registry.register('tool', new ToolHandler());
    this.registry.register('wait.human', new WaitForHumanHandler(interviewer));
    
    // Set default handler
    this.registry.setDefault(new CodergenHandler(config.backend));
  }

  async run(graph, logsRoot) {
    // Initialize context
    const context = new Context();
    this.mirrorGraphAttributes(graph, context);

    // Initialize state
    const completedNodes = [];
    const nodeOutcomes = {};
    const retryCounts = {};

    // Create logs directory
    await mkdir(logsRoot, { recursive: true });

    // Find start node
    const startNode = graph.findStartNode();
    if (!startNode) {
      throw new Error('No start node found in graph');
    }

    let currentNode = startNode;

    // Main execution loop
    while (true) {
      // Step 1: Check for terminal node
      if (graph.isTerminalNode(currentNode)) {
        const [gateOk, failedGate] = this.checkGoalGates(graph, nodeOutcomes);
        if (!gateOk && failedGate) {
          const retryTarget = this.getRetryTarget(failedGate, graph);
          if (retryTarget) {
            currentNode = graph.getNode(retryTarget);
            continue;
          } else {
            throw new Error(`Goal gate unsatisfied for node ${failedGate.id} and no retry target`);
          }
        }
        break; // Exit the loop
      }

      // Step 2: Execute node handler with retry policy
      const handler = this.registry.resolve(currentNode);
      const retryPolicy = RetryPolicy.fromNode(currentNode, graph);
      const outcome = await executeWithRetry(
        handler,
        currentNode,
        context,
        graph,
        logsRoot,
        retryPolicy,
        retryCounts
      );

      // Step 3: Record completion
      completedNodes.push(currentNode.id);
      nodeOutcomes[currentNode.id] = outcome;

      // Step 4: Apply context updates
      context.applyUpdates(outcome.contextUpdates);
      context.set('outcome', outcome.status);
      if (outcome.preferredLabel) {
        context.set('preferred_label', outcome.preferredLabel);
      }

      // Step 5: Save checkpoint
      const checkpoint = new Checkpoint({
        currentNode: currentNode.id,
        completedNodes,
        nodeRetries: retryCounts,
        contextValues: context.snapshot(),
        logs: context.logs
      });
      await checkpoint.save(join(logsRoot, 'checkpoint.json'));

      // Step 6: Select next edge
      const nextEdge = this.edgeSelector.selectEdge(currentNode, outcome, context, graph);
      
      if (!nextEdge) {
        if (outcome.status === StageStatus.FAIL) {
          throw new Error(`Stage ${currentNode.id} failed with no outgoing fail edge`);
        }
        break; // No more edges, exit
      }

      // Step 7: Handle loop_restart (not implemented in minimal version)
      // if (nextEdge.attrs.loop_restart) { ... }

      // Step 8: Advance to next node
      const nextNodeId = nextEdge.to;
      currentNode = graph.getNode(nextNodeId);
      
      if (!currentNode) {
        throw new Error(`Next node ${nextNodeId} not found in graph`);
      }
    }

    // Finalize
    await this.writeManifest(logsRoot, graph);
    
    return {
      status: 'completed',
      completedNodes,
      nodeOutcomes
    };
  }

  mirrorGraphAttributes(graph, context) {
    // Mirror graph attributes into context
    for (const [key, value] of Object.entries(graph.attrs)) {
      context.set(`graph.${key}`, value);
    }
  }

  checkGoalGates(graph, nodeOutcomes) {
    for (const [nodeId, outcome] of Object.entries(nodeOutcomes)) {
      const node = graph.getNode(nodeId);
      if (node && node.attrs.goal_gate) {
        if (outcome.status !== StageStatus.SUCCESS && 
            outcome.status !== StageStatus.PARTIAL_SUCCESS) {
          return [false, node];
        }
      }
    }
    return [true, null];
  }

  getRetryTarget(node, graph) {
    // Try node retry_target first
    if (node.attrs.retry_target) {
      return node.attrs.retry_target;
    }
    // Try node fallback_retry_target
    if (node.attrs.fallback_retry_target) {
      return node.attrs.fallback_retry_target;
    }
    // Try graph-level retry_target
    if (graph.attrs.retry_target) {
      return graph.attrs.retry_target;
    }
    // Try graph-level fallback_retry_target
    if (graph.attrs.fallback_retry_target) {
      return graph.attrs.fallback_retry_target;
    }
    return null;
  }

  async writeManifest(logsRoot, graph) {
    const manifest = {
      name: graph.name,
      goal: graph.attrs.goal || '',
      startTime: new Date().toISOString()
    };
    await writeFile(
      join(logsRoot, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );
  }
}
