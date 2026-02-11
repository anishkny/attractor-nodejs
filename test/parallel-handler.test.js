/**
 * Tests for parallel handlers
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ParallelHandler } from '../src/handlers/parallel-handler.js';
import { ParallelFanInHandler } from '../src/handlers/parallel-fan-in-handler.js';
import { Graph } from '../src/models/graph.js';
import { Context } from '../src/models/context.js';
import { StageStatus } from '../src/models/outcome.js';

describe('ParallelHandler', () => {
  it('marks parallel fan-out with multiple branches', async () => {
    const handler = new ParallelHandler();
    const graph = new Graph('test');
    
    // Create a fan-out node with 3 branches
    graph.addNode('fan_out', { shape: 'component' });
    graph.addNode('branch_a');
    graph.addNode('branch_b');
    graph.addNode('branch_c');
    graph.addEdge('fan_out', 'branch_a');
    graph.addEdge('fan_out', 'branch_b');
    graph.addEdge('fan_out', 'branch_c');
    
    const node = graph.getNode('fan_out');
    const context = new Context();
    
    const outcome = await handler.execute(node, context, graph, './logs');
    
    assert.strictEqual(outcome.status, StageStatus.SUCCESS);
    assert.strictEqual(outcome.contextUpdates['parallel.active'], true);
    assert.strictEqual(outcome.contextUpdates['parallel.branch_count'], 3);
    assert.strictEqual(outcome.contextUpdates['parallel.source'], 'fan_out');
  });

  it('fails when fan-out has no branches', async () => {
    const handler = new ParallelHandler();
    const graph = new Graph('test');
    
    graph.addNode('fan_out', { shape: 'component' });
    
    const node = graph.getNode('fan_out');
    const context = new Context();
    
    const outcome = await handler.execute(node, context, graph, './logs');
    
    assert.strictEqual(outcome.status, StageStatus.FAIL);
    assert.ok(outcome.notes.includes('no outgoing edges'));
  });
});

describe('ParallelFanInHandler', () => {
  it('marks end of parallel region', async () => {
    const handler = new ParallelFanInHandler();
    const graph = new Graph('test');
    
    graph.addNode('fan_in', { shape: 'tripleoctagon' });
    
    const node = graph.getNode('fan_in');
    const context = new Context();
    
    // Simulate active parallel region
    context.set('parallel.active', true);
    context.set('parallel.source', 'fan_out');
    context.set('parallel.branch_count', 3);
    
    const outcome = await handler.execute(node, context, graph, './logs');
    
    assert.strictEqual(outcome.status, StageStatus.SUCCESS);
    assert.strictEqual(outcome.contextUpdates['parallel.active'], false);
    assert.strictEqual(outcome.contextUpdates['parallel.source'], '');
    assert.strictEqual(outcome.contextUpdates['parallel.branch_count'], 0);
  });

  it('handles no active parallel region gracefully', async () => {
    const handler = new ParallelFanInHandler();
    const graph = new Graph('test');
    
    graph.addNode('fan_in', { shape: 'tripleoctagon' });
    
    const node = graph.getNode('fan_in');
    const context = new Context();
    
    const outcome = await handler.execute(node, context, graph, './logs');
    
    assert.strictEqual(outcome.status, StageStatus.SUCCESS);
    assert.ok(outcome.notes.includes('no active parallel region'));
  });
});
