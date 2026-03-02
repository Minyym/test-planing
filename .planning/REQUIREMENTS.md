# Requirements: Alex Health Concierge

**Defined:** 2026-03-02
**Core Value:** 提供可被用户随时打断、低延迟且附引用的语音健康咨询体验。

## v1 Requirements

### Dialogue Core
- [ ] **DCOR-01**: 用户语音提问后，系统在同一会话中完成 VAD→ASR→LangChain Agent→TTS 的流式处理，端到端延迟<150ms。
- [ ] **DCOR-02**: 系统保存多轮上下文（当前会话+最近至少5条历史摘要），确保追问可引用既往症状与建议。
- [ ] **DCOR-03**: Agent 可在响应过程中调用 RAG 医疗知识库与联网工具，并在 1 秒内返回引用到的证据 ID。

### Evidence & Compliance
- [ ] **EVDC-01**: 每条包含医疗建议的句子必须附 citation，侧栏显示来源标题、URL、摘要与可信度。
- [ ] **EVDC-02**: 若检索不到可靠来源，则语音与 UI 同步输出“本条建议无法提供引用”的降级提示，并拒绝给出直接医疗结论。
- [ ] **EVDC-03**: 系统对每次检索和回答写入不可篡改的审计日志（时间、用户ID、文档ID、回答ID）。
- [ ] **EVDC-04**: 医疗知识库访问采用最小权限控制，所有请求需带会话/用户鉴权令牌并记录审批链。

### Expression & Output
- [ ] **EXPR-01**: Three.js 数字人根据 TTS 返回的 phoneme/viseme 帧实时驱动口型和表情，音视频偏差<80ms。
- [ ] **EXPR-02**: TTS 输出双语（中文/英文）字幕轨，并与音频同步写入字幕面板。
- [ ] **EXPR-03**: 侧边栏可与 citation 互动（预览摘要、点击跳转），并在 Agent token 级实时更新。
- [ ] **EXPR-04**: 会话结束后可导出全文字幕与摘要（PDF/Markdown），包含引用编号。

### Control & Systems
- [ ] **CTRL-01**: 浏览器可随时发送 interrupt 控制帧，Gateway 在 <50ms 内 ACK 并停止 ASR/Agent/TTS 当前输出。
- [ ] **CTRL-02**: Duplex WebSocket 协议（/audio, /render, control channel）以 zod schema 定义并共享给前后端。
- [ ] **CTRL-03**: 建立可视化指标与压测框架，实时展示 ASR/TTS 延迟、RAG 命中率、打断成功率。

## v2 Requirements

### Dialogue Core
- **DCOR-04**: 支持 persona/语气调控（专业/亲和/严肃），并在一次会话中可动态切换。

### Expression & Output
- **EXPR-05**: Agent 在回答中可生成图表/可视化（如健康趋势）并与语音同步展示。

### Control & Systems
- **CTRL-04**: 接入可穿戴设备或 FHIR 数据源，允许用户授权上传体征并在回答中引用。

## Out of Scope

| Feature | Reason |
|---------|--------|
| 原生移动/桌面客户端 | 聚焦 Web 端加速交付，移动端另起项目 |
| 离线本地推理模式 | 模型与知识库体积大、合规风险高 |
| 全自动医疗诊断 | 法律与行医资格限制，仅提供建议与风险提示 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DCOR-01 | Phase ? | Pending |
| DCOR-02 | Phase ? | Pending |
| DCOR-03 | Phase ? | Pending |
| EVDC-01 | Phase ? | Pending |
| EVDC-02 | Phase ? | Pending |
| EVDC-03 | Phase ? | Pending |
| EVDC-04 | Phase ? | Pending |
| EXPR-01 | Phase ? | Pending |
| EXPR-02 | Phase ? | Pending |
| EXPR-03 | Phase ? | Pending |
| EXPR-04 | Phase ? | Pending |
| CTRL-01 | Phase ? | Pending |
| CTRL-02 | Phase ? | Pending |
| CTRL-03 | Phase ? | Pending |
| DCOR-04 | Phase ? | Pending |
| EXPR-05 | Phase ? | Pending |
| CTRL-04 | Phase ? | Pending |

**Coverage:**
- v1 requirements: 13 total
- Mapped to phases: 0
- Unmapped: 13 ⚠️

---
*Requirements defined: 2026-03-02*
*Last updated: 2026-03-02 after initial definition*
