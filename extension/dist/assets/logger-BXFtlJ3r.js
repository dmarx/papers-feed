class Logger {
  constructor(module) {
    this.module = module;
  }
  /**
   * Log debug message
   */
  debug(message, data) {
    console.debug(`[${this.module}] ${message}`, data !== void 0 ? data : "");
  }
  /**
   * Log info message
   */
  info(message, data) {
    console.info(`[${this.module}] ${message}`, data !== void 0 ? data : "");
  }
  /**
   * Log warning message
   */
  warning(message, data) {
    console.warn(`[${this.module}] ${message}`, data !== void 0 ? data : "");
  }
  /**
   * Log error message
   */
  error(message, data) {
    console.error(`[${this.module}] ${message}`, data !== void 0 ? data : "");
  }
}
class LoguruMock {
  /**
   * Get logger for a module
   */
  getLogger(module) {
    return new Logger(module);
  }
}
const loguru = new LoguruMock();

export { loguru as l };
//# sourceMappingURL=logger-BXFtlJ3r.js.map
