/**
 * Tests for wait-human handler
 */

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ExecutionEngine } from '../src/engine/execution-engine.js';
import { parseDot } from '../src/parser/dot-parser.js';
import { QueueInterviewer, Answer } from '../src/models/interviewer.js';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

test('WaitForHumanHandler - auto approve', async () => {
  const dot = `
    digraph HumanTest {
      start [shape=Mdiamond]
      gate [shape=hexagon, type="wait.human", label="Approve?"]
      yes [label="Yes path"]
      no [label="No path"]
      exit [shape=Msquare]
      
      start -> gate
      gate -> yes [label="[Y] Yes"]
      gate -> no [label="[N] No"]
      yes -> exit
      no -> exit
    }
  `;

  const graph = parseDot(dot);
  // Default auto-approve interviewer should pick first option
  const engine = new ExecutionEngine();
  
  const logsDir = await mkdtemp(join(tmpdir(), 'attractor-test-'));
  
  try {
    const result = await engine.run(graph, logsDir);
    
    assert.equal(result.status, 'completed');
    assert.ok(result.completedNodes.includes('yes'));
  } finally {
    await rm(logsDir, { recursive: true, force: true });
  }
});

test('WaitForHumanHandler - queue interviewer', async () => {
  const dot = `
    digraph HumanTest {
      start [shape=Mdiamond]
      gate [shape=hexagon, type="wait.human", label="Select option"]
      option_a [label="Option A"]
      option_b [label="Option B"]
      exit [shape=Msquare]
      
      start -> gate
      gate -> option_a [label="[A] Option A"]
      gate -> option_b [label="[B] Option B"]
      option_a -> exit
      option_b -> exit
    }
  `;

  const graph = parseDot(dot);
  
  // Pre-fill answer queue with selection for option B
  const interviewer = new QueueInterviewer([
    new Answer({ value: 'B' })
  ]);
  
  const engine = new ExecutionEngine({ interviewer });
  
  const logsDir = await mkdtemp(join(tmpdir(), 'attractor-test-'));
  
  try {
    const result = await engine.run(graph, logsDir);
    
    assert.equal(result.status, 'completed');
    assert.ok(result.completedNodes.includes('option_b'));
    assert.ok(!result.completedNodes.includes('option_a'));
  } finally {
    await rm(logsDir, { recursive: true, force: true });
  }
});
