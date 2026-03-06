// src/audio.ts
import { z } from "zod";
var SUPPORTED_AUDIO_FORMATS = ["opus24"];
var PROTOCOL_VERSION = "0.1.0";
var AudioHeaderSchema = z.object({
  sessionId: z.string().min(1, "sessionId required"),
  seq: z.number().int().nonnegative(),
  format: z.enum(SUPPORTED_AUDIO_FORMATS),
  chunkDurationMs: z.number().int().positive(),
  ts: z.number().nonnegative(),
  protocolVersion: z.string().default(() => PROTOCOL_VERSION)
});
var textEncoder = new TextEncoder();
var textDecoder = new TextDecoder();
var VERSION_MAX_LENGTH = 255;
var FORMAT_MAX_LENGTH = 255;
var SESSION_MAX_LENGTH = 65535;
function encodeString(target, offset, value) {
  target.set(textEncoder.encode(value), offset);
}
function decodeString(bytes, offset, length) {
  return textDecoder.decode(bytes.slice(offset, offset + length));
}
function computeHeaderSize(header) {
  const versionLength = textEncoder.encode(header.protocolVersion).length;
  const formatLength = textEncoder.encode(header.format).length;
  const sessionLength = textEncoder.encode(header.sessionId).length;
  if (versionLength > VERSION_MAX_LENGTH) {
    throw new Error("protocolVersion too long for binary header");
  }
  if (formatLength > FORMAT_MAX_LENGTH) {
    throw new Error("format too long for binary header");
  }
  if (sessionLength > SESSION_MAX_LENGTH) {
    throw new Error("sessionId too long for binary header");
  }
  return 1 + versionLength + 1 + formatLength + 2 + sessionLength + 4 + // seq
  2 + // chunkDurationMs
  8;
}
function encodeBinaryHeader(header) {
  const normalized = AudioHeaderSchema.parse({ ...header, protocolVersion: PROTOCOL_VERSION });
  const buffer = new ArrayBuffer(computeHeaderSize(normalized));
  const view = new DataView(buffer);
  writeBinaryHeader(view, normalized);
  return buffer;
}
function writeBinaryHeader(view, header, byteOffset = 0) {
  const normalized = AudioHeaderSchema.parse({ ...header, protocolVersion: PROTOCOL_VERSION });
  const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  const versionBytes = textEncoder.encode(normalized.protocolVersion);
  const formatBytes = textEncoder.encode(normalized.format);
  const sessionBytes = textEncoder.encode(normalized.sessionId);
  let cursor = byteOffset;
  view.setUint8(cursor, versionBytes.length);
  cursor += 1;
  encodeString(bytes, cursor, normalized.protocolVersion);
  cursor += versionBytes.length;
  view.setUint8(cursor, formatBytes.length);
  cursor += 1;
  encodeString(bytes, cursor, normalized.format);
  cursor += formatBytes.length;
  view.setUint16(cursor, sessionBytes.length, false);
  cursor += 2;
  encodeString(bytes, cursor, normalized.sessionId);
  cursor += sessionBytes.length;
  view.setUint32(cursor, normalized.seq, false);
  cursor += 4;
  view.setUint16(cursor, normalized.chunkDurationMs, false);
  cursor += 2;
  view.setBigUint64(cursor, BigInt(normalized.ts), false);
  cursor += 8;
  return cursor - byteOffset;
}
function decodeBinaryHeader(buffer) {
  const view = new DataView(buffer);
  return readBinaryHeader(view).header;
}
function readBinaryHeader(view, byteOffset = 0) {
  const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  let cursor = byteOffset;
  const versionLength = view.getUint8(cursor);
  cursor += 1;
  const protocolVersion = decodeString(bytes, cursor, versionLength);
  cursor += versionLength;
  const formatLength = view.getUint8(cursor);
  cursor += 1;
  const format = decodeString(bytes, cursor, formatLength);
  cursor += formatLength;
  const sessionLength = view.getUint16(cursor, false);
  cursor += 2;
  const sessionId = decodeString(bytes, cursor, sessionLength);
  cursor += sessionLength;
  const seq = view.getUint32(cursor, false);
  cursor += 4;
  const chunkDurationMs = view.getUint16(cursor, false);
  cursor += 2;
  const ts = Number(view.getBigUint64(cursor, false));
  cursor += 8;
  const parsed = AudioHeaderSchema.parse({
    sessionId,
    seq,
    format,
    chunkDurationMs,
    ts,
    protocolVersion
  });
  return { header: parsed, byteLength: cursor - byteOffset };
}

// src/render.ts
import { z as z2 } from "zod";
var VisemeFrameSchema = z2.object({
  id: z2.string().min(1),
  startMs: z2.number().nonnegative(),
  endMs: z2.number().nonnegative()
}).superRefine((val, ctx) => {
  if (val.endMs < val.startMs) {
    ctx.addIssue({
      code: z2.ZodIssueCode.custom,
      message: "endMs must be >= startMs"
    });
  }
});
var CitationRefSchema = z2.object({
  id: z2.string().min(1),
  title: z2.string().min(1),
  url: z2.string().url(),
  confidence: z2.number().min(0).max(1)
});
var RenderEnvelopeSchema = z2.object({
  sessionId: z2.string(),
  token: z2.string(),
  latencyMs: z2.number().nonnegative(),
  visemes: z2.array(VisemeFrameSchema).default(() => []),
  citeRefs: z2.array(CitationRefSchema).default(() => []),
  protocolVersion: z2.string().default(() => PROTOCOL_VERSION)
});

// src/control.ts
import { z as z3 } from "zod";
var ControlTypeSchema = z3.enum(["interrupt", "resume", "start"]);
var ControlFrameSchema = z3.object({
  type: ControlTypeSchema,
  sessionId: z3.string().min(1),
  ackId: z3.string().min(1),
  reason: z3.string().optional(),
  protocolVersion: z3.string().default(() => PROTOCOL_VERSION)
}).refine((data) => {
  if (data.type === "interrupt") {
    return Boolean(data.ackId);
  }
  return true;
}, {
  message: "ackId is required for interrupt"
});
export {
  AudioHeaderSchema,
  CitationRefSchema,
  ControlFrameSchema,
  PROTOCOL_VERSION,
  RenderEnvelopeSchema,
  VisemeFrameSchema,
  decodeBinaryHeader,
  encodeBinaryHeader,
  readBinaryHeader,
  writeBinaryHeader
};
