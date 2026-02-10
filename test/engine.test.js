/**
 * Tests for execution engine
 */

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ExecutionEngine } from '../src/engine/execution-engine.js';
import { parseDot } from '../src/parser/dot-parser.js';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

test('ExecutionEngine - simple linear flow', async () => {
  const dot = `
    digraph Simple {
      start [shape=Mdiamond]
      task [label="Task"]
      exit [shape=Msquare]
      start -> task -> exit
    }
  `;

  const graph = parseDot(dot);
  const engine = new ExecutionEngine();
  
  const logsDir = await mkdtemp(join(tmpdir(), 'attractor-test-'));
  
  try {
    const result = await engine.run(graph, logsDir);
    
    assert.equal(result.status, 'completed');
    assert.deepEqual(result.completedNodes, ['start', 'task']);
  } finally {
    await rm(logsDir, { recursive: true, force: true });
  }
});

test('ExecutionEngine - finds start and exit nodes', async () => {
  const dot = `
    digraph Test {
      start [shape=Mdiamond]
      exit [shape=Msquare]
      start -> exit
    }
  `;

  const graph = parseDot(dot);
  
  const startNode = graph.findStartNode();
  assert.equal(startNode.id, 'start');
  
  const exitNode = graph.findExitNode();
  assert.equal(exitNode.id, 'exit');
});

test('ExecutionEngine - edge selection by weight', async () => {
  const dot = `
    digraph Test {
      start [shape=Mdiamond]
      gate [shape=diamond]
      a [label="A"]
      b [label="B"]
      exit [shape=Msquare]
      
      start -> gate
      gate -> a [weight=5]
      gate -> b [weight=10]
      a -> exit
      b -> exit
    }
  `;

  const graph = parseDot(dot);
  const engine = new ExecutionEngine();
  
  const logsDir = await mkdtemp(join(tmpdir(), 'attractor-test-'));
  
  try {
    const result = await engine.run(graph, logsDir);
    
    // Should take higher weight edge (b)
    assert.ok(result.completedNodes.includes('b'));
  } finally {
    await rm(logsDir, { recursive: true, force: true });
  }
});
