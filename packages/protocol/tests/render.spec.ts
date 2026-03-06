import { describe, expect, it } from "vitest";
import { RenderEnvelopeSchema } from "../src/render.js";

describe("RenderEnvelopeSchema", () => {
  it("allows empty visemes/citations by default", () => {
    const payload = RenderEnvelopeSchema.parse({
      sessionId: "sess",
      token: "hello",
      latencyMs: 12
    });
    expect(payload.visemes).toEqual([]);
    expect(payload.citeRefs).toEqual([]);
  });

  it("rejects invalid citation URL", () => {
    expect(() => RenderEnvelopeSchema.parse({
      sessionId: "sess",
      token: "hi",
      latencyMs: 1,
      citeRefs: [{ id: "1", title: "bad", url: "notaurl", confidence: 0.9 }]
    })).toThrow();
  });
});
