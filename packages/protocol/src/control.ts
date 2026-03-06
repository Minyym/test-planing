import { z } from "zod";
import { PROTOCOL_VERSION } from "./audio.js";

const ControlTypeSchema = z.enum(["interrupt", "resume", "start"]);

export const ControlFrameSchema = z.object({
  type: ControlTypeSchema,
  sessionId: z.string().min(1),
  ackId: z.string().min(1),
  reason: z.string().optional(),
  protocolVersion: z.string().default(() => PROTOCOL_VERSION)
}).refine((data) => {
  if (data.type === "interrupt") {
    return Boolean(data.ackId);
  }
  return true;
}, {
  message: "ackId is required for interrupt"
});

export type ControlFrame = z.infer<typeof ControlFrameSchema>;
