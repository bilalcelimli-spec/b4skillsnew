import { z } from "zod";
import { CuidLike, LongText, ShortText } from "./common.js";

const ProctorSeverity = z.enum(["INFO", "WARNING", "CRITICAL"]);

export const ProctoringEventBody = z.object({
  sessionId: CuidLike,
  eventType: z.enum([
    "TAB_BLUR",
    "TAB_FOCUS",
    "FULLSCREEN_EXIT",
    "COPY_ATTEMPT",
    "PASTE_ATTEMPT",
    "DEVTOOLS_DETECTED",
    "FACE_NOT_DETECTED",
    "MULTIPLE_FACES",
    "SUSPICIOUS_MOVEMENT",
    "AUDIO_ANOMALY",
    "NETWORK_DISCONNECT",
    "NETWORK_RECONNECT",
    "OTHER",
  ]),
  severity: ProctorSeverity.optional(),
  timestamp: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  screenshotUrl: z.string().url().max(2048).optional(),
}).strict();

export const ProctoringAuditBody = z.object({
  sessionId: CuidLike,
  notes: LongText.optional(),
  decision: z.enum(["APPROVE", "FLAG", "REJECT", "ESCALATE"]),
  reviewer: ShortText.optional(),
  evidence: z.array(z.string().url().max(2048)).max(50).optional(),
}).strict();
