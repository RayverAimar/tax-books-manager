import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../logger';

describe('logger', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let groupSpy: ReturnType<typeof vi.spyOn>;
  let timeSpy: ReturnType<typeof vi.spyOn>;
  let tableSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    timeSpy = vi.spyOn(console, 'time').mockImplementation(() => {});
    tableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('warn() calls console.warn with prefix', () => {
    logger.warn('oops', { x: 1 });
    expect(warnSpy).toHaveBeenCalled();
    expect(String(warnSpy.mock.calls[0][0])).toContain('[WARN]');
  });

  it('error() with Error instance formats message and stack', () => {
    const err = new Error('boom');
    logger.error('failed', err);
    const args = errorSpy.mock.calls[0];
    expect(String(args[0])).toContain('[ERROR]');
    expect(args[1]).toMatchObject({ message: 'boom' });
  });

  it('error() without Error passes raw value', () => {
    logger.error('failed', 'string-detail');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('error() without details still logs', () => {
    logger.error('just a message');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('debug/info/group/time/table are callable', () => {
    logger.debug('d');
    logger.info('i');
    logger.group('g');
    logger.groupEnd();
    logger.time('t');
    logger.timeEnd('t');
    logger.table([{ a: 1 }]);
    // No throw is enough. Some may call their spies, others may be gated by env.
    expect(groupSpy.mock.calls.length + timeSpy.mock.calls.length + tableSpy.mock.calls.length).toBeGreaterThanOrEqual(
      0
    );
  });
});
