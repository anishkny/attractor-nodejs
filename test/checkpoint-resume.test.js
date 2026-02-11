/**
 * Tests for checkpoint resume functionality
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { ExecutionEngine } from '../src/engine/execution-engine.js';
import { parseDot } from '../src/parser/dot-parser.js';
import { Checkpoint } from '../src/models/checkpoint.js';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';

describe('Checkpoint Resume', () => {
  const testLogsDir = '/tmp/checkpoint-test-logs';

  beforeEach(async () => {
    // Create test logs directory
    await mkdir(testLogsDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test logs directory
    await rm(testLogsDir, { recursive: true, force: true });
  });

  it('resumes execution from a checkpoint', async () => {
    // Create a simple 3-node pipeline
    const dotSource = `
      digraph ResumeTest {
        start [shape=Mdiamond]
        exit [shape=Msquare]
        task1 [label="Task 1"]
        task2 [label="Task 2"]
        task3 [label="Task 3"]
        
        start -> task1 -> task2 -> task3 -> exit
      }
    `;
    
    const graph = parseDot(dotSource);
    
    // Create a checkpoint as if task1 was completed
    const checkpoint = new Checkpoint({
      currentNode: 'task1',
      completedNodes: ['start', 'task1'],
      nodeRetries: {},
      contextValues: {
        'graph.goal': '',
        'outcome': 'success'
      },
      logs: ['Started pipeline', 'Completed task1']
    });
    
    await checkpoint.save(join(testLogsDir, 'checkpoint.json'));
    
    // Resume execution
    const engine = new ExecutionEngine();
    const result = await engine.resume(graph, testLogsDir);
    
    // Verify the result
    assert.strictEqual(result.status, 'completed');
    assert.strictEqual(result.resumed, true);
    
    // Should have completed the remaining nodes
    assert.ok(result.completedNodes.includes('task2'));
    assert.ok(result.completedNodes.includes('task3'));
    
    // Original nodes from checkpoint should still be there
    assert.ok(result.completedNodes.includes('start'));
    assert.ok(result.completedNodes.includes('task1'));
  });

  it('handles already-completed checkpoint', async () => {
    const dotSource = `
      digraph SimpleTest {
        start [shape=Mdiamond]
        exit [shape=Msquare]
        task1 [label="Task 1"]
        
        start -> task1 -> exit
      }
    `;
    
    const graph = parseDot(dotSource);
    
    // Create a checkpoint where everything is complete
    const checkpoint = new Checkpoint({
      currentNode: 'task1',
      completedNodes: ['start', 'task1'],
      nodeRetries: {},
      contextValues: {
        'outcome': 'success'
      },
      logs: []
    });
    
    await checkpoint.save(join(testLogsDir, 'checkpoint.json'));
    
    // Resume execution
    const engine = new ExecutionEngine();
    const result = await engine.resume(graph, testLogsDir);
    
    // Should complete successfully
    assert.strictEqual(result.status, 'completed');
    assert.strictEqual(result.resumed, true);
  });

  it('preserves context from checkpoint', async () => {
    const dotSource = `
      digraph ContextTest {
        start [shape=Mdiamond]
        exit [shape=Msquare]
        task1 [label="Task 1"]
        task2 [label="Task 2"]
        
        start -> task1 -> task2 -> exit
      }
    `;
    
    const graph = parseDot(dotSource);
    
    // Create checkpoint with custom context values
    const checkpoint = new Checkpoint({
      currentNode: 'task1',
      completedNodes: ['start', 'task1'],
      nodeRetries: {},
      contextValues: {
        'custom_key': 'custom_value',
        'counter': 42,
        'outcome': 'success'
      },
      logs: ['Log entry 1']
    });
    
    await checkpoint.save(join(testLogsDir, 'checkpoint.json'));
    
    // Resume and complete
    const engine = new ExecutionEngine();
    const result = await engine.resume(graph, testLogsDir);
    
    assert.strictEqual(result.status, 'completed');
    
    // Load the final checkpoint to verify context was preserved
    const finalCheckpoint = await Checkpoint.load(join(testLogsDir, 'checkpoint.json'));
    assert.strictEqual(finalCheckpoint.contextValues['custom_key'], 'custom_value');
    assert.strictEqual(finalCheckpoint.contextValues['counter'], 42);
  });
});
