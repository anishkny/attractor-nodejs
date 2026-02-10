/**
 * Stage execution outcome model
 */

export const StageStatus = {
  SUCCESS: 'success',
  PARTIAL_SUCCESS: 'partial_success',
  RETRY: 'retry',
  FAIL: 'fail',
  SKIPPED: 'skipped'
};

export class Outcome {
  constructor({
    status = StageStatus.SUCCESS,
    preferredLabel = '',
    suggestedNextIds = [],
    contextUpdates = {},
    notes = '',
    failureReason = ''
  } = {}) {
    this.status = status;
    this.preferredLabel = preferredLabel;
    this.suggestedNextIds = suggestedNextIds;
    this.contextUpdates = contextUpdates;
    this.notes = notes;
    this.failureReason = failureReason;
  }

  isSuccess() {
    return this.status === StageStatus.SUCCESS || this.status === StageStatus.PARTIAL_SUCCESS;
  }

  toJSON() {
    return {
      status: this.status,
      preferredLabel: this.preferredLabel,
      suggestedNextIds: this.suggestedNextIds,
      contextUpdates: this.contextUpdates,
      notes: this.notes,
      failureReason: this.failureReason
    };
  }
}
