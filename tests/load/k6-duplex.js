import ws from 'k6/ws';
import { Trend } from 'k6/metrics';
import { check } from 'k6';

const ackLatency = new Trend('ack_latency');

export const options = {
  vus: Number(__ENV.VUS || 10),
  duration: __ENV.DURATION || '30s'
};

export default function () {
  const url = __ENV.CONTROL_URL || 'ws://localhost:8080/control';
  const start = Date.now();
  const res = ws.connect(url, (socket) => {
    socket.on('open', () => {
      socket.send(JSON.stringify({ type: 'interrupt', sessionId: 'sess', ackId: `ack-${Date.now()}` }));
    });
    socket.on('message', (msg) => {
      const delta = Date.now() - start;
      ackLatency.add(delta);
      socket.close();
    });
  });

  check(res, {
    'status is 101': (r) => r && r.status === 101
  });
}
