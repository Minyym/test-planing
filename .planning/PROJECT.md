# Alex Health Concierge

## What This Is
Alex 是面向终端用户的数字人健康管家：用户用语音提问，系统实时检测语音活动、转写文本、调用带医疗知识库的 LangChain Agent 生成回答，并通过流式 TTS 驱动 Three.js 数字人以 WebRTC/WS 方式返回语音与表情。目标是让用户获得可信、低延迟的健康咨询体验。

## Core Value
提供可被用户随时打断、响应毫秒级的语音健康咨询，同时伴随权威引用，确保信任感与沉浸式数字人互动。

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] 构建端到端语音→LangChain→语音的流式 pipeline，并暴露统一 TypeScript SDK/服务接口。
- [ ] 在所有医疗建议中附带引用 ID，并让前端侧栏展示来源标题与摘要。
- [ ] 实现全双工打断：浏览器可随时发出 interrupt，后端立刻停止 ASR/Agent/TTS 并播报新回答。
- [ ] 数字人口型驱动达到音素级同步，Three.js Avatar 根据 TTS phoneme/viseme 帧实时更新表情。
- [ ] 前后端统一采用 TypeScript/Node（含 infra 脚本），共享协议包（zod schema）。

### Out of Scope

- 原生移动/桌面客户端 — 仅交付 Web 端体验，后续如需扩展另行立项。
- 非 TypeScript 技术栈（如 Python 推理服务）— 会增加协调成本，与“全程 TS”要求冲突。

## Context

- 用户交互主通道为浏览器，通过两个 WebSocket：`/audio`（上行音频、下行 ASR ack）与 `/render`（下行 Agent token、TTS 音频、可视化事件）。
- VAD、ASR、LangChain Agent、TTS 皆需支持流式回传，RAG 医疗知识库提供内部文档与外部检索。
- Cite 元数据必须与生成 token 同步，方便侧栏渲染。
- Three.js Avatar 需要消费 phoneme/viseme 时间戳并驱动 SkinnedMesh；AudioWorklet 管理麦克风与扬声器通路。

## Constraints

- **技术栈**: 必须使用 TypeScript（Node、Deno 或浏览器）— 便于端到端类型共享。
- **实时性**: 单程延迟目标 <150ms；流式 token 与音频 chunk 最大 40ms，需支持 AbortController。
- **可靠性**: 医疗建议必须附引用来源，否则回答无效；需要 RAG 命中率监控。
- **可中断性**: 会话保持全双工，控制信令优先级高于内容流，打断处理必须<50ms。

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| LangChain + RAG 医疗知识库作为 Agent 大脑 | 现有工具链成熟，便于挂接搜索/tool/memory，能输出引用元数据 | — Pending |
| 双 WebSocket 通道分离音频与渲染事件 | 降低互相干扰，满足全双工与高优先级控制需求 | — Pending |
| Three.js 数字人使用 viseme/phoneme timeline 驱动 | 实现音素级口型同步，避免音频延迟感 | — Pending |

---
*Last updated: 2026-03-02 after questioning*
