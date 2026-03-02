# Research Summary — Alex Health Concierge

**Date:** 2026-03-02
**Inputs:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md

## Stack Snapshot
- 全TS链路：浏览器 AudioWorklet + Node 22 + LangChain TS + ElevenLabs/Azure streaming。
- 双 WebSocket 通道（/audio, /render）+ uWS Gateway，Edge 层终止连接。
- Deepgram streaming ASR + RAG( pgvector + text-embedding-3-large) + streaming TTS 提供 viseme 时间线。

## Table Stakes (Must Ship)
1. 语音→语音流式问答（ASR/Agent/TTS pipeline）。
2. Citation sidebar：每条医疗建议附来源与摘要。
3. 全双工打断：<50ms Abort，control 帧独立。
4. Viseme 同步数字人：phoneme timeline + Three.js morph targets。
5. 多轮上下文记忆，维持健康咨询连续性。

## Differentiators Worth Targeting
- 接入可穿戴/FHIR 数据，给出个性化建议。
- 人格脚本 + 情绪状态机让数字人更贴近真人。
- 多模态输出（字幕、图表）强化解释性。

## Architecture Cliff Notes
- 体验层（MicWorker、Avatar）→ Edge Gateway → Realtime 服务 (VAD/ASR, Agent, TTS) → 数据/知识层。
- 推荐项目结构：client/server/shared/infra/tests，`@alex/protocol` 供协议 schema。
- 核心模式：Duplex Event Bus、Token-level citation hook、Viseme scheduler。

## Pitfalls to Guard Against
- Citation 事件缺失 → 直接破坏可信度。
- 打断 Ack 超时 → 用户以为系统失控。
- 口型不同步 → 数字人显假；需 phoneme timeline。
- 合规/PHI 泄露 → RAG 存储与日志需最小权限。
- WS session 泄漏 → 长连应用必须心跳+GC。

## Recommendations
- 在 Phase 0 先落地协议/网关/监控基线，再进入 Agent/TTS。
- 为引用与 viseme 定义共享 schema 并写模拟器测试。
- 建立压测脚本（k6/Playwright）覆盖打断、延迟、口型同步。

---
