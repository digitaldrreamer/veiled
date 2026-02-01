/**
 * * Logger utility for Veiled SDK
 * * Provides structured logging with different log levels
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

/**
 * NOTE (intentional):
 * Logging has been simplified to ALWAYS print via console.* because we were
 * missing logs in dev. This makes logs "unmissable" and avoids level/flag bugs.
 */
class Logger {
  private prefix = '[Veiled]';

  // Kept for API compatibility; no-op (always on)
  setLevel(_level: LogLevel): void {}

  debug(...args: unknown[]): void {
    // Use console.log (not console.debug) so it shows even when debug is filtered
    console.log(this.prefix, '[DEBUG]', ...args);
  }

  info(...args: unknown[]): void {
    console.log(this.prefix, '[INFO]', ...args);
  }

  warn(...args: unknown[]): void {
    console.warn(this.prefix, '[WARN]', ...args);
  }

  error(...args: unknown[]): void {
    console.error(this.prefix, '[ERROR]', ...args);
  }

  group(label: string): void {
    console.log(this.prefix, '[GROUP]', label);
  }

  groupEnd(): void {
    // no-op (we're not using console.group to avoid collapsed output)
  }

  table(data: unknown): void {
    // console.table can be hidden/collapsed; print both
    try {
      if (typeof console.table === 'function') {
        console.table(data);
      }
    } catch {
      // ignore
    }
    console.log(this.prefix, '[TABLE]', data);
  }
}

export const logger = new Logger();

// Make it obvious logger is alive as soon as module loads (dev-friendly)
logger.info('Logger initialized (always-on console logging)');
