class Logger {
  constructor(module) {
    this.module = module;
  }
  debug(message, data) {
    console.debug(`[${this.module}] ${message}`, data || "");
  }
  info(message, data) {
    console.info(`[${this.module}] ${message}`, data || "");
  }
  warning(message, data) {
    console.warn(`[${this.module}] ${message}`, data || "");
  }
  error(message, data) {
    console.error(`[${this.module}] ${message}`, data || "");
  }
}
class LoguruMock {
  getLogger(module) {
    return new Logger(module);
  }
}
const loguru = new LoguruMock();

export { loguru as l };
//# sourceMappingURL=logger-CPjPFdcb.js.map
