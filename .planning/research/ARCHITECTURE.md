# Architecture Research — Alex Health Concierge

**Domain:** 流式语音数字人健康咨询
**Researched:** 2026-03-02
**Confidence:** MEDIUM

## Standard Architecture

### System Overview
```
┌───────────────────────────────────────────────┐
│                Experience Layer               │
│  ┌────────────┐  ┌───────────────┐           │
│  │MicWorker   │  │Three.js Avatar│           │
│  └─────┬──────┘  └─────┬─────────┘           │
│        │               │                     │
├────────┴────────────────┴────────────────────┤
│             Edge Gateway / Duplex WS         │
│  ┌────────────┐  ┌─────────────┐             │
│  │/audio pipe │  │/render pipe │             │
│  └─────┬──────┘  └─────┬───────┘             │
├────────┴────────────────┴────────────────────┤
│           Realtime Intelligence Layer        │
│  ┌──────────┐┌──────────┐┌──────────┐        │
│  │VAD/ASR   ││LangChain ││Streaming │        │
│  │Service   ││Agent+RAG ││TTS+Viseme│        │
│  └────┬─────┘└────┬─────┘└────┬─────┘        │
│       │          Sync Bus     │              │
├───────┴────────────┬──────────┴──────────────┤
│            Data & Knowledge Layer            │
│  ┌────────────┐  ┌────────────┐  ┌──────────┐│
│  │Vector Store│  │Medical Docs│  │Analytics ││
│  └────────────┘  └────────────┘  └──────────┘│
└───────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| MicWorker | 捕获音频、分帧、上报打断 | AudioWorklet + SharedArrayBuffer |
| Edge Gateway (/audio,/render) | 会话管理、WS多路复用、优先级队列 | Node.js 22 + uWebSockets.js |
| VAD/ASR Service | 语音活动检测、流式转写 + 时间戳 | Deepgram TS SDK / Whisper.cpp wasm |
| LangChain Agent | 工具调用、RAG、引用封装 | LangChain TS + LangGraph |
| Streaming TTS | Token->音频+viseme | Azure Speech / ElevenLabs streaming |
| Vector Store | 医疗文档 embedding & recall | Supabase pgvector |
| Telemetry | 延迟/引用/错误监控 | OpenTelemetry + Honeycomb |

## Recommended Project Structure
```
src/
├── client/
│   ├── workers/        # AudioWorklet, VAD adapters
│   ├── avatar/         # Three.js scene + viseme mapper
│   ├── ui/             # React/Next components (sidebar, controls)
│   └── protocol/       # shared zod schemas (imported via pnpm workspace)
├── server/
│   ├── gateway/        # WS endpoints, session registry
│   ├── services/
│   │   ├── asr/
│   │   ├── agent/
│   │   └── tts/
│   └── tools/          # RAG loaders, external API wrappers
├── shared/
│   ├── protocol/       # npm package `@alex/protocol`
│   └── utils/          # logging, tracing helpers
├── infra/
│   ├── deploy/         # Terraform/fly.toml
│   └── scripts/        # CI workflows, load tests
└── tests/
    ├── e2e/            # Playwright + mocked audio
    └── load/           # k6 duplex stress
```

### Structure Rationale
- **client/** 与 **server/** 分离但共享 `shared/protocol`，保证前后端类型对齐。
- **services/** 细分 ASR/Agent/TTS，方便独立扩缩容。
- **infra/** 與 **tests/** 提前存在，支持延迟监控/压测。

## Architectural Patterns

### Pattern 1: Duplex Event Bus
**What:** Gateway 维护 `EventEmitter` / Redis Stream，把 ASR/Agent/TTS 事件推送到订阅者。
**When:** 需要多服务共享同一会话状态。
**Trade-offs:** 额外复杂度，但使打断广播更快。

```ts
const bus = new EventEmitter();
ws.on('message', msg => bus.emit(`session:${id}`, msg));
agent.subscribe(id, payload => ws.send(payload));
```

### Pattern 2: Token-level Citation Hook
**What:** LangChain CallbackHandler 在 `handleLLMNewToken` 中附加 citation metadata。
**When:** 需要同步展示来源。
**Trade-offs:** Slight overhead; requires agent outputs cite IDs.

```ts
class CiteHook extends BaseCallbackHandler {
  handleLLMNewToken(token, runId, meta) {
    stream.push({type:'agent_thinking', token});
    if (meta?.cite) stream.push({type:'citation', ...meta.cite});
  }
}
```

### Pattern 3: Viseme Scheduler
**What:** 将 TTS 返回的 phoneme 队列写入 SharedArrayBuffer，由渲染循环消费。
**When:** 需要音素级同步。
**Trade-offs:** 必须做时钟校准，处理丢帧。

```ts
const queue = new SharedArrayBuffer(4096);
function schedule(viseme){
  Atomics.store(queue, writePtr, viseme.ts);
}
```

## Data Flow

### Request Flow
```
[User speaks]
    ↓ PCM chunks
[MicWorker] → [/audio WS] → [Gateway] → [VAD] → [ASR]
    ↓ partial text
[LangChain Agent] → [TTS] → [/render WS] → [Avatar+Audio]
```

### Key Data Flows
1. **Interrupt Flow:** Browser发送 `control:interrupt` → Gateway 发布 stop → Agent/TTS 取消 → ACK 返回，ASR 重置缓冲。
2. **Citation Flow:** Agent 生成 token 同时推送 cite_id → UI 侧栏查询 metadata → 展示链接。

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k 并发 | 单 Node 进程 + 外部 ASR/TTS SaaS 即可 |
| 1k-10k | 拆分 Gateway 与推理服务，使用 Redis/Upstash 共享 session；音频走 Cloudflare Workers |
| 10k+ | Agent/TTS 池按区域部署，使用 Kafka/NATS 传输事件，引用对象缓存至 Edge KV |

### Scaling Priorities
1. **首个瓶颈：** Gateway WS 连接数 → 采用 uWebSockets + horizontal scaling。
2. **第二瓶颈：** Agent token 延迟 → 将 RAG、TTS 下沉至 GPU/区域副本。

## Anti-Patterns
- **HTTP fallback:** 轮询接口导致>1s延迟且无法打断。
- **单体长事务:** 把 VAD/ASR/Agent/TTS 放在同一 Node event loop，遇IO阻塞整体卡顿。拆分服务+消息总线。

## Integration Points

### External Services
| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Deepgram Streaming | gRPC/WS | 需 keepalive, 带 session key |
| ElevenLabs/Azure Speech | HTTP2 streaming | 返回 viseme id, 记得映射 |
| Brave Search / Medical APIs | REST | 缓存 & 记录引用证据 |

### Internal Boundaries
| Boundary | Communication | Notes |
|----------|---------------|-------|
| Gateway ↔ ASR | gRPC/IPC | 传音频帧 & ack |
| Agent ↔ RAG store | SQL/Vector API | enforce PHI access 控制 |
| Agent ↔ TTS | Event bus | 传token+SSML |

## Sources
- LangChain TS LangGraph streaming docs
- Deepgram/ElevenLabs streaming handbook
- Soul Machines WebRTC 数字人公开资料

---
*Architecture research for: 流式语音数字人健康咨询*
*Researched: 2026-03-02*
