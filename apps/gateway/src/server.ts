import { App, us_listen_socket_close } from 'uWebSockets.js';
import { jwtVerify } from 'jose';
import { config } from './config.js';
import { AudioHeaderSchema, RenderEnvelopeSchema, ControlFrameSchema } from '@alex/protocol';
import { enqueueInterrupt } from './control/queue.js';
import { createControlWorker } from './control/worker.js';
import { SessionRegistry } from './session/registry.js';
import { startTelemetry, stopTelemetry } from './telemetry/tracer.js';
import { interruptHistogram, asrLatencyHistogram, ttsLatencyHistogram, ragHitRatio } from './metrics/histograms.js';

const registry = new SessionRegistry();
registry.startCleanup();
const sockets = new Map<string, any>();
createControlWorker(registry, {
  get(sessionId: string) {
    return sockets.get(sessionId);
  }
});

function verifyToken(token?: string) {
  if (!token) throw new Error('missing token');
  return jwtVerify(token, new TextEncoder().encode(config.authSecret));
}

function sessionIdFromToken(token: string) {
  return verifyToken(token).then(({ payload }) => payload.sub ?? 'anon');
}

function attachWsHandlers(app: ReturnType<typeof App>) {
  app.ws('/control', {
    compression: 0,
    maxPayloadLength: 16 * 1024,
    open: async (ws) => {
      const token = ws.getQuery('token');
      const sessionId = await sessionIdFromToken(token);
      sockets.set(sessionId, ws);
      ws.subscribe(`ctrl:${sessionId}`);
      registry.upsert(sessionId);
    },
    close: (ws, code, msg) => {
      const token = ws.getQuery('token');
      sessionIdFromToken(token!).then((sessionId) => sockets.delete(sessionId)).catch(() => {});
    },
    message: async (ws, message) => {
      const data = JSON.parse(Buffer.from(message).toString());
      const frame = ControlFrameSchema.parse(data);
      await enqueueInterrupt({ sessionId: frame.sessionId, ackId: frame.ackId, ts: Date.now() });
      ws.send(JSON.stringify({ type: 'ack', ackId: frame.ackId, ts: Date.now() }));
    }
  });

  app.ws('/audio', {
    compression: 0,
    maxPayloadLength: 256 * 1024,
    open: async (ws) => {
      const sessionId = await sessionIdFromToken(ws.getQuery('token'));
      registry.upsert(sessionId);
      ws.subscribe(`audio:${sessionId}`);
    },
    message: (ws, arrayBuffer) => {
      const header = AudioHeaderSchema.safeParse(JSON.parse(Buffer.from(arrayBuffer).toString()));
      if (!header.success || header.data.protocolVersion !== config.protocolVersion) {
        ws.close();
      }
    }
  });

  app.ws('/render', {
    compression: 0,
    maxPayloadLength: 256 * 1024,
    message: (ws, arrayBuffer) => {
      const payload = JSON.parse(Buffer.from(arrayBuffer).toString());
      const parsed = RenderEnvelopeSchema.safeParse(payload);
      if (!parsed.success) {
        ws.close();
      }
    }
  });
}

const app = App();
startTelemetry();
attachWsHandlers(app);
let listenSocket: any;
app.listen(config.port, (token) => {
  if (!token) {
    console.error('Failed to listen');
    return;
  }
  listenSocket = token;
  console.log(`Gateway listening on ${config.port}`);
});

process.on('SIGINT', () => {
  if (listenSocket) {
    us_listen_socket_close(listenSocket);
  }
  registry.stopCleanup();
  stopTelemetry();
});
