export class RuntimeDiagnostics {
  constructor() {
    this.lastError = null;
  }

  captureError(error, context = {}) {
    const normalized = error instanceof Error ? error : new Error(String(error));
    this.lastError = {
      error: normalized,
      message: normalized.message,
      stack: normalized.stack,
      context,
      timestamp: Date.now()
    };
    return this.lastError;
  }

  getLastError() {
    return this.lastError;
  }

  clear() {
    this.lastError = null;
  }
}
