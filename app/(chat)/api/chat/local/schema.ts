import { z } from "zod";

const textPartSchema = z.object({
  text: z.string().min(1).max(2000),
  type: z.enum(["text"]),
});

const assistantPartSchema = z.object({
  text: z.string().min(1),
  type: z.enum(["text"]),
});

export const localRequestBodySchema = z.object({
  assistantMessage: z.object({
    id: z.string(),
    parts: z.array(assistantPartSchema),
    role: z.enum(["assistant"]),
  }),
  id: z.uuid(),
  message: z.object({
    id: z.uuid(),
    parts: z.array(textPartSchema),
    role: z.enum(["user"]),
  }),
  selectedVisibilityType: z.enum(["public", "private"]),
});

export type LocalRequestBody = z.infer<typeof localRequestBodySchema>;
