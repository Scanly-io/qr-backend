import { z } from "zod";

export const QREventSchema = z.object({

  event: z.literal("qr.scanned"),
  qrId: z.string(),
  userId: z.string(),
  timestamp: z.string(),
});

export const QREventV2Schema = z.object({
  event: z.literal("qr.scanned.v2"),
  qrId: z.string(),
  userId: z.string(),
  geo: z.object({ lat: z.number(), lon: z.number() }),
  timestamp: z.string(),
});

export type QREventV2 = z.infer<typeof QREventV2Schema>;

export type QREvent = z.infer<typeof QREventSchema>;

// Provide a default export to improve interop between CJS/ESM loaders
export default {
  QREventSchema,
  QREventV2Schema
};