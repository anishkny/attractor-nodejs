/**
 * Retry policy and logic
 */

import { sleep } from '../utils/helpers.js';
import { StageStatus } from '../models/outcome.js';

export class RetryPolicy {
  constructor({
    maxAttempts = 1,
    initialDelayMs = 200,
    backoffFactor = 2.0,
    maxDelayMs = 60000,
    jitter = true
  } = {}) {
    this.maxAttempts = maxAttempts;
    this.initialDelayMs = initialDelayMs;
    this.backoffFactor = backoffFactor;
    this.maxDelayMs = maxDelayMs;
    this.jitter = jitter;
  }

  delayForAttempt(attempt) {
    // attempt is 1-indexed (first retry is attempt=1)
    let delay = this.initialDelayMs * Math.pow(this.backoffFactor, attempt - 1);
    delay = Math.min(delay, this.maxDelayMs);
    
    if (this.jitter) {
      delay = delay * (0.5 + Math.random());
    }
    
    return delay;
  }

  shouldRetry(error) {
    // Default: retry on network errors, rate limits, server errors
    if (!error) return false;
    
    const message = error.message || String(error);
    
    // Network errors
    if (message.includes('ECONNREFUSED') || 
        message.includes('ETIMEDOUT') ||
        message.includes('ENOTFOUND')) {
      return true;
    }
    
    // HTTP errors
    if (message.includes('429') || // Rate limit
        message.includes('5')) { // 5xx server errors
      return true;
    }
    
    return false;
  }

  static fromNode(node, graph) {
    const maxRetries = node.attrs.max_retries !== undefined 
      ? node.attrs.max_retries 
      : (graph.attrs.default_max_retry !== undefined ? parseInt(graph.attrs.default_max_retry) : 0);
    
    return new RetryPolicy({
      maxAttempts: maxRetries + 1 // max_retries is additional attempts
    });
  }

  static presets = {
    none: new RetryPolicy({ maxAttempts: 1 }),
    standard: new RetryPolicy({ maxAttempts: 5, initialDelayMs: 200, backoffFactor: 2.0 }),
    aggressive: new RetryPolicy({ maxAttempts: 5, initialDelayMs: 500, backoffFactor: 2.0 }),
    linear: new RetryPolicy({ maxAttempts: 3, initialDelayMs: 500, backoffFactor: 1.0 }),
    patient: new RetryPolicy({ maxAttempts: 3, initialDelayMs: 2000, backoffFactor: 3.0 })
  };
}

export async function executeWithRetry(handler, node, context, graph, logsRoot, retryPolicy, retryCounts) {
  const nodeId = node.id;
  
  for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
    try {
      const outcome = await handler.execute(node, context, graph, logsRoot);
      
      // Success or partial success - reset retry counter
      if (outcome.status === StageStatus.SUCCESS || 
          outcome.status === StageStatus.PARTIAL_SUCCESS) {
        retryCounts[nodeId] = 0;
        return outcome;
      }

      // Retry status - try again if within limits
      if (outcome.status === StageStatus.RETRY) {
        if (attempt < retryPolicy.maxAttempts) {
          retryCounts[nodeId] = (retryCounts[nodeId] || 0) + 1;
          const delay = retryPolicy.delayForAttempt(attempt);
          await sleep(delay);
          continue;
        } else {
          // Retries exhausted
          if (node.attrs.allow_partial) {
            return {
              ...outcome,
              status: StageStatus.PARTIAL_SUCCESS,
              notes: 'Retries exhausted, partial accepted'
            };
          }
          return {
            ...outcome,
            status: StageStatus.FAIL,
            failureReason: 'Max retries exceeded'
          };
        }
      }

      // Fail status - return immediately
      if (outcome.status === StageStatus.FAIL) {
        return outcome;
      }

      // Other statuses - return as is
      return outcome;

    } catch (error) {
      // Exception during execution
      if (retryPolicy.shouldRetry(error) && attempt < retryPolicy.maxAttempts) {
        const delay = retryPolicy.delayForAttempt(attempt);
        await sleep(delay);
        continue;
      } else {
        return {
          status: StageStatus.FAIL,
          failureReason: error.message || String(error),
          contextUpdates: {},
          notes: '',
          preferredLabel: '',
          suggestedNextIds: []
        };
      }
    }
  }

  // Should not reach here, but just in case
  return {
    status: StageStatus.FAIL,
    failureReason: 'Max retries exceeded',
    contextUpdates: {},
    notes: '',
    preferredLabel: '',
    suggestedNextIds: []
  };
}
