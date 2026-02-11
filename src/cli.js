#!/usr/bin/env node

/**
 * CLI runner for Attractor pipelines
 */

import { readFile, access } from 'fs/promises';
import { resolve, join } from 'path';
import { ExecutionEngine } from './engine/execution-engine.js';
import { parseDot } from './parser/dot-parser.js';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node cli.js <dotfile> [logs-dir] [--resume]');
    console.error('  --resume: Resume from checkpoint in logs-dir');
    process.exit(1);
  }

  const dotFile = args[0];
  const logsDir = args[1] || `./logs/${Date.now()}`;
  const shouldResume = args.includes('--resume');

  try {
    // Read and parse DOT file
    console.log(`Reading ${dotFile}...`);
    const dotSource = await readFile(dotFile, 'utf-8');
    const graph = parseDot(dotSource);
    console.log(`Parsed graph: ${graph.name}`);
    console.log(`Goal: ${graph.attrs.goal || '(none)'}`);
    console.log(`Nodes: ${graph.nodes.size}`);
    console.log(`Edges: ${graph.edges.length}`);

    // Create execution engine
    const engine = new ExecutionEngine();

    let result;
    
    if (shouldResume) {
      // Check if checkpoint exists
      const checkpointPath = join(resolve(logsDir), 'checkpoint.json');
      try {
        await access(checkpointPath);
        console.log(`\nResuming from checkpoint...`);
        console.log(`Logs directory: ${logsDir}\n`);
        result = await engine.resume(graph, resolve(logsDir));
      } catch (err) {
        console.error(`Error: Cannot resume - checkpoint not found at ${checkpointPath}`);
        process.exit(1);
      }
    } else {
      // Run pipeline normally
      console.log(`\nStarting execution...`);
      console.log(`Logs directory: ${logsDir}\n`);
      result = await engine.run(graph, resolve(logsDir));
    }

    console.log('\n=== Pipeline Complete ===');
    console.log(`Status: ${result.status}`);
    if (result.resumed) {
      console.log(`Resumed: yes`);
    }
    console.log(`Completed nodes: ${result.completedNodes.join(' -> ')}`);
    console.log(`\nLogs saved to: ${logsDir}`);

  } catch (error) {
    console.error('\n=== Pipeline Failed ===');
    console.error(error.message);
    process.exit(1);
  }
}

main();
