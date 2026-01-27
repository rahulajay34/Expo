/**
 * Environment-aware logging utility
 * Only logs in development mode to keep production clean
 */

const isDevelopment = process.env.NODE_ENV === 'development';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogOptions {
  prefix?: string;
  data?: unknown;
  force?: boolean; // Force log even in production
}

class Logger {
  private prefix: string;

  constructor(prefix: string = '') {
    this.prefix = prefix;
  }

  private formatMessage(level: LogLevel, message: string, options?: LogOptions): string {
    const prefix = options?.prefix || this.prefix;
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    return prefix ? `[${timestamp}] [${prefix}] ${message}` : `[${timestamp}] ${message}`;
  }

  info(message: string, options?: LogOptions): void {
    if (isDevelopment || options?.force) {
      console.log(this.formatMessage('info', message, options), options?.data ?? '');
    }
  }

  warn(message: string, options?: LogOptions): void {
    if (isDevelopment || options?.force) {
      console.warn(this.formatMessage('warn', message, options), options?.data ?? '');
    }
  }

  error(message: string, options?: LogOptions): void {
    // Always log errors
    console.error(this.formatMessage('error', message, options), options?.data ?? '');
  }

  debug(message: string, options?: LogOptions): void {
    if (isDevelopment) {
      console.debug(this.formatMessage('debug', message, options), options?.data ?? '');
    }
  }

  /**
   * Create a scoped logger with a specific prefix
   */
  scope(prefix: string): Logger {
    return new Logger(prefix);
  }
}

// Export singleton instance
export const log = new Logger();

// Export scoped loggers for different modules
export const authLog = new Logger('Auth');
export const generationLog = new Logger('Generation');
export const storeLog = new Logger('Store');
export const apiLog = new Logger('API');
