import type { AppSettings, Profile, RagAnswer, RetrievedChunk } from "../domain/types";
import { callOpenAICompatible } from "./client";
import { hasUsableAiSettings } from "./settings";
import { dedupeRetrievedCitations } from "../rag/retrieval";

function citationLabel(chunk: RetrievedChunk, index: number) {
  const page = chunk.pageNumber ? `page ${chunk.pageNumber}` : "manual/no page";
  return `[C${index + 1}] ${chunk.title} - ${chunk.authority ?? "Unknown authority"} - ${chunk.fileName}, ${page}, chunk ${chunk.chunkIndex}`;
}

function profileSummary(profile?: Profile) {
  if (!profile) return "No saved local profile.";
  return JSON.stringify(
    {
      currentStatus: profile.currentStatus,
      city: profile.city,
      state: profile.state,
      germanLevel: profile.germanLevel,
      educationBackground: profile.educationBackground,
      workExperience: profile.workExperience,
      goal: profile.goal,
      extracted: profile.extracted,
    },
    null,
    2,
  );
}

function localSourcedAnswer(question: string, chunks: RetrievedChunk[], profile?: Profile): string {
  const lines = [
    "I found relevant text in the provided sources, but I cannot make a legal eligibility claim from this MVP alone.",
    "",
    `Question: ${question}`,
    "",
    "Relevant source evidence:",
    ...chunks.map((chunk, index) => {
      const snippet = chunk.text.length > 420 ? `${chunk.text.slice(0, 420)}...` : chunk.text;
      return `${citationLabel(chunk, index)}: ${snippet}`;
    }),
    "",
    "Profile context used locally:",
    profile
      ? `${profile.currentStatus || "No status"} in ${profile.city || "unknown city"} / ${profile.state || "unknown state"}, German ${profile.germanLevel || "unknown"}, goal ${profile.goal}.`
      : "No saved profile.",
    "",
    "Official verification is still needed before acting.",
  ];

  return lines.join("\n");
}

function providerWarningForError(message: string) {
  if (message.includes("Provider returned 503")) {
    return "AI provider temporarily unavailable. Source retrieval still worked.";
  }

  return "AI explanation failed. Source retrieval still worked.";
}

export async function answerWithRetrievedSources(
  question: string,
  chunks: RetrievedChunk[],
  profile: Profile | undefined,
  settings: AppSettings,
  officialChunkCount = chunks.length,
): Promise<RagAnswer> {
  const citations = dedupeRetrievedCitations(chunks);

  if (citations.length === 0) {
    return {
      question,
      answer:
        officialChunkCount === 0
          ? "No official sources are indexed yet. Go to Official Knowledge Vault and click Index preloaded official sources."
          : "Not found in provided sources.",
      citations: [],
      status: "not-found",
      statusLabel: "No retrieved official evidence",
      createdAt: new Date().toISOString(),
    };
  }

  if (!hasUsableAiSettings(settings)) {
    return {
      question,
      answer: localSourcedAnswer(question, citations, profile),
      citations,
      status: "answered",
      statusLabel: "RAG retrieval succeeded / AI explanation not configured",
      createdAt: new Date().toISOString(),
    };
  }

  const sourcePacket = citations
    .map((chunk, index) => `${citationLabel(chunk, index)}\n${chunk.text}`)
    .join("\n\n---\n\n");

  try {
    const answer = await callOpenAICompatible(settings, [
      {
        role: "system",
        content:
          "You are a source-bound decision support assistant for Germany Path Finder. You are not a lawyer and must not give final legal advice. Use only the provided retrieved official source chunks and the reviewed local user profile. If the answer is not present, say exactly 'Not found in provided sources.' for that part. Cite every claim with [C#]. Never invent legal rules, thresholds, eligibility, or assumptions. Never claim legal certainty.",
      },
      {
        role: "user",
        content: `Question:\n${question}\n\nLocal profile:\n${profileSummary(profile)}\n\nRetrieved source chunks:\n${sourcePacket}\n\nAnswer in concise plain language with citations and uncertainty labels.`,
      },
    ]);

    return {
      question,
      answer,
      citations,
      status: "answered",
      statusLabel: "RAG + AI explanation succeeded",
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    const providerError = error instanceof Error ? error.message : "Unknown error";
    const warning = providerWarningForError(providerError);
    return {
      question,
      answer: localSourcedAnswer(question, citations, profile),
      citations,
      warning,
      providerError,
      status: "answered",
      statusLabel: "RAG retrieval succeeded / AI explanation failed",
      createdAt: new Date().toISOString(),
    };
  }
}
