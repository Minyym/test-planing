import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('duplex-gateway');

export const interruptHistogram = meter.createHistogram('duplex_interrupt_ack_ms', {
  description: 'Interrupt acknowledgement latency'
});

export const asrLatencyHistogram = meter.createHistogram('duplex_asr_latency_ms', {
  description: 'ASR processing latency'
});

export const ttsLatencyHistogram = meter.createHistogram('duplex_tts_latency_ms', {
  description: 'TTS processing latency'
});

export const ragHitRatio = meter.createUpDownCounter('duplex_rag_hit_ratio', {
  description: 'RAG hit ratio per session'
});
