/**
 * Logger unit tests
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLogger, Logger, LogLevel, parseLogLevel } from '../../src/util/logger';

describe('Logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to info level', () => {
    const logger = new Logger();
    expect(logger.getLevel()).toBe(LogLevel.INFO);
  });

  it('suppresses messages below the configured level', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logger = new Logger({ level: LogLevel.WARN });

    logger.debug('hidden debug');
    logger.info('hidden info');
    logger.warn('visible warn');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('logs with scope and supports child loggers', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const parent = createLogger({ level: LogLevel.DEBUG, scope: 'core' });
    const child = parent.child('runtime');

    child.warn('event bus stalled', { attempts: 1 });

    expect(warnSpy).toHaveBeenCalledWith('[WARN] [core:runtime] event bus stalled', {
      attempts: 1,
    });
  });

  it('allows the log level to be updated', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const logger = new Logger({ level: LogLevel.ERROR });

    logger.info('hidden before update');
    logger.setLevel(LogLevel.INFO);
    logger.info('visible after update');

    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith('[INFO] visible after update');
  });
});

describe('parseLogLevel', () => {
  it('parses known level names case-insensitively', () => {
    expect(parseLogLevel('DEBUG')).toBe(LogLevel.DEBUG);
    expect(parseLogLevel('warning')).toBe(LogLevel.WARN);
  });

  it('falls back for unknown values', () => {
    expect(parseLogLevel('loud', LogLevel.ERROR)).toBe(LogLevel.ERROR);
    expect(parseLogLevel(undefined)).toBe(LogLevel.INFO);
  });
});
