# Research: Stack — Alex Health Concierge

**Date:** 2026-03-02
**Confidence:** 0.72

## Runtime & Hosting
- **Edge Ingress:** Cloudflare Workers + Durable Objects — keep WS termination close to users, sub-50ms handshake, handles session stickiness for duplex audio.
- **Core Services:** Node.js 22 (Bun-compatible) on Fly.io/Render autoscale — full TypeScript, easy WebSocket + media pipeline.
- **GPU Inference (optional):** Modal/RunPod containers for on-demand Whisper large-v3 + FastPitch TTS if self托管。

## Speech Frontend
- **AudioWorklet + WebRTC getUserMedia** — browser capture、AEC/NS、48kHz→16kHz downsampling。
- **VAD:** webrtcvad-wasm or Picovoice Cobra WASM running in Edge Gateway；暴露 speaking 状态给 Duplex Controller。

## ASR 层
- **Deepgram Nova-2 streaming (TS SDK)** — sub-300ms partials，含 per-token timestamps；备用：OpenAI Realtime API + Whisper large-v3 via SSE。
- Packet化：Opus 20ms + sequence 位。

## Orchestrator & RAG
- **LangChain TS + LangGraph** — 构建 tool-aware agent，支持 function calling + interruption。
- **Vector Store:** Supabase pgvector 或 Pinecone serverless，embedding 用 OpenAI text-embedding-3-large；医疗文档需自建 HIPAA bucket。
- **Tooling:** Brave Search API for public evidence、内网FHIR 数据、症状与保健指南文档。

## TTS & Avatar 输出
- **TTS:** ElevenLabs Streaming / Azure Neural Speech（支持 viseme），提供 phoneme timeline 和 chunked PCM。
- **Audio packaging:** Ogg/Opus 24kHz, chunk 40ms，header 携带 phoneme 数组。
- **Three.js Avatar:** WebGL2 + morph targets（AA/EE/OO/TH 等 viseme blendshape）。Socket 数据由 `@alex/protocol` schema 解析。

## Observability & QA
- **Tracing:** OpenTelemetry + Honeycomb，span 包含 ASR/Agent/TTS 延迟。
- **Quality monitors:** RAG 命中率、citation completeness、interrupt latency。

## What Not To Use
- **Python microservices** — 违背全TS约束，增加部署复杂度。
- **HTTP polling** — 无法满足流式/打断需求。
- **Single WS 通道** — 控制信令与音频共线导致优先级倒挂。

---
