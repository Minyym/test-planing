import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { config } from '../config.js';

let sdk: NodeSDK | null = null;

export function startTelemetry() {
  if (sdk) return sdk;
  sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({ url: `${config.otlpEndpoint}/v1/traces` }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({ url: `${config.otlpEndpoint}/v1/metrics` }),
      exportIntervalMillis: 2000
    })
  });
  sdk.start().catch((err) => console.error('Failed to start telemetry', err));
  return sdk;
}

export async function stopTelemetry() {
  if (!sdk) return;
  await sdk.shutdown();
  sdk = null;
}
