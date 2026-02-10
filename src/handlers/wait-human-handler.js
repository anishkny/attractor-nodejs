/**
 * Wait for human handler - human-in-the-loop gate
 */

import { Handler } from './handler.js';
import { Outcome, StageStatus } from '../models/outcome.js';
import { QuestionType, Question, Option, Answer, AnswerValue } from '../models/interviewer.js';
import { parseAcceleratorKey } from '../utils/helpers.js';

export class WaitForHumanHandler extends Handler {
  constructor(interviewer) {
    super();
    this.interviewer = interviewer;
  }

  async execute(node, context, graph, logsRoot) {
    // 1. Derive choices from outgoing edges
    const edges = graph.getOutgoingEdges(node.id);
    
    if (edges.length === 0) {
      return new Outcome({
        status: StageStatus.FAIL,
        failureReason: 'No outgoing edges for human gate'
      });
    }

    // 2. Build choices from edges
    const choices = [];
    for (const edge of edges) {
      const label = edge.attrs.label || edge.to;
      const key = parseAcceleratorKey(label);
      choices.push({
        key,
        label,
        to: edge.to
      });
    }

    // 3. Build question
    const options = choices.map(c => new Option(c.key, c.label));
    const question = new Question({
      text: node.attrs.label || 'Select an option:',
      type: QuestionType.MULTIPLE_CHOICE,
      options,
      stage: node.id
    });

    // 4. Ask interviewer
    let answer;
    if (this.interviewer) {
      answer = await this.interviewer.ask(question);
    } else {
      // No interviewer - use first choice
      answer = new Answer({ 
        value: choices[0].key, 
        selectedOption: options[0] 
      });
    }

    // 5. Handle timeout/skip
    if (answer.value === AnswerValue.TIMEOUT || answer.value === AnswerValue.SKIPPED) {
      const defaultChoice = node.attrs['human.default_choice'];
      if (defaultChoice) {
        const choice = choices.find(c => c.key === defaultChoice || c.to === defaultChoice);
        if (choice) {
          answer = new Answer({ value: choice.key });
        } else {
          return new Outcome({
            status: StageStatus.RETRY,
            failureReason: 'Human gate timeout, no valid default'
          });
        }
      } else {
        return new Outcome({
          status: StageStatus.RETRY,
          failureReason: 'Human gate timeout, no default'
        });
      }
    }

    // 6. Find matching choice
    let selected = choices.find(c => {
      const answerLower = answer.value.toLowerCase();
      // Try exact key match
      if (c.key.toLowerCase() === answerLower) return true;
      // Try label match
      if (c.label.toLowerCase() === answerLower) return true;
      // Try target node match
      if (c.to.toLowerCase() === answerLower) return true;
      return false;
    });

    if (!selected) {
      selected = choices[0]; // Fallback to first
    }

    // 7. Return outcome with suggested next ID
    return new Outcome({
      status: StageStatus.SUCCESS,
      suggestedNextIds: [selected.to],
      contextUpdates: {
        'human.gate.selected': selected.key,
        'human.gate.label': selected.label
      },
      notes: `Human selected: ${selected.label}`
    });
  }
}
