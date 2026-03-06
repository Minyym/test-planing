import { EventEmitter } from 'node:events';
import { Queue } from 'bullmq';
import { config } from '../config.js';

export interface InterruptJobData {
  sessionId: string;
  ackId: string;
  ts: number;
}

type BullQueue = Queue<InterruptJobData>;

class InMemoryInterruptQueue {
  private readonly emitter = new EventEmitter();

  async add(_: string, data: InterruptJobData) {
    queueMicrotask(() => {
      this.emitter.emit('job', { data });
    });
  }

  onJob(listener: (data: InterruptJobData) => void) {
    const handler = (event: { data: InterruptJobData }) => listener(event.data);
    this.emitter.on('job', handler);
    return () => this.emitter.off('job', handler);
  }
}

const useInMemoryQueue = process.env.USE_IN_MEMORY_QUEUE === '1' || process.env.NODE_ENV === 'test';

const queueDriver: BullQueue | InMemoryInterruptQueue = useInMemoryQueue
  ? new InMemoryInterruptQueue()
  : new Queue<InterruptJobData>('duplex-control', {
      connection: { connectionString: config.redisUrl }
    });

export function getInterruptQueue() {
  return queueDriver;
}

export function isInMemoryQueue(driver = queueDriver): driver is InMemoryInterruptQueue {
  return driver instanceof InMemoryInterruptQueue;
}

export async function enqueueInterrupt(data: InterruptJobData) {
  if (isInMemoryQueue()) {
    await (queueDriver as InMemoryInterruptQueue).add('interrupt', data);
    return;
  }
  await (queueDriver as BullQueue).add('interrupt', data, {
    priority: 1,
    removeOnComplete: true
  });
}
