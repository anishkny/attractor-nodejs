/**
 * Context - thread-safe key-value store shared across pipeline stages
 */

export class Context {
  constructor() {
    this.values = new Map();
    this.logs = [];
  }

  set(key, value) {
    this.values.set(key, value);
  }

  get(key, defaultValue = null) {
    return this.values.has(key) ? this.values.get(key) : defaultValue;
  }

  getString(key, defaultValue = '') {
    const value = this.get(key);
    return value != null ? String(value) : defaultValue;
  }

  getNumber(key, defaultValue = 0) {
    const value = this.get(key);
    return value != null ? Number(value) : defaultValue;
  }

  has(key) {
    return this.values.has(key);
  }

  appendLog(entry) {
    this.logs.push(entry);
  }

  snapshot() {
    const snapshot = {};
    for (const [key, value] of this.values.entries()) {
      snapshot[key] = value;
    }
    return snapshot;
  }

  clone() {
    const newContext = new Context();
    for (const [key, value] of this.values.entries()) {
      newContext.set(key, value);
    }
    newContext.logs = [...this.logs];
    return newContext;
  }

  applyUpdates(updates) {
    if (!updates) return;
    for (const [key, value] of Object.entries(updates)) {
      this.set(key, value);
    }
  }

  toJSON() {
    return this.snapshot();
  }
}
