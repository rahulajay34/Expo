import { z } from "zod/v4";

export const generationConfigSchema = z.object({
  topic: z.string().min(1, "Topic is required").max(200, "Topic is too long"),
  subtopics: z.array(z.string()).default([]),
  contentType: z.enum(["lecture", "pre-read", "assignment"]),
  transcript: z.string().optional(),
  mcscCount: z.number().int().min(0).max(20).default(4),
  mcmcCount: z.number().int().min(0).max(20).default(4),
  subjectiveCount: z.number().int().min(0).max(10).default(1),
});

export type GenerationConfigInput = z.infer<typeof generationConfigSchema>;

