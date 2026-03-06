import { describe, expect, it } from "vitest";
import { ControlFrameSchema } from "../src/control.js";
import { decodeBinaryHeader, encodeBinaryHeader, readBinaryHeader, writeBinaryHeader } from "../src/audio.js";

const baseHeader = {
  sessionId: "sess-1",
  seq: 0,
  format: "opus24" as const,
  chunkDurationMs: 20,
  ts: Date.now()
};

describe("ControlFrameSchema", () => {
  it("rejects interrupt without ackId", () => {
    expect(() => ControlFrameSchema.parse({
      type: "interrupt",
      sessionId: "abc",
      ackId: ""
    })).toThrow();
  });

  it("accepts resume frames", () => {
    const frame = ControlFrameSchema.parse({
      type: "resume",
      sessionId: "abc",
      ackId: "ack-1"
    });
    expect(frame.protocolVersion).toBeDefined();
  });
});

describe("audio header codec", () => {
  it("round trips", () => {
    const buffer = encodeBinaryHeader(baseHeader);
    const decoded = decodeBinaryHeader(buffer);
    expect(decoded).toMatchObject({ seq: 0, format: "opus24" });
  });

  it("writes into view and reports bytes consumed", () => {
    const view = new DataView(new ArrayBuffer(128));
    const bytesWritten = writeBinaryHeader(view, baseHeader);
    const { header, byteLength } = readBinaryHeader(view);
    expect(byteLength).toBe(bytesWritten);
    expect(header).toMatchObject({ sessionId: "sess-1", seq: 0, chunkDurationMs: 20 });
  });
});
