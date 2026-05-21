/**
 * SessionStore - JSONL event log per run
 *
 * Stores session events in JSONL format for reproducibility and debugging.
 * Each run gets a unique session ID and log file.
 */

import { existsSync } from 'node:fs';
import { appendFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  AgentEvent,
  DoneEventData,
  ErrorEventData,
  EventDataMap,
  EventType,
} from './EventBus.js';
import { isAgentEvent } from './EventBus.js';

export interface SessionMetadata {
  sessionId: string;
  command: string;
  cwd: string;
  startedAt: number;
  endedAt?: number;
  status: 'running' | 'completed' | 'aborted' | 'error';
  eventCount: number;
  logPath: string;
  summary?: string;
}

export interface SessionRecord {
  metadata: SessionMetadata;
  events: AgentEvent[];
}

export class SessionStore {
  private metadata: SessionMetadata | null = null;
  private sequence = 0;

  constructor(private readonly sessionsDir: string) {}

  async startSession(command: string, cwd: string): Promise<SessionMetadata> {
    await mkdir(this.sessionsDir, { recursive: true });

    const startedAt = Date.now();
    const sessionId = `${new Date(startedAt).toISOString().replaceAll(':', '-')}--${
      process.pid
    }-${Math.random().toString(36).slice(2, 8)}`;
    const logPath = this.getSessionLogPath(sessionId);

    this.metadata = {
      sessionId,
      command,
      cwd,
      startedAt,
      status: 'running',
      eventCount: 0,
      logPath,
    };
    this.sequence = 0;

    await this.writeMetadata();
    return this.metadata;
  }

  getMetadata(): SessionMetadata | null {
    return this.metadata ? { ...this.metadata } : null;
  }

  async appendEvent<TType extends EventType>(
    type: TType,
    data: EventDataMap[TType]
  ): Promise<AgentEvent<TType>> {
    if (!this.metadata) {
      throw new Error('Session has not been started.');
    }

    const event: AgentEvent<TType> = {
      type,
      timestamp: Date.now(),
      sequence: ++this.sequence,
      data,
    };

    await appendFile(this.metadata.logPath, `${JSON.stringify(event)}\n`, 'utf8');

    this.metadata.eventCount = this.sequence;
    await this.writeMetadata();

    return event;
  }

  async complete(data: DoneEventData): Promise<SessionMetadata> {
    await this.appendEvent('done', data);
    return this.finish('completed', data.message);
  }

  async fail(data: ErrorEventData): Promise<SessionMetadata> {
    await this.appendEvent('error', data);
    return this.finish('error', data.message);
  }

  async abort(reason: string): Promise<SessionMetadata> {
    await this.appendEvent('error', {
      message: reason,
      exitCode: 130,
      details: { signal: 'SIGINT' },
    });
    return this.finish('aborted', reason);
  }

  async readSession(sessionId: string): Promise<SessionRecord> {
    const metadata = await this.readMetadataFile(sessionId);
    const logPath = this.getSessionLogPath(sessionId);
    const content = existsSync(logPath) ? await readFile(logPath, 'utf8') : '';
    const events = content
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as unknown)
      .filter(isAgentEvent);

    return {
      metadata,
      events,
    };
  }

  async getLatestSession(): Promise<SessionRecord | null> {
    const sessions = await this.listSessions();
    const latest = sessions[0];
    if (!latest) {
      return null;
    }

    return this.readSession(latest.sessionId);
  }

  async listSessions(): Promise<SessionMetadata[]> {
    if (!existsSync(this.sessionsDir)) {
      return [];
    }

    const entries = await readdir(this.sessionsDir);
    const metadataFiles = entries.filter((entry) => entry.endsWith('.meta.json'));
    const sessions = await Promise.all(
      metadataFiles.map(async (fileName) => {
        const fullPath = path.join(this.sessionsDir, fileName);
        const content = await readFile(fullPath, 'utf8');
        return JSON.parse(content) as SessionMetadata;
      })
    );

    return sessions.sort((left, right) => right.startedAt - left.startedAt);
  }

  private async finish(
    status: SessionMetadata['status'],
    summary: string
  ): Promise<SessionMetadata> {
    if (!this.metadata) {
      throw new Error('Session has not been started.');
    }

    this.metadata.status = status;
    this.metadata.endedAt = Date.now();
    this.metadata.summary = summary;
    await this.writeMetadata();

    return { ...this.metadata };
  }

  private getSessionLogPath(sessionId: string): string {
    return path.join(this.sessionsDir, `${sessionId}.jsonl`);
  }

  private getSessionMetadataPath(sessionId: string): string {
    return path.join(this.sessionsDir, `${sessionId}.meta.json`);
  }

  private async writeMetadata(): Promise<void> {
    if (!this.metadata) {
      return;
    }

    await writeFile(
      this.getSessionMetadataPath(this.metadata.sessionId),
      `${JSON.stringify(this.metadata, null, 2)}\n`,
      'utf8'
    );
  }

  private async readMetadataFile(sessionId: string): Promise<SessionMetadata> {
    const metadataPath = this.getSessionMetadataPath(sessionId);
    const content = await readFile(metadataPath, 'utf8');
    return JSON.parse(content) as SessionMetadata;
  }
}
