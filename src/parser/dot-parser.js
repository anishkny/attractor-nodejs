/**
 * Simple DOT parser for Attractor
 * Parses a strict subset of Graphviz DOT syntax
 */

import { Graph } from '../models/graph.js';

export class DotParser {
  parse(dotSource) {
    // Remove comments
    const cleaned = this.removeComments(dotSource);
    
    // Extract graph name and content
    const graphMatch = cleaned.match(/digraph\s+(\w+)\s*\{([\s\S]*)\}/);
    if (!graphMatch) {
      throw new Error('Invalid DOT file: must contain a digraph declaration');
    }

    const [, graphName, content] = graphMatch;
    const graph = new Graph(graphName);

    // Parse statements
    this.parseStatements(content, graph);

    return graph;
  }

  removeComments(source) {
    // Remove line comments
    let result = source.replace(/\/\/.*$/gm, '');
    // Remove block comments
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    return result;
  }

  parseStatements(content, graph) {
    const lines = content.split(/[;\n]/).map(l => l.trim()).filter(l => l);

    for (const line of lines) {
      // Graph attributes
      if (line.startsWith('graph [')) {
        const attrs = this.parseAttributes(line);
        Object.assign(graph.attrs, attrs);
        continue;
      }

      // Graph-level attribute declaration (key = value)
      const attrMatch = line.match(/^(\w+)\s*=\s*(.+)$/);
      if (attrMatch) {
        const [, key, value] = attrMatch;
        graph.attrs[key] = this.parseValue(value);
        continue;
      }

      // Edge statement (A -> B or A -> B -> C)
      if (line.includes('->')) {
        this.parseEdgeStatement(line, graph);
        continue;
      }

      // Node statement
      const nodeMatch = line.match(/^(\w+)(\s*\[([^\]]+)\])?/);
      if (nodeMatch) {
        const [, nodeId, , attrsStr] = nodeMatch;
        const attrs = attrsStr ? this.parseAttributes(`[${attrsStr}]`) : {};
        if (!graph.nodes.has(nodeId)) {
          graph.addNode(nodeId, attrs);
        } else {
          // Merge attributes
          Object.assign(graph.nodes.get(nodeId).attrs, attrs);
        }
      }
    }
  }

  parseEdgeStatement(line, graph) {
    // Extract attributes if present
    const attrMatch = line.match(/\[([^\]]+)\]\s*$/);
    const attrs = attrMatch ? this.parseAttributes(`[${attrMatch[1]}]`) : {};
    
    // Remove attributes from line for parsing nodes
    const edgeLine = attrMatch ? line.replace(/\[([^\]]+)\]\s*$/, '') : line;
    
    // Split by ->
    const nodeIds = edgeLine.split('->').map(id => id.trim());
    
    // Create edges (chained edges share attributes)
    for (let i = 0; i < nodeIds.length - 1; i++) {
      const fromId = nodeIds[i];
      const toId = nodeIds[i + 1];
      
      // Ensure nodes exist
      if (!graph.nodes.has(fromId)) {
        graph.addNode(fromId);
      }
      if (!graph.nodes.has(toId)) {
        graph.addNode(toId);
      }
      
      graph.addEdge(fromId, toId, attrs);
    }
  }

  parseAttributes(attrBlock) {
    const attrs = {};
    const match = attrBlock.match(/\[([^\]]+)\]/);
    if (!match) return attrs;

    const content = match[1];
    // Split by comma, but not within quotes
    const pairs = this.splitAttributePairs(content);

    for (const pair of pairs) {
      const eqIndex = pair.indexOf('=');
      if (eqIndex === -1) continue;

      const key = pair.substring(0, eqIndex).trim();
      const value = pair.substring(eqIndex + 1).trim();
      attrs[key] = this.parseValue(value);
    }

    return attrs;
  }

  splitAttributePairs(content) {
    const pairs = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      
      if (char === '"' && (i === 0 || content[i - 1] !== '\\')) {
        inQuotes = !inQuotes;
        current += char;
      } else if (char === ',' && !inQuotes) {
        if (current.trim()) {
          pairs.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      pairs.push(current.trim());
    }
    
    return pairs;
  }

  parseValue(value) {
    value = value.trim();

    // Remove quotes
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.substring(1, value.length - 1)
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }

    // Boolean
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Number
    if (/^-?\d+$/.test(value)) {
      return parseInt(value);
    }
    if (/^-?\d+\.\d+$/.test(value)) {
      return parseFloat(value);
    }

    // Duration (keep as string for now)
    if (/^\d+(ms|s|m|h|d)$/.test(value)) {
      return value;
    }

    // Plain identifier or string
    return value;
  }
}

export function parseDot(dotSource) {
  const parser = new DotParser();
  return parser.parse(dotSource);
}
