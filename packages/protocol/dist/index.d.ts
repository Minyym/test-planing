import { z } from 'zod';

declare const PROTOCOL_VERSION = "0.1.0";
declare const AudioHeaderSchema: z.ZodObject<{
    sessionId: z.ZodString;
    seq: z.ZodNumber;
    format: z.ZodEnum<["opus24"]>;
    chunkDurationMs: z.ZodNumber;
    ts: z.ZodNumber;
    protocolVersion: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sessionId: string;
    seq: number;
    format: "opus24";
    chunkDurationMs: number;
    ts: number;
    protocolVersion: string;
}, {
    sessionId: string;
    seq: number;
    format: "opus24";
    chunkDurationMs: number;
    ts: number;
    protocolVersion?: string | undefined;
}>;
type AudioHeader = z.infer<typeof AudioHeaderSchema>;
/**
 * Encode header metadata into a compact binary payload. Useful for prepending to Opus chunks.
 */
declare function encodeBinaryHeader(header: Omit<AudioHeader, "protocolVersion">): ArrayBuffer;
declare function writeBinaryHeader(view: DataView, header: Omit<AudioHeader, "protocolVersion"> | AudioHeader, byteOffset?: number): number;
/**
 * Decode a binary header previously encoded with {@link encodeBinaryHeader}.
 */
declare function decodeBinaryHeader(buffer: ArrayBuffer): AudioHeader;
declare function readBinaryHeader(view: DataView, byteOffset?: number): {
    header: AudioHeader;
    byteLength: number;
};

declare const VisemeFrameSchema: z.ZodEffects<z.ZodObject<{
    id: z.ZodString;
    startMs: z.ZodNumber;
    endMs: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    startMs: number;
    endMs: number;
}, {
    id: string;
    startMs: number;
    endMs: number;
}>, {
    id: string;
    startMs: number;
    endMs: number;
}, {
    id: string;
    startMs: number;
    endMs: number;
}>;
declare const CitationRefSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    url: z.ZodString;
    confidence: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    title: string;
    url: string;
    confidence: number;
}, {
    id: string;
    title: string;
    url: string;
    confidence: number;
}>;
declare const RenderEnvelopeSchema: z.ZodObject<{
    sessionId: z.ZodString;
    token: z.ZodString;
    latencyMs: z.ZodNumber;
    visemes: z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodObject<{
        id: z.ZodString;
        startMs: z.ZodNumber;
        endMs: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        startMs: number;
        endMs: number;
    }, {
        id: string;
        startMs: number;
        endMs: number;
    }>, {
        id: string;
        startMs: number;
        endMs: number;
    }, {
        id: string;
        startMs: number;
        endMs: number;
    }>, "many">>;
    citeRefs: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        url: z.ZodString;
        confidence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        title: string;
        url: string;
        confidence: number;
    }, {
        id: string;
        title: string;
        url: string;
        confidence: number;
    }>, "many">>;
    protocolVersion: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sessionId: string;
    protocolVersion: string;
    token: string;
    latencyMs: number;
    visemes: {
        id: string;
        startMs: number;
        endMs: number;
    }[];
    citeRefs: {
        id: string;
        title: string;
        url: string;
        confidence: number;
    }[];
}, {
    sessionId: string;
    token: string;
    latencyMs: number;
    protocolVersion?: string | undefined;
    visemes?: {
        id: string;
        startMs: number;
        endMs: number;
    }[] | undefined;
    citeRefs?: {
        id: string;
        title: string;
        url: string;
        confidence: number;
    }[] | undefined;
}>;
type RenderEnvelope = z.infer<typeof RenderEnvelopeSchema>;

declare const ControlFrameSchema: z.ZodEffects<z.ZodObject<{
    type: z.ZodEnum<["interrupt", "resume", "start"]>;
    sessionId: z.ZodString;
    ackId: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
    protocolVersion: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sessionId: string;
    type: "interrupt" | "resume" | "start";
    protocolVersion: string;
    ackId: string;
    reason?: string | undefined;
}, {
    sessionId: string;
    type: "interrupt" | "resume" | "start";
    ackId: string;
    protocolVersion?: string | undefined;
    reason?: string | undefined;
}>, {
    sessionId: string;
    type: "interrupt" | "resume" | "start";
    protocolVersion: string;
    ackId: string;
    reason?: string | undefined;
}, {
    sessionId: string;
    type: "interrupt" | "resume" | "start";
    ackId: string;
    protocolVersion?: string | undefined;
    reason?: string | undefined;
}>;
type ControlFrame = z.infer<typeof ControlFrameSchema>;

export { type AudioHeader, AudioHeaderSchema, CitationRefSchema, type ControlFrame, ControlFrameSchema, PROTOCOL_VERSION, type RenderEnvelope, RenderEnvelopeSchema, VisemeFrameSchema, decodeBinaryHeader, encodeBinaryHeader, readBinaryHeader, writeBinaryHeader };
