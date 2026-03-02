# Roadmap: Alex Health Concierge

## Overview
先搭建实时双通道骨干和监控，再落实引用/合规，再把对话大脑打磨到流式水准，最后让数字人表达到位。共四个阶段，从基础协议→可信证据→智能会话→沉浸表达。

## Phases

- [ ] **Phase 1: Duplex Realtime Backbone** - 建立双 WebSocket、打断控制与可观测性基线。
- [ ] **Phase 2: Evidence & Compliance Fabric** - 让医疗建议全都有引用、降级策略与审计。
- [ ] **Phase 3: Conversational Intelligence Core** - 交付流式 LangChain Agent + 多轮记忆 + 工具路由。
- [ ] **Phase 4: Expressive Digital Human Experience** - Three.js 数字人 + 双语 TTS + 引用侧栏与导出。

## Phase Details

### Phase 1: Duplex Realtime Backbone
**Goal**: 让浏览器与后台通过双 WebSocket 保持低延迟全双工，打断与监控基础全部可用。
**Depends on**: Nothing
**Requirements**: [CTRL-01, CTRL-02, CTRL-03]
**Success Criteria**:
  1. 浏览器 interrupt 控制帧 <50ms 获得 ACK 并停止所有流。
  2. `/audio` 与 `/render` 通道按 schema 校验通过，支持二进制 chunk + JSON header。
  3. 打断延迟、ASR/TTS 延迟、RAG 命中率实时可视化，压测脚本可复现。
**Plans**: 3 plans

Plans:
- [ ] 01-01: 协议与 shared schema（zod + @alex/protocol）。
- [ ] 01-02: Gateway & interrupt 引擎（uWS + control 优先级）。
- [ ] 01-03: Observability + 压测框架（k6 + dashboards）。

### Phase 2: Evidence & Compliance Fabric
**Goal**: 确保任何医疗回答都带引用、降级策略、审计追踪与权限控制。
**Depends on**: Phase 1
**Requirements**: [EVDC-01, EVDC-02, EVDC-03, EVDC-04]
**Success Criteria**:
  1. 侧栏在回答产生时实时显示 citation（标题、URL、摘要、可信度）。
  2. 无引用时语音+UI 同步提示“无法提供引用”，拒绝诊断。
  3. 审计日志记录每次检索、回答、用户上下文并可追溯。
  4. RAG 知识库访问使用最小权限并记录审批链。
**Plans**: 3 plans

Plans:
- [ ] 02-01: Citation callback & sidebar 协议。
- [ ] 02-02: 降级/拒答与提示流。
- [ ] 02-03: 审计与权限基线（日志流水线 + IAM）。

### Phase 3: Conversational Intelligence Core
**Goal**: 交付端到端 VAD→ASR→LangChain→TTS 流式路径并具备多轮记忆与 tool 调用能力。
**Depends on**: Phase 2
**Requirements**: [DCOR-01, DCOR-02, DCOR-03]
**Success Criteria**:
  1. 实际对话中端到端延迟<150ms，token 流不断流。
  2. 连续追问可引用同一会话及至少5条历史摘要。
  3. Agent 可调用 RAG + 搜索 + 内部工具并返回引用 ID（<1s）。
**Plans**: 3 plans

Plans:
- [ ] 03-01: VAD/ASR service 整合 + 会话缓冲。
- [ ] 03-02: LangChain LangGraph + 记忆/工具路由。
- [ ] 03-03: Streaming TTS 接入 + flow orchestration。

### Phase 4: Expressive Digital Human Experience
**Goal**: 呈现音素级同步的 Three.js 数字人与双语字幕、引用侧栏互动及导出能力。
**Depends on**: Phase 3
**Requirements**: [EXPR-01, EXPR-02, EXPR-03, EXPR-04]
**Success Criteria**:
  1. QA 录像显示音视频偏差<80ms，viseme 驱动平滑。
  2. 中/英字幕轨实时更新并可导出。
  3. Citation 面板可预览、点击新窗口打开，状态同步。
  4. 会话结束自动生成总结与带引用的导出文件。
**Plans**: 3 plans

Plans:
- [ ] 04-01: Viseme scheduler + Three.js avatar。
- [ ] 04-02: 双语字幕与音频同步。
- [ ] 04-03: Citation UI 互动 + 导出流水线。

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Duplex Realtime Backbone | 0/3 | Not started | - |
| 2. Evidence & Compliance Fabric | 0/3 | Not started | - |
| 3. Conversational Intelligence Core | 0/3 | Not started | - |
| 4. Expressive Digital Human Experience | 0/3 | Not started | - |

## Backlog / Future Phases
- Persona/语气调控（DCOR-04）与多模态图表（EXPR-05）将在 v1.1 考虑。
- 可穿戴/FHIR 数据接入（CTRL-04）需合规准备，暂列 Backlog。
