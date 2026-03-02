# Feature Research — Alex Health Concierge

**Domain:** 实时数字人健康咨询
**Researched:** 2026-03-02
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 实时语音问答 (语音→语音) | 语音助手基线体验 | HIGH | 需低延迟ASR/TTS、打断支持 |
| 医疗知识引用 | 健康建议需可信来源 | MEDIUM | RAG检索+UI侧边栏呈现 |
| 可打断对话 | 用户希望随时纠正 | MEDIUM | Duplex WS + 快速Abort控制 |
| 数字人面部同步 | 沉浸式体验必备 | HIGH | phoneme/viseme驱动 |
| 多轮上下文记忆 | 追踪症状、历史建议 | MEDIUM | LangGraph memory+vector store |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 体征/设备数据 ingest | 融合可穿戴数据给出建议 | HIGH | 需OAuth+FHIR pipeline |
| 角色化人格脚本 | 提升亲和力和长期粘性 | MEDIUM | Prompt模版+情绪状态机 |
| 多模态可视化 (图表展示) | 结合语音解释+图表 | MEDIUM | 同步生成ECharts配置 |
| 双语切换+字幕 | 服务不同用户群 | MEDIUM | ASR/TTS多语言+字幕轨 |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| 直接给医疗诊断 | 用户想要结论 | 法律风险/HIPAA | 提供风险提示+鼓励就医 |
| 完全离线运行 | 追求隐私 | 模型/知识大，端侧难实现 | 提供端到端加密+本地缓存 |
| 单WS承载全部流量 | 想简化部署 | 控制信令延迟不可控 | 保持双通道结构 |

## Feature Dependencies

```
Full-duplex Interrupt
    └──requires──> Duplex WebSocket Protocol
                       └──requires──> Session Orchestrator

Viseme-synced Avatar
    └──requires──> TTS Phoneme Timeline
                      └──requires──> Streaming TTS Provider

Citation Sidebar
    └──requires──> Agent Token Metadata
                      └──requires──> RAG Retrieval Trace
```

### Dependency Notes
- **Full-duplex interrupt requires Duplex WS:** 控制帧必须与音频隔离，否则打断会被缓冲。
- **Viseme-synced Avatar requires TTS phoneme timeline:** 没有音素时间戳无法驱动 blendshape。
- **Citation sidebar requires agent metadata:** 生成时注入 citation id，否则无法定位来源。

## MVP Definition

### Launch With (v1)
- [ ] 实时语音问答 pipeline — 核心价值
- [ ] Citation sidebar — 确保可信度
- [ ] Viseme 数字人渲染 — 用户体验
- [ ] 打断控制 — 避免长篇独白

### Add After Validation (v1.x)
- [ ] Subtitles + transcript download — 适合听力/复盘
- [ ] 健康日志记忆（跨会话）— 需持久化

### Future Consideration (v2+)
- [ ] 可穿戴数据融合 — 待合规/合作
- [ ] 多角色人格库 — 市场验证后扩展

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| 实时语音问答 | HIGH | HIGH | P1 |
| Citation sidebar | HIGH | MEDIUM | P1 |
| Viseme avatar | MEDIUM | HIGH | P1 |
| 打断控制 | HIGH | MEDIUM | P1 |
| Subtitles | MEDIUM | LOW | P2 |
| Wearable ingest | HIGH | HIGH | P3 |
| Persona scripting | MEDIUM | MEDIUM | P2 |

## Competitor Feature Analysis

| Feature | Competitor A (Curio) | Competitor B (HealthGPT) | Our Approach |
|---------|---------------------|---------------------------|--------------|
| Citation显示 | 仅在全文结尾列出链接 | 无引用 | Token级别侧栏展示 |
| 打断 | 不支持 | 延迟>1s | <50ms Abort，重新流式 |
| 数字人 | 2D Avatar | 无 | Three.js 3D数字人 |
| 数据融合 | Apple Health 只读 | 不支持 | 后续接入 FHIR/可穿戴 |

## Sources
- 公共数字人平台 demo（Soul Machines、Sensely）功能对比
- LangChain TS / RAG 医疗应用案例分享 (2025)
- ElevenLabs/Azure viseme streaming 文档

---
*Feature research for: 实时数字人健康咨询*
*Researched: 2026-03-02*
