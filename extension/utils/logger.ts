// utils/logger.ts
// Simple logging utility that wraps around loguru package

// Since this is a browser extension, we'll create a mock loguru interface
// that logs to console with appropriate formatting

export class Logger {
  private module: string;
  
  constructor(module: string) {
    this.module = module;
  }
  
  debug(message: string, data?: any): void {
    console.debug(`[${this.module}] ${message}`, data || '');
  }
  
  info(message: string, data?: any): void {
    console.info(`[${this.module}] ${message}`, data || '');
  }
  
  warning(message: string, data?: any): void {
    console.warn(`[${this.module}] ${message}`, data || '');
  }
  
  error(message: string, data?: any): void {
    console.error(`[${this.module}] ${message}`, data || '');
  }
}

class LoguruMock {
  getLogger(module: string): Logger {
    return new Logger(module);
  }
}

// Export a singleton instance
export const loguru = new LoguruMock();
