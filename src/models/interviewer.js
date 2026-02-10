/**
 * Human-in-the-loop interviewer interface and implementations
 */

export const AnswerValue = {
  YES: 'yes',
  NO: 'no',
  SKIPPED: 'skipped',
  TIMEOUT: 'timeout'
};

export const QuestionType = {
  YES_NO: 'yes_no',
  MULTIPLE_CHOICE: 'multiple_choice',
  FREEFORM: 'freeform',
  CONFIRMATION: 'confirmation'
};

export class Question {
  constructor({
    text,
    type = QuestionType.MULTIPLE_CHOICE,
    options = [],
    defaultAnswer = null,
    timeoutSeconds = null,
    stage = '',
    metadata = {}
  }) {
    this.text = text;
    this.type = type;
    this.options = options;
    this.defaultAnswer = defaultAnswer;
    this.timeoutSeconds = timeoutSeconds;
    this.stage = stage;
    this.metadata = metadata;
  }
}

export class Option {
  constructor(key, label) {
    this.key = key;
    this.label = label;
  }
}

export class Answer {
  constructor({
    value,
    selectedOption = null,
    text = ''
  }) {
    this.value = value;
    this.selectedOption = selectedOption;
    this.text = text;
  }
}

/**
 * Base interviewer interface
 */
export class Interviewer {
  async ask(question) {
    throw new Error('Interviewer.ask must be implemented');
  }

  async askMultiple(questions) {
    const answers = [];
    for (const question of questions) {
      answers.push(await this.ask(question));
    }
    return answers;
  }

  inform(message, stage = '') {
    // Default: do nothing
  }
}

/**
 * Auto-approve interviewer - always selects YES or first option
 */
export class AutoApproveInterviewer extends Interviewer {
  async ask(question) {
    if (question.type === QuestionType.YES_NO || 
        question.type === QuestionType.CONFIRMATION) {
      return new Answer({ value: AnswerValue.YES });
    }

    if (question.type === QuestionType.MULTIPLE_CHOICE && 
        question.options.length > 0) {
      const firstOption = question.options[0];
      return new Answer({ 
        value: firstOption.key, 
        selectedOption: firstOption 
      });
    }

    return new Answer({ value: 'auto-approved', text: 'auto-approved' });
  }
}

/**
 * Queue interviewer - reads from pre-filled answer queue
 */
export class QueueInterviewer extends Interviewer {
  constructor(answers = []) {
    super();
    this.answers = answers;
    this.index = 0;
  }

  async ask(question) {
    if (this.index < this.answers.length) {
      return this.answers[this.index++];
    }
    return new Answer({ value: AnswerValue.SKIPPED });
  }
}
