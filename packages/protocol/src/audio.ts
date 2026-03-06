import { z } from "zod";

export const SUPPORTED_AUDIO_FORMATS = ["opus24"] as const;

export const PROTOCOL_VERSION = "0.1.0";

export const AudioHeaderSchema = z.object({
  sessionId: z.string().min(1, "sessionId required"),
  seq: z.number().int().nonnegative(),
  format: z.enum(SUPPORTED_AUDIO_FORMATS),
  chunkDurationMs: z.number().int().positive(),
  ts: z.number().nonnegative(),
  protocolVersion: z.string().default(() => PROTOCOL_VERSION)
});

export type AudioHeader = z.infer<typeof AudioHeaderSchema>;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const VERSION_MAX_LENGTH = 255;
const FORMAT_MAX_LENGTH = 255;
const SESSION_MAX_LENGTH = 65535;

function encodeString(target: Uint8Array, offset: number, value: string) {
  target.set(textEncoder.encode(value), offset);
}

function decodeString(bytes: Uint8Array, offset: number, length: number) {
  return textDecoder.decode(bytes.slice(offset, offset + length));
}

function computeHeaderSize(header: AudioHeader) {
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

  return (
    1 + versionLength +
    1 + formatLength +
    2 + sessionLength +
    4 + // seq
    2 + // chunkDurationMs
    8 // ts
  );
}

/**
 * Encode header metadata into a compact binary payload. Useful for prepending to Opus chunks.
 */
export function encodeBinaryHeader(header: Omit<AudioHeader, "protocolVersion">): ArrayBuffer {
  const normalized = AudioHeaderSchema.parse({ ...header, protocolVersion: PROTOCOL_VERSION });
  const buffer = new ArrayBuffer(computeHeaderSize(normalized));
  const view = new DataView(buffer);
  writeBinaryHeader(view, normalized);
  return buffer;
}

export function writeBinaryHeader(view: DataView, header: Omit<AudioHeader, "protocolVersion"> | AudioHeader, byteOffset = 0) {
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

/**
 * Decode a binary header previously encoded with {@link encodeBinaryHeader}.
 */
export function decodeBinaryHeader(buffer: ArrayBuffer): AudioHeader {
  const view = new DataView(buffer);
  return readBinaryHeader(view).header;
}

export function readBinaryHeader(view: DataView, byteOffset = 0): { header: AudioHeader; byteLength: number } {
  const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  let cursor = byteOffset;

  const versionLength = view.getUint8(cursor);
  cursor += 1;
  const protocolVersion = decodeString(bytes, cursor, versionLength);
  cursor += versionLength;

  const formatLength = view.getUint8(cursor);
  cursor += 1;
  const format = decodeString(bytes, cursor, formatLength) as AudioHeader["format"];
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
