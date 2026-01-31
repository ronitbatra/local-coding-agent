/**
 * SessionStore - JSONL event log per run
 * 
 * Stores session events in JSONL format for reproducibility and debugging.
 * Each run gets a unique session ID and log file.
 */

export interface SessionMetadata {
  sessionId: string;
  startedAt: number;
  endedAt?: number;
  status: 'running' | 'completed' | 'aborted' | 'error';
}

export class SessionStore {
  // TODO: Implement session logging
}
