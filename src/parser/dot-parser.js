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
    // First, split into meaningful statements
    // Handle both ; and newline as separators, but be careful with attributes
    const statements = [];
    let current = '';
    let inBrackets = 0;
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      
      if (char === '[') {
        inBrackets++;
        current += char;
      } else if (char === ']') {
        inBrackets--;
        current += char;
      } else if ((char === ';' || char === '\n') && inBrackets === 0) {
        if (current.trim()) {
          statements.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      statements.push(current.trim());
    }

    for (const line of statements) {
      // Graph attributes
      if (line.startsWith('graph [')) {
        const attrBlock = line.substring(5).trim(); // Remove "graph"
        const attrs = this.parseAttributes(attrBlock);
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
    // Find attributes - look for the last [...] that's not inside quotes
    let attrStart = -1;
    let attrEnd = -1;
    let inQuotes = false;
    let bracketDepth = 0;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const prevChar = i > 0 ? line[i - 1] : '';
      
      if (char === '"' && prevChar !== '\\') {
        inQuotes = !inQuotes;
      } else if (!inQuotes) {
        if (char === '[') {
          if (bracketDepth === 0) {
            attrStart = i;
          }
          bracketDepth++;
        } else if (char === ']') {
          bracketDepth--;
          if (bracketDepth === 0 && attrStart !== -1) {
            attrEnd = i + 1;
          }
        }
      }
    }
    
    let attrs = {};
    let edgeLine = line;
    
    if (attrStart !== -1 && attrEnd !== -1) {
      const attrBlock = line.substring(attrStart, attrEnd);
      attrs = this.parseAttributes(attrBlock);
      edgeLine = line.substring(0, attrStart).trim();
    }
    
    // Split by -> and extract just the node identifiers
    const nodeIds = edgeLine.split('->').map(id => {
      // Extract just the identifier, not any following content
      const match = id.trim().match(/^(\w+)/);
      return match ? match[1] : id.trim();
    });
    
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
    
    // Find the content between the outermost brackets
    if (!attrBlock.startsWith('[') || !attrBlock.endsWith(']')) {
      return attrs;
    }
    
    const content = attrBlock.substring(1, attrBlock.length - 1);
    
    // Split by comma, but not within quotes or brackets
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
      return parseInt(value, 10);
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
