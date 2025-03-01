// extension/utils/logger.ts

/**
 * Simple logger utility inspired by loguru
 */
class Logger {
  private name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  info(message: string, ...args: any[]): void {
    console.log(`[INFO] ${this.name}: ${message}`, ...args);
  }
  
  warning(message: string, ...args: any[]): void {
    console.warn(`[WARNING] ${this.name}: ${message}`, ...args);
  }
  
  error(message: string, ...args: any[]): void {
    console.error(`[ERROR] ${this.name}: ${message}`, ...args);
  }
  
  debug(message: string, ...args: any[]): void {
    console.debug(`[DEBUG] ${this.name}: ${message}`, ...args);
  }
}

export const loguru = {
  getLogger: (name: string) => new Logger(name)
};
