/**
 * Tests for DOT parser
 */

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseDot } from '../src/parser/dot-parser.js';

test('parseDot - simple graph', () => {
  const dot = `
    digraph Simple {
      start [shape=Mdiamond]
      exit [shape=Msquare]
      start -> exit
    }
  `;

  const graph = parseDot(dot);
  assert.equal(graph.name, 'Simple');
  assert.equal(graph.nodes.size, 2);
  assert.equal(graph.edges.length, 1);
});

test('parseDot - graph attributes', () => {
  const dot = `
    digraph Test {
      graph [goal="Test goal"]
      rankdir=LR
      
      start [shape=Mdiamond]
      exit [shape=Msquare]
      start -> exit
    }
  `;

  const graph = parseDot(dot);
  assert.equal(graph.attrs.goal, 'Test goal');
  assert.equal(graph.attrs.rankdir, 'LR');
});

test('parseDot - node attributes', () => {
  const dot = `
    digraph Test {
      start [shape=Mdiamond, label="Start Here"]
      task [label="Task", prompt="Do something", max_retries=3]
      exit [shape=Msquare]
      
      start -> task -> exit
    }
  `;

  const graph = parseDot(dot);
  const task = graph.getNode('task');
  assert.equal(task.attrs.label, 'Task');
  assert.equal(task.attrs.prompt, 'Do something');
  assert.equal(task.attrs.max_retries, 3);
});

test('parseDot - edge attributes', () => {
  const dot = `
    digraph Test {
      start [shape=Mdiamond]
      gate [shape=diamond]
      exit [shape=Msquare]
      
      start -> gate
      gate -> exit [label="Success", condition="outcome=success", weight=10]
    }
  `;

  const graph = parseDot(dot);
  const edges = graph.getOutgoingEdges('gate');
  assert.equal(edges.length, 1);
  assert.equal(edges[0].attrs.label, 'Success');
  assert.equal(edges[0].attrs.condition, 'outcome=success');
  assert.equal(edges[0].attrs.weight, 10);
});

test('parseDot - chained edges', () => {
  const dot = `
    digraph Test {
      start [shape=Mdiamond]
      a [label="A"]
      b [label="B"]
      exit [shape=Msquare]
      
      start -> a -> b -> exit
    }
  `;

  const graph = parseDot(dot);
  assert.equal(graph.edges.length, 3);
  assert.equal(graph.edges[0].from, 'start');
  assert.equal(graph.edges[0].to, 'a');
  assert.equal(graph.edges[1].from, 'a');
  assert.equal(graph.edges[1].to, 'b');
  assert.equal(graph.edges[2].from, 'b');
  assert.equal(graph.edges[2].to, 'exit');
});

test('parseDot - comments', () => {
  const dot = `
    // This is a line comment
    digraph Test {
      /* This is a block comment */
      start [shape=Mdiamond] // inline comment
      exit [shape=Msquare]
      /* Multi-line
         block comment */
      start -> exit
    }
  `;

  const graph = parseDot(dot);
  assert.equal(graph.nodes.size, 2);
  assert.equal(graph.edges.length, 1);
});
