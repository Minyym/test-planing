import { describe, it, expect } from 'vitest';

class MockWebSocket {
  public readonly sent: Array<{ type: string; ts: number; payload: unknown }> = [];
  public readyState = 1;
  public readonly OPEN = 1;

  send(message: string) {
    this.sent.push(JSON.parse(message));
  }
}

describe('interrupt ack', () => {
  it('responds within threshold using in-memory queue', async () => {
    process.env.USE_IN_MEMORY_QUEUE = '1';
    const [{ enqueueInterrupt }, { createControlWorker }, { SessionRegistry }] = await Promise.all([
      import('../control/queue.js'),
      import('../control/worker.js'),
      import('../session/registry.js')
    ]);

    const registry = new SessionRegistry();
    registry.upsert('sess');

    const sockets = new Map<string, MockWebSocket>();
    const socket = new MockWebSocket();
    sockets.set('sess', socket);

    const worker = createControlWorker(registry, {
      get(sessionId: string) {
        return sockets.get(sessionId) as unknown as any;
      }
    });

    const started = Date.now();
    await enqueueInterrupt({ sessionId: 'sess', ackId: 'ack-1', ts: started });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(socket.sent).toHaveLength(1);
    const ackFrame = socket.sent[0];
    expect(ackFrame.type).toBe('ack');
    const delta = ackFrame.ts - started;
    expect(delta).toBeLessThan(50);
    expect(registry.get('sess')?.state).toBe('interrupted');

    if (typeof (worker as any).close === 'function') {
      await (worker as any).close();
    }
  });
});
