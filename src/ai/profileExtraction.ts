import type { AppSettings, ExtractedProfile } from "../domain/types";
import { extractedProfileSchema } from "../domain/schemas";
import { callOpenAICompatible } from "./client";
import { hasUsableAiSettings } from "./settings";

function firstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

export function heuristicExtractProfile(text: string): ExtractedProfile {
  const normalized = text.replace(/\s+/g, " ");
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const name = firstMatch(text, [/name\s*[:|-]\s*([^\n]+)/i, /full name\s*[:|-]\s*([^\n]+)/i]);
  const degree = firstMatch(normalized, [/\b(Bachelor|Master|B\.Sc\.|M\.Sc\.|B\.A\.|M\.A\.|Diploma|PhD)[^,.]{0,80}/i]);
  const university = firstMatch(normalized, [/(?:University|Universität|Hochschule)\s+(?:of\s+)?([A-ZÄÖÜ][^,.]{2,80})/]);
  const gpa = firstMatch(normalized, [/\b(?:GPA|grade|final grade|note)\s*[:|-]?\s*([0-9][0-9.,/ ]{0,12})/i]);
  const ects = firstMatch(normalized, [/\b(1[0-9]{2}|2[0-9]{2}|3[0-9]{2})\s*ECTS\b/i]);
  const germanLevel = firstMatch(normalized, [/\b(?:German|Deutsch)\s*(?:level)?\s*[:|-]?\s*(A1|A2|B1|B2|C1|C2)\b/i]);
  const englishLevel = firstMatch(normalized, [/\b(?:English|Englisch)\s*(?:level)?\s*[:|-]?\s*(A1|A2|B1|B2|C1|C2)\b/i]);
  const fieldOfStudy = firstMatch(normalized, [
    /(?:field of study|study field|major|studiengang)\s*[:|-]\s*([^,.]{2,80})/i,
    /\b(?:Bachelor|Master|B\.Sc\.|M\.Sc\.|B\.A\.|M\.A\.)\s+(?:in|of)?\s*([^,.]{2,80})/i,
  ]);
  const courses = lines
    .filter((line) => /course|module|modul/i.test(line))
    .slice(0, 8)
    .map((line) => line.replace(/^(course|module|modul)\s*[:|-]\s*/i, ""));
  const workExperience = lines.filter((line) => /\b(intern|engineer|developer|assistant|manager|werkstudent|employee)\b/i.test(line)).slice(0, 8);

  return {
    name,
    degree,
    fieldOfStudy,
    university,
    gpa,
    ects,
    courses: courses.length ? courses : undefined,
    workExperience: workExperience.length ? workExperience : undefined,
    germanLevel,
    englishLevel,
  };
}

function parseJsonObject(content: string) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? content;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("No JSON object found in provider response.");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

export async function extractProfileFromDocumentText(text: string, settings: AppSettings) {
  if (!hasUsableAiSettings(settings)) {
    return {
      profile: heuristicExtractProfile(text),
      method: "local-heuristic" as const,
      warning: "No API key configured. Used local heuristic extraction only.",
    };
  }

  try {
    const content = await callOpenAICompatible(settings, [
      {
        role: "system",
        content:
          "Extract structured profile fields from the provided document text. Return only JSON. Do not infer unsupported values. Leave unknown fields out. The schema keys are: name, degree, fieldOfStudy, university, gpa, ects, courses, workExperience, germanLevel, englishLevel.",
      },
      {
        role: "user",
        content: text.slice(0, 24000),
      },
    ]);

    return {
      profile: extractedProfileSchema.parse(parseJsonObject(content)),
      method: "byok-ai" as const,
      warning: undefined,
    };
  } catch (error) {
    return {
      profile: heuristicExtractProfile(text),
      method: "local-heuristic" as const,
      warning: `AI extraction failed, so local heuristic extraction was used. ${error instanceof Error ? error.message : ""}`,
    };
  }
}
