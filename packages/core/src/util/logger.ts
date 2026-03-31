/**
 * Logger utility with log levels.
 */

export enum LogLevel {
  DEBUG = 10,
  INFO = 20,
  WARN = 30,
  ERROR = 40,
  SILENT = 50,
}

export interface LoggerOptions {
  level?: LogLevel;
  scope?: string;
}

const LOG_LEVEL_NAMES: Record<string, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  warning: LogLevel.WARN,
  error: LogLevel.ERROR,
  silent: LogLevel.SILENT,
};

export function parseLogLevel(
  value: string | undefined,
  fallback: LogLevel = LogLevel.INFO
): LogLevel {
  if (!value) {
    return fallback;
  }

  return LOG_LEVEL_NAMES[value.trim().toLowerCase()] ?? fallback;
}

export class Logger {
  private level: LogLevel;
  private readonly scope?: string;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.scope = options.scope;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  child(scope: string): Logger {
    const nextScope = this.scope ? `${this.scope}:${scope}` : scope;
    return new Logger({ level: this.level, scope: nextScope });
  }

  debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, 'debug', message, args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, 'info', message, args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, 'warn', message, args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, 'error', message, args);
  }

  private log(
    level: LogLevel,
    method: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    args: unknown[]
  ): void {
    if (level < this.level || this.level === LogLevel.SILENT) {
      return;
    }

    const prefix = this.scope
      ? `[${this.getLevelName(level)}] [${this.scope}] ${message}`
      : `[${this.getLevelName(level)}] ${message}`;

    console[method](prefix, ...args);
  }

  private getLevelName(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return 'DEBUG';
      case LogLevel.INFO:
        return 'INFO';
      case LogLevel.WARN:
        return 'WARN';
      case LogLevel.ERROR:
        return 'ERROR';
      default:
        return 'LOG';
    }
  }
}

export function createLogger(options: LoggerOptions = {}): Logger {
  return new Logger(options);
}
