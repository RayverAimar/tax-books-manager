/**
 * Logger utility for production-ready logging
 * Provides consistent logging with environment awareness
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enableDebug: boolean;
  enableInfo: boolean;
  enableWarn: boolean;
  enableError: boolean;
}

class Logger {
  private config: LoggerConfig;

  constructor() {
    // In production, only show warnings and errors
    // In development, show all logs
    const isDevelopment = import.meta.env.DEV;

    this.config = {
      enableDebug: isDevelopment,
      enableInfo: isDevelopment,
      enableWarn: true,
      enableError: true
    };
  }

  private log(_level: LogLevel, _message: string, ..._args: any[]): void {
    // Logging disabled
  }

  debug(message: string, ...args: any[]): void {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args);
  }

  error(message: string, error?: Error | unknown, ...args: any[]): void {
    if (error instanceof Error) {
      this.log('error', message, {
        message: error.message,
        stack: error.stack,
        ...args
      });
    } else {
      this.log('error', message, error, ...args);
    }
  }

  /**
   * Group related logs together
   */
  group(label: string): void {
    if (this.config.enableDebug) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.config.enableDebug) {
      console.groupEnd();
    }
  }

  /**
   * Log performance timing
   */
  time(label: string): void {
    if (this.config.enableDebug) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.config.enableDebug) {
      console.timeEnd(label);
    }
  }

  /**
   * Create a table in console (useful for debugging data)
   */
  table(data: any): void {
    if (this.config.enableDebug) {
      console.table(data);
    }
  }
}

// Export a singleton instance
export const logger = new Logger();

// Export type for use in other files
export type { Logger };
