import { Worker } from 'bullmq';
import { WebSocket } from 'ws';
import { config } from '../config.js';
import { SessionRegistry } from '../session/registry.js';
import { ControlFrameSchema } from '@alex/protocol/control';
import { getInterruptQueue, isInMemoryQueue, type InterruptJobData } from './queue.js';

interface WebSocketMap {
  get(sessionId: string): WebSocket | undefined;
}

export function createControlWorker(registry: SessionRegistry, sockets: WebSocketMap) {
  const queue = getInterruptQueue();

  const handler = async (data: InterruptJobData) => {
    const { sessionId, ackId } = data;
    registry.markInterrupted(sessionId);
    const ws = sockets.get(sessionId);
    if (ws && ws.readyState === ws.OPEN) {
      const ack = ControlFrameSchema.parse({
        type: 'interrupt',
        sessionId,
        ackId
      });
      ws.send(JSON.stringify({ type: 'ack', ts: Date.now(), payload: ack }));
    }
  };

  if (isInMemoryQueue(queue)) {
    const unsubscribe = queue.onJob(handler);
    return {
      async close() {
        unsubscribe();
      }
    };
  }

  const worker = new Worker('duplex-control', async (job) => handler(job.data), {
    connection: { connectionString: config.redisUrl }
  });

  worker.on('failed', (job, err) => {
    console.error('Control worker failed', job?.data, err);
  });

  return worker;
}
