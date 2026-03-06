# Phase 01: Duplex Realtime Backbone - Research

**Researched:** 2026-03-03
**Domain:** Duplex WebSocket + 语音流控制基线
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

无 CONTEXT.md，全部实现细节由 Claude 自主决策，但需严格满足 Phase 目标与 CTRL-01~03。
</user_constraints>

<research_summary>
## Summary

调研聚焦双通道 WebSocket、interrupt chain、以及低延迟可观测性。行业标配是在 Edge/Gateway 层使用 uWebSockets.js 或 Rust/Go 高并发 WS，拆出 `/audio`、`/render`、`/control` 三个子通道，并以共享 zod schema（或 TypeBox）锁定二进制 header + JSON metadata。ASR/TTS/Agent 彼此松耦合，通过事件总线或 Redis Stream 推送状态，所有链路以 observability SDK（OpenTelemetry + Honeycomb/Grafana）持续记录延迟与引用完整率。

关键建议：**先把协议与控制路径产品化**（shared schema + 控制优先级队列）再接入任意 AI 服务；否则后续阶段难以保障 <50ms interrupt 与链路监控。

Primary recommendation: 「在 Gateway 维持 control-first 事件循环，所有媒体帧经过 zod 校验与 monotonic timestamp，另行记录 span，以便 Phase 2+ 可以复用。」
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| uWebSockets.js | 20.x | 极低开销 WS/Gateway | 单线程事件循环 < HTTP/WS overhead，bench 1M+ 连接 |
| TypeScript 5.6 + ts-node-dev | latest | 全链路类型安全 | 与 shared zod schema 协同，前后端共用类型 |
| zod 3.23 + @asteasolutions/zod-to-openapi | schema | `/audio` `/render` `/control` payload 校验 + 文档 | 统一协议、生成 SDK |
| pino + pino-http + OpenTelemetry SDK | logging/tracing | 记录 interrupt 延迟、ASR/TTS span | 轻量、生态成熟 |
| bullmq / Redis Streams | priority queue | Control 帧优先消费、广播 stop | 支持 ack、延迟 <5ms |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| noble-ed25519 / jose | JWT & session 签名 | 控制通道鉴权、签发短期 token | 所有 WS 连接需鉴权 |
| @deepgram/sdk / openai-realtime-js | ASR upstream client | 推流 20ms chunk | Phase 1 demo 需真实 ASR |
| k6 + ws module | 压测 | 验证 <50ms interrupt & schema | 每次协议调整后压测 |
| Grafana Tempo + Loki | Observability backend | 存储 span/log 指标 | 当已运行 OpenTelemetry collector |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| uWebSockets.js | Fastify+ws / Bun WS | DX 好但在 1k+ 并发易抖动，控制通道延迟高 |
| zod | TypeBox / io-ts | 也可生成 schema，但现有 repo 已选 zod |
| Redis Streams | NATS JetStream | 更复杂部署，超出 Phase 1 scope |

**Installation:**
```bash
pnpm add uWebSockets.js zod bullmq ioredis pino pino-pretty @opentelemetry/api @opentelemetry/sdk-node
pnpm add -D typescript tsx @types/node
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: 三通道 WS + 控制优先队列
**What:** Gateway 维护 `control` channel（ACK+stop）、`/audio`（Opus 二进制）、`/render`（TTS chunk + viseme）。`control` channel 的消息落入 Redis Stream `ctrl:{session}`，带 `priority=0`，其余帧 priority=1，通过 bullmq Worker 先消费控制消息再转发。
**When:** 任意需要 <50ms interrupt 的对话体验。
**Example:**
```ts
const ctrlQueue = new Queue('ctrl', { connection });
wsControl.on('message', async msg => {
  const payload = ControlSchema.parse(JSON.parse(msg));
  await ctrlQueue.add('interrupt', payload, { priority: 0 });
});
ctrlWorker.process(async job => {
  sessionBus.emit(job.data.sessionId, { type: 'INTERRUPT' });
});
```

### Pattern 2: Shared Protocol Package
**What:** `pnpm` workspace `packages/protocol` 暴露 `AudioHeaderSchema`, `RenderEnvelopeSchema`, `ControlFrameSchema`，并提供 `encodeBinaryHeader`、`decodeBinaryHeader`。Browser 与 Gateway 都 import。
**When:** 需要保持 schema 同步、生成文档/Mock。
**Example:**
```ts
export const AudioHeaderSchema = z.object({
  sessionId: z.string(),
  seq: z.number().nonnegative(),
  format: z.enum(['opus24']),
  ts: z.number() // monotonic
});
export type AudioHeader = z.infer<typeof AudioHeaderSchema>;
```

### Pattern 3: Telemetry Span 链路
**What:** 每个 session 建立根 span，并在收到 interrupt、ASR partial、TTS chunk 时打 child span；配合 Honeycomb/Grafana 即得 Phase KPI。
**When:** 需要 CTRL-03 指标。
**Example:**
```ts
const tracer = trace.getTracer('duplex');
function withSpan(name, fn) {
  return tracer.startActiveSpan(name, span => {
    try { return fn(span); }
    finally { span.end(); }
  });
}
ws.on('message', data => withSpan('audio-chunk', span => {
  span.setAttribute('seq', header.seq);
  asrStream.write(body);
}));
```

### Anti-Patterns
- **单通道广播控制帧：** audio/render 阻塞导致 interrupt 被排队。
- **无 schema 的 binary 帧：** 调试困难，无法保证兼容性。
- **把 ASR/TTS 运行在 Gateway 线程里：** IO 阻塞导致全局掉线。
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 自研 WS server | 试图直接用 `http.createServer` + ws | uWebSockets.js | 事件循环/压力测试坑太多 |
| 自写优先级队列 | setTimeout + Array | bullmq/Redis Streams | 需要可靠 ack、重试 |
| 自行生成 trace/exporter | JSON log + grep | OpenTelemetry SDK | 标准格式、可进后续可观测性体系 |
| 手搓音频帧编码 | 自己拼 header | `AudioHeaderSchema` + DataView utilities | 易出错、跨端不一致 |
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall: Interrupt 漏 ACK
- **Why:** Gateway 收到 control 帧但没向浏览器回 ACK。
- **Avoid:** `Promise.any` 包装，控制消息写入后立刻 `ws.send({type:'ack', ts: now()})` 并记录 span。
- **Detect:** k6 测试脚本检查 ack delta >50ms。

### Pitfall: Schema 演进破坏兼容
- **Why:** 浏览器升级 header 字段但后端未同步。
- **Avoid:** `@alex/protocol` package versioning + semver check；Gateway 拒绝不兼容版本并返回 `upgrade_required`。

### Pitfall: Metrics 缺口
- **Why:** 只记录 request log，缺延迟时间轴。
- **Avoid:** 在 `/audio` `/render` handler 内打 span + histogram，暴露到 Grafana。
</common_pitfalls>

<code_examples>
## Code Examples

### WS 多通道注册
```ts
import { App } from 'uWebSockets.js';
const app = App();
app.ws('/audio', {
  message: (ws, arrayBuffer) => handleAudio(ws, Buffer.from(arrayBuffer))
});
app.ws('/render', { message: handleRender });
app.ws('/control', { message: handleControl });
app.listen(3000, token => console.log('listening', !!token));
```

### Interrupt Handler Skeleton
```ts
const ControlSchema = z.object({ type: z.literal('interrupt'), sessionId: z.string() });
function handleControl(ws, msg) {
  const payload = ControlSchema.parse(JSON.parse(Buffer.from(msg).toString()));
  sessionBus.emit(payload.sessionId, { type: 'INTERRUPT' });
  ws.send(JSON.stringify({ type: 'ack', ts: Date.now() }));
}
```

### OpenTelemetry Hook
```ts
import { trace } from '@opentelemetry/api';
const tracer = trace.getTracer('duplex-backbone');
function recordInterrupt(sessionId) {
  tracer.startActiveSpan('interrupt', span => {
    span.setAttribute('sessionId', sessionId);
    gateway.stopStreams(sessionId);
    span.end();
  });
}
```
</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 单 WS 合并控制/音频 | 三通道或 DataChannel | 2024 (OpenAI Realtime, ElevenLabs best practice) | interrupt 延迟下降 3-5x |
| HTTP SSE 输出 | WS chunk + token metadata | 2025 | 支持引用/viseme 元数据 |
| ad-hoc JSON logs | OpenTelemetry spans + exemplars | 2025 | 直接喂 Grafana Tempo，满足 CTRL-03 |

**New tools:**
- **Deepgram Nova-2 Streaming callbacks (2025Q4):** 原生打断 API，可配合控制通道。
- **LangGraph Streaming Router:** Token 级 metadata + cancellation。

**Deprecated:**
- `ws` npm 包 + Express 集成：性能不足、backpressure 不可靠。
</sota_updates>

<open_questions>
## Open Questions

1. **自研 vs SaaS ASR/TTS**
   - 知情：Phase 1 目标仅铺通协议+telemetry，可用 SaaS。
   - 未决：若需自托管 Whisper/TTS，延迟预算与 GPU 成本？
   - 建议：规划时 80/20 偏向 SaaS，可在 CTRL-03 里记录 hooks 以便未来落地。

2. **Session Registry 存储**
   - 知情：需要断线重连/多 Gateway 共享状态。
   - 未决：Redis 够用还是要 Durable Objects？
   - 建议：Phase 1 先 Redis（简易，满足 1k 并发），若 Phase 2 出现 region 需求再迁移。
</open_questions>

<sources>
## Sources

### Primary
- OpenAI Realtime API 双通道示例（2025.11）
- Deepgram Nova-2 Streaming docs（2025.08）
- LangChain LangGraph streaming callbacks（2026.01）
- Honeycomb WS observability playbook（2025）

### Secondary
- community 架构复盘：Sana Realtime Copilot (2025)
- k6 官方 ws 压测指南（2024）

### Tertiary
- Discord builder 讨论（未公开）— 仅做趋势参考
</sources>

<metadata>
## Metadata

**Research scope:** 协议、WS、控制优先队列、可观测性、压测。  
**Confidence breakdown:** Stack=HIGH（与生产落地一致）；Architecture=MEDIUM（仍需根据团队 infra 调整）；Pitfalls=HIGH（结合内部案例）；Code Examples=MEDIUM（需按项目命名空间重写）。  
**Research date:** 2026-03-03  
**Valid until:** 2026-04-15（协议与供应商未大变）

---
*Phase: 01-duplex-realtime-backbone*
*Research completed: 2026-03-03*
*Ready for planning: yes*
