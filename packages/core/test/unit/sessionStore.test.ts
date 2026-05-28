/**
 * Session store and event schema unit tests
 */

import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isAgentEvent } from '../../src/runtime/EventBus';
import { SessionStore } from '../../src/runtime/SessionStore';

describe('Event schema', () => {
  it('accepts valid agent events', () => {
    expect(
      isAgentEvent({
        type: 'done',
        timestamp: Date.now(),
        sequence: 1,
        data: {
          message: 'ok',
        },
      })
    ).toBe(true);
  });

  it('rejects invalid agent events', () => {
    expect(isAgentEvent(null)).toBe(false);
    expect(
      isAgentEvent({
        type: 'done',
        timestamp: 'now',
        sequence: 1,
        data: {},
      })
    ).toBe(false);
    expect(
      isAgentEvent({
        type: 'done',
        timestamp: Date.now(),
        sequence: 0,
        data: {},
      })
    ).toBe(false);
  });
});

describe('SessionStore', () => {
  it('persists event ordering and metadata for replay', async () => {
    const sessionsDir = await mkdtemp(path.join(os.tmpdir(), 'session-store-'));
    const store = new SessionStore(sessionsDir);
    const metadata = await store.startSession('apply', '/tmp/repo');

    await store.appendEvent('patch_proposed', {
      patchPath: '/tmp/repo/.agent/patches/last-proposed.patch',
      fileCount: 1,
    });
    await store.appendEvent('patch_applied', {
      patchPath: '/tmp/repo/.agent/patches/last-proposed.patch',
      filesChanged: ['README.md'],
    });
    await store.complete({
      message: 'Applied patch touching 1 file(s).',
      exitCode: 0,
    });

    const replay = await store.readSession(metadata.sessionId);

    expect(replay.metadata.status).toBe('completed');
    expect(replay.metadata.eventCount).toBe(3);
    expect(replay.events.map((event) => event.type)).toEqual([
      'patch_proposed',
      'patch_applied',
      'done',
    ]);
    expect(replay.events.map((event) => event.sequence)).toEqual([1, 2, 3]);
  });

  it('marks aborted sessions durably', async () => {
    const sessionsDir = await mkdtemp(path.join(os.tmpdir(), 'session-abort-'));
    const store = new SessionStore(sessionsDir);
    const metadata = await store.startSession('test', '/tmp/repo');

    await store.abort('Interrupted by SIGINT.');

    const replay = await store.readSession(metadata.sessionId);
    expect(replay.metadata.status).toBe('aborted');
    expect(replay.metadata.summary).toBe('Interrupted by SIGINT.');
    expect(replay.events.at(-1)?.type).toBe('error');
  });
});
