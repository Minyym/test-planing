# Pitfalls Research — Alex Health Concierge

**Domain:** 流式数字人健康咨询
**Researched:** 2026-03-02
**Confidence:** MEDIUM

## Critical Pitfalls

### Pitfall 1: Citation 丢失
**What goes wrong:** Agent 输出医疗建议但未同步来源，UI 无法展示可信度。
**Why it happens:** LLM 回调未携带 cite 元数据，或 RAG miss fallback 到 general knowledge。
**How to avoid:** LangChain Callback 强制要求每条医疗建议包含 cite_id；若无则 degrade 为“无法提供医疗建议”。
**Warning signs:** SUMMARY log 中 `citation=undefined`；UI 出现空 sidebar。
**Phase to address:** Phase 1 (对话大脑 & 引用协议)。

### Pitfall 2: 打断延迟>500ms
**What goes wrong:** 用户插话后旧答案仍继续播放，体验破裂。
**Why it happens:** 单通道 WS 或 TTS 不支持 Abort。
**How to avoid:** 分离控制帧；TTS/TTS播放器实现 AbortController；Gateway 优先处理 control 队列。
**Warning signs:** loadtest 中 interrupt ack >200ms；TTS日志缺少 abort。
**Phase to address:** Phase 0/1 网络与协议基建。

### Pitfall 3: 口型不同步
**What goes wrong:** Avatar 嘴型滞后音频数百毫秒。
**Why it happens:** 仅根据音频劲能 envelope 驱动，缺乏 phoneme timeline。
**How to avoid:** 选择支持 viseme streaming 的 TTS；Shared clock 校时；在 `/render` 协议附带 `ts`。
**Warning signs:** QA 录像中音视频 offset>120ms。
**Phase to address:** Phase 2 Avatar & TTS 集成。

### Pitfall 4: 医疗数据合规缺失
**What goes wrong:** 吸纳医疗资料但无审计/访问控制。
**Why it happens:** RAG 直接读取云存储，无最小权限。
**How to avoid:** 医疗知识库放在受控区，使用 service account + auditing，日志脱敏。
**Warning signs:** 向外部日志泄露 PHI。
**Phase to address:** Phase 1 数据/合规基线。

### Pitfall 5: WS session 泄漏
**What goes wrong:** 中断或网络抖动后 session 未释放，资源爆炸。
**Why it happens:** 未设置 keepalive / 心跳，Gateway 不清理。
**How to avoid:** 心跳 & TTL，Redis session store 定期 GC。
**Warning signs:** 连接数持续增长但活跃对话不变。
**Phase to address:** Phase 0 infra。

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| 单体服务内处理全部流 | 快速原型 | 无法水平扩展，难监控 | 仅 PoC |
| 忽略引用验证 | 回答更快 | 法律风险、失信 | 永不 |
| 省略 viseme pipeline | 省开发 | 体验差，后补代价大 | 永不 |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Deepgram streaming | 未发送 keepalive 导致断流 | 每5s ping/自研重连策略 |
| ElevenLabs viseme | 只用音频不处理 viseme 数组 | 解析 payload、映射到 blendshape |
| Brave Search | 速率限制 | 缓存+并发限制器 |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| 单 Worker 处理所有 WS | CPU 100%，延迟抖动 | uWS 多核+负载均衡 | ~500 并发 |
| 未压缩音频 | 带宽爆炸 | Opus 24kHz + chunk 40ms | >100 并发 |
| 否定缓存策略 | RAG 查询慢 | embed 缓存、冷热分层 | >每秒5请求 |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Cite 链接直指内部 URL | 泄露内部知识库 | 侧栏仅显示摘要+受控跳转 |
| WS 未鉴权 | 任意人占用资源 | JWT + session pinning |
| 录音未加密存储 | PHI 泄露 | S3 SSE-KMS + 短期保留策略 |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| 数字人长时间沉默 | 用户以为卡死 | 显示“正在思考” + 背景动作 |
| Sidebar 引用不可点 | 信任下降 | 提供预览 & 跳转 |

## "Looks Done But Isn't" Checklist

- [ ] 打断时 TTS 真正停止（查看日志 abort）
- [ ] Citation Sidebar 对每条医疗建议都有项
- [ ] Viseme 帧与音频偏差 <80ms（QA 脚本）
- [ ] WS session 在客户端关闭后 5s 内清理

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Citation 丢失 | MEDIUM | 回放日志，重新生成 cite，补发 UI |
| 打断延迟 | LOW | 重启 TTS worker，调整优先级 |
| WS 泄漏 | MEDIUM | 批量踢掉超时 session，部署心跳补丁 |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Citation 丢失 | Phase 1 Agent/RAG | 单元+E2E 检查 cite 事件 |
| 打断延迟 | Phase 0 Protocol | 压测确保 <50ms |
| 口型不同步 | Phase 2 表达层 | 录屏比对 |
| 合规缺失 | Phase 1 数据治理 | 安全审计 checklist |
| WS 泄漏 | Phase 0 Infra | 连接指标监控 |

## Sources
- 公开数字人产品故障复盘（Sensely outage note, 2025）
- LangChain Healthcare roundtable (2025Q4)
- Deepgram/ElevenLabs 官方指南

---
*Pitfalls research for: 流式数字人健康咨询*
*Researched: 2026-03-02*
