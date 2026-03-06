import { z } from "zod";
import { PROTOCOL_VERSION } from "./audio.js";

export const VisemeFrameSchema = z.object({
  id: z.string().min(1),
  startMs: z.number().nonnegative(),
  endMs: z.number().nonnegative()
}).superRefine((val, ctx) => {
  if (val.endMs < val.startMs) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "endMs must be >= startMs"
    });
  }
});

export const CitationRefSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  confidence: z.number().min(0).max(1)
});

export const RenderEnvelopeSchema = z.object({
  sessionId: z.string(),
  token: z.string(),
  latencyMs: z.number().nonnegative(),
  visemes: z.array(VisemeFrameSchema).default(() => []),
  citeRefs: z.array(CitationRefSchema).default(() => []),
  protocolVersion: z.string().default(() => PROTOCOL_VERSION)
});

export type RenderEnvelope = z.infer<typeof RenderEnvelopeSchema>;
