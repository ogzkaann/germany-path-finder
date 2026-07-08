import { z } from "zod";

export const goalSchema = z.enum([
  "ausbildung",
  "master",
  "skilled-job",
  "blue-card",
  "chancenkarte",
  "study-applicant",
]);

export const extractedProfileSchema = z.object({
  name: z.string().optional(),
  degree: z.string().optional(),
  fieldOfStudy: z.string().optional(),
  university: z.string().optional(),
  gpa: z.string().optional(),
  ects: z.string().optional(),
  courses: z.array(z.string()).optional(),
  workExperience: z.array(z.string()).optional(),
  germanLevel: z.string().optional(),
  englishLevel: z.string().optional(),
});

export const profileSchema = z.object({
  id: z.literal("local-profile"),
  currentStatus: z.string(),
  city: z.string(),
  state: z.string(),
  germanLevel: z.string(),
  educationBackground: z.string(),
  workExperience: z.string(),
  goal: goalSchema,
  extracted: extractedProfileSchema.optional(),
  updatedAt: z.string(),
});

export const knowledgeSourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  authority: z.string(),
  region: z.string(),
  category: z
    .enum(["official-law", "official-portals", "local-duesseldorf", "recognition", "language-integration"])
    .default("official-law"),
  jurisdiction: z.string().default("Germany"),
  filePath: z.string(),
  fileName: z.string().default(""),
  sourceUrl: z.string().default(""),
  lastChecked: z.string(),
  date_checked: z.string().default(""),
  documentType: z.string(),
  tags: z.array(z.string()),
  language: z.string().default("de"),
  status: z.enum(["available", "missing", "placeholder"]).default("placeholder"),
  source_type: z.literal("official_knowledge").default("official_knowledge"),
  official: z.boolean().default(true),
  official_non_official: z.enum(["official", "non_official"]).default("official"),
  user_scope: z.enum(["public", "private_user", "demo_private"]).default("public"),
});

export const recursiveKnowledgeSourceSchema: z.ZodTypeAny = z.lazy(() =>
  knowledgeSourceSchema.extend({
    children: z.array(recursiveKnowledgeSourceSchema).optional(),
  }),
);

export const manifestSchema = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  sources: z.array(recursiveKnowledgeSourceSchema),
});

export const appSettingsSchema = z.object({
  providerId: z.enum(["custom", "gemini", "openai", "anthropic"]).default("custom"),
  providerName: z.string().default("OpenAI-compatible"),
  endpoint: z.string(),
  apiKey: z.string(),
  model: z.string(),
});
