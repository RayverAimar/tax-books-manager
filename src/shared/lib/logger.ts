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

const CONSOLE_METHOD: Record<LogLevel, (...args: unknown[]) => void> = {
  debug: (...args) => console.debug(...args),
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args)
};

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

  private isEnabled(level: LogLevel): boolean {
    switch (level) {
      case 'debug':
        return this.config.enableDebug;
      case 'info':
        return this.config.enableInfo;
      case 'warn':
        return this.config.enableWarn;
      case 'error':
        return this.config.enableError;
    }
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!this.isEnabled(level)) return;
    CONSOLE_METHOD[level](`[${level.toUpperCase()}] ${message}`, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args);
  }

  error(message: string, error?: Error | unknown, ...args: unknown[]): void {
    if (error instanceof Error) {
      this.log('error', message, {
        message: error.message,
        stack: error.stack,
        ...args
      });
    } else if (error !== undefined) {
      this.log('error', message, error, ...args);
    } else {
      this.log('error', message, ...args);
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
  table(data: unknown): void {
    if (this.config.enableDebug) {
      console.table(data);
    }
  }
}

// Export a singleton instance
export const logger = new Logger();

// Export type for use in other files
export type { Logger };
