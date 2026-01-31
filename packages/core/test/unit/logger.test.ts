/**
 * Logger unit tests
 */

import { describe, it, expect } from 'vitest';
import { Logger, LogLevel } from '../../src/util/logger';

describe('Logger', () => {
  it('should create logger with default level', () => {
    const logger = new Logger();
    expect(logger).toBeDefined();
  });

  it('should create logger with custom level', () => {
    const logger = new Logger(LogLevel.DEBUG);
    expect(logger).toBeDefined();
  });
});
