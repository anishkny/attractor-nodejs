/**
 * Edge selection algorithm
 */

import { normalizeLabel } from '../utils/helpers.js';

export class EdgeSelector {
  /**
   * Select the next edge from a node based on outcome and context
   */
  selectEdge(node, outcome, context, graph) {
    const edges = graph.getOutgoingEdges(node.id);
    
    if (edges.length === 0) {
      return null;
    }

    // Step 1: Condition matching
    const conditionMatched = [];
    for (const edge of edges) {
      if (edge.attrs.condition) {
        if (this.evaluateCondition(edge.attrs.condition, outcome, context)) {
          conditionMatched.push(edge);
        }
      }
    }

    if (conditionMatched.length > 0) {
      return this.bestByWeightThenLexical(conditionMatched);
    }

    // Step 2: Preferred label match
    if (outcome.preferredLabel) {
      const normalizedPreferred = normalizeLabel(outcome.preferredLabel);
      for (const edge of edges) {
        if (normalizeLabel(edge.attrs.label) === normalizedPreferred) {
          return edge;
        }
      }
    }

    // Step 3: Suggested next IDs
    if (outcome.suggestedNextIds && outcome.suggestedNextIds.length > 0) {
      for (const suggestedId of outcome.suggestedNextIds) {
        for (const edge of edges) {
          if (edge.to === suggestedId) {
            return edge;
          }
        }
      }
    }

    // Step 4 & 5: Weight with lexical tiebreak (unconditional edges only)
    const unconditional = edges.filter(e => !e.attrs.condition);
    if (unconditional.length > 0) {
      return this.bestByWeightThenLexical(unconditional);
    }

    // Fallback: any edge
    return this.bestByWeightThenLexical(edges);
  }

  bestByWeightThenLexical(edges) {
    if (edges.length === 0) return null;
    
    // Sort by weight descending, then by target node ID ascending
    const sorted = [...edges].sort((a, b) => {
      const weightDiff = b.attrs.weight - a.attrs.weight;
      if (weightDiff !== 0) return weightDiff;
      return a.to.localeCompare(b.to);
    });

    return sorted[0];
  }

  evaluateCondition(condition, outcome, context) {
    // Simple condition evaluation
    // Supports: outcome=value, outcome!=value
    try {
      // Replace outcome with actual status
      let expr = condition.replace(/outcome/g, `"${outcome.status}"`);
      
      // Replace context variables
      expr = expr.replace(/context\.(\w+)/g, (match, key) => {
        const value = context.get(key);
        if (typeof value === 'string') {
          return `"${value}"`;
        }
        return value !== null ? String(value) : 'null';
      });

      // Simple equality/inequality checks
      if (expr.includes('=')) {
        const eqMatch = expr.match(/"([^"]+)"\s*(!?=)\s*"([^"]+)"/);
        if (eqMatch) {
          const [, left, op, right] = eqMatch;
          if (op === '=') {
            return left === right;
          } else if (op === '!=') {
            return left !== right;
          }
        }
      }

      return false;
    } catch (error) {
      console.warn(`Failed to evaluate condition: ${condition}`, error);
      return false;
    }
  }
}
