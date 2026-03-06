# @alex/protocol

Versioned schema + helpers for the duplex realtime backbone. All channels share the same `PROTOCOL_VERSION`. Any backward-incompatible field change bumps the minor version, while additive metadata bumps patch.

## Published artifacts

- `AudioHeaderSchema` — metadata for binary Opus frames
- `RenderEnvelopeSchema` — agent/TTS payload with citations & visemes
- `ControlFrameSchema` — interrupt/start/resume actions with ack tracking
- `encodeBinaryHeader` / `decodeBinaryHeader`

## Version policy

```
0.x.y  → compatible with Phase 1 builds
1.0.0  → first GA cut once CTRL-02 verified in prod
```

Breaking protocol changes must add a new `protocolVersion` and keep the previous struct available for at least one release.
