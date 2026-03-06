# CTRL-03 Observability Runbook

## Metrics pipeline
1. `pnpm --filter @alex/gateway dev` (gateway exports OTLP spans + metrics)
2. Run OpenTelemetry Collector with OTLP HTTP receiver
3. Import `observability/dashboards/ctrl-latency.json` into Grafana

## Alert thresholds
- Interrupt ack p95 > 80ms for 3m → paging
- ASR latency avg > 250ms → investigate vendor
- RAG hit ratio < 0.8 → check embeddings freshness

## How to verify
```
pnpm k6 run tests/load/k6-duplex.js --vus 50 --duration 2m --summary-export reports/ctrl03.json
```
Load the dashboard and confirm curves stay under thresholds.
