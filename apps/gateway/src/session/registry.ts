import { EventEmitter } from 'node:events';

type SessionState = 'active' | 'interrupted';

export interface SessionEntry {
  id: string;
  state: SessionState;
  lastHeartbeat: number;
}

export class SessionRegistry {
  private readonly sessions = new Map<string, SessionEntry>();
  private readonly emitter = new EventEmitter();
  private cleanupTimer?: NodeJS.Timeout;

  constructor(private readonly ttlMs: number = 5000) {}

  upsert(sessionId: string) {
    const entry: SessionEntry = {
      id: sessionId,
      state: 'active',
      lastHeartbeat: Date.now()
    };
    this.sessions.set(sessionId, entry);
    return entry;
  }

  heartbeat(sessionId: string) {
    const entry = this.sessions.get(sessionId);
    if (entry) {
      entry.lastHeartbeat = Date.now();
    }
  }

  markInterrupted(sessionId: string) {
    const entry = this.sessions.get(sessionId);
    if (entry) {
      entry.state = 'interrupted';
      entry.lastHeartbeat = Date.now();
      this.emitter.emit('interrupt', sessionId);
    }
  }

  subscribeInterrupt(listener: (sessionId: string) => void) {
    this.emitter.on('interrupt', listener);
    return () => this.emitter.off('interrupt', listener);
  }

  startCleanup() {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => {
      const cutoff = Date.now() - this.ttlMs;
      for (const [id, entry] of this.sessions.entries()) {
        if (entry.lastHeartbeat < cutoff) {
          this.sessions.delete(id);
        }
      }
    }, this.ttlMs);
  }

  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  get(sessionId: string) {
    return this.sessions.get(sessionId);
  }
}
