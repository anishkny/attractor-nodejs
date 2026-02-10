/**
 * Tests for tool handler
 */

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ExecutionEngine } from '../src/engine/execution-engine.js';
import { parseDot } from '../src/parser/dot-parser.js';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

test('ToolHandler - echo command', async () => {
  const dot = `
    digraph ToolTest {
      start [shape=Mdiamond]
      task [shape=parallelogram, type="tool", tool_command="echo 'test output'"]
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
    const taskOutcome = result.nodeOutcomes['task'];
    assert.equal(taskOutcome.status, 'success');
    assert.equal(taskOutcome.contextUpdates['tool.output'], 'test output');
  } finally {
    await rm(logsDir, { recursive: true, force: true });
  }
});

test('ToolHandler - failing command', async () => {
  const dot = `
    digraph ToolTest {
      start [shape=Mdiamond]
      task [shape=parallelogram, type="tool", tool_command="sh -c 'exit 1'"]
      exit [shape=Msquare]
      start -> task -> exit
    }
  `;

  const graph = parseDot(dot);
  const engine = new ExecutionEngine();
  
  const logsDir = await mkdtemp(join(tmpdir(), 'attractor-test-'));
  
  try {
    // Should throw because task fails and has no fail edge, but follows unconditional edge
    // Actually it will complete but task outcome will be fail
    const result = await engine.run(graph, logsDir);
    assert.equal(result.nodeOutcomes['task'].status, 'fail');
  } finally {
    await rm(logsDir, { recursive: true, force: true });
  }
});
