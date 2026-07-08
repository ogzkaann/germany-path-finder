import type { EvidenceCoverage, PathName, RagAnalysisState, RetrievedChunk, RiskLevel } from "../domain/types";

const pathConcepts: Record<PathName, string[]> = {
  Ausbildung: ["ausbildung", "berufsausbildung", "16a", "vocational training"],
  "Master / Studium": ["studium", "master", "16b", "university", "zulassung"],
  Studienbewerber: ["studienbewerber", "study applicant", "17", "zulassung"],
  "Skilled job": ["fachkraft", "skilled", "18a", "18b", "employment"],
  "EU Blue Card": ["blue card", "blaue karte", "18g"],
  Chancenkarte: ["chancenkarte", "opportunity card", "20a"],
};

const conceptKeywords: Record<string, string[]> = {
  Chancenkarte: ["chancenkarte", "opportunity card", "20a", "such-chancenkarte", "folge-chancenkarte"],
  Ausbildung: ["ausbildung", "berufsausbildung", "16a", "vocational training"],
  Zweckwechsel: ["zweckwechsel", "aufenthaltszweck", "change of residence purpose", "wechsel"],
  Studium: ["studium", "16b", "studienbewerber", "university admission", "zulassung"],
  "EU Blue Card": ["blue card", "blaue karte", "18g"],
  "Skilled worker": ["fachkraft", "18a", "18b", "skilled worker"],
};

function normalize(input: string) {
  return input.toLowerCase().normalize("NFKD");
}

function citationHaystack(citation: RetrievedChunk) {
  return normalize(
    [citation.title, citation.authority, citation.fileName, citation.tags.join(" "), citation.text].filter(Boolean).join(" "),
  );
}

function questionHas(question: string, keywords: string[]) {
  const lower = normalize(question);
  return keywords.some((keyword) => lower.includes(normalize(keyword)));
}

function citationsHave(citations: RetrievedChunk[], keywords: string[]) {
  return citations.some((citation) => {
    const haystack = citationHaystack(citation);
    return keywords.some((keyword) => haystack.includes(normalize(keyword)));
  });
}

function detectRelevantPath(question: string): PathName | undefined {
  return (Object.entries(pathConcepts).find(([, keywords]) => questionHas(question, keywords))?.[0] ?? undefined) as
    | PathName
    | undefined;
}

function transitionResult(missingEvidence: string[]): RiskLevel {
  if (missingEvidence.length >= 2) return "red";
  return "yellow";
}

function detectTransition(question: string, citations: RetrievedChunk[]) {
  const hasChancenkarte = questionHas(question, conceptKeywords.Chancenkarte);
  const hasAusbildung = questionHas(question, conceptKeywords.Ausbildung);
  if (!hasChancenkarte || !hasAusbildung) return undefined;

  const missingEvidence: string[] = [];
  const hasFromEvidence = citationsHave(citations, conceptKeywords.Chancenkarte);
  const hasTargetEvidence = citationsHave(citations, conceptKeywords.Ausbildung);
  const hasChangeEvidence = citationsHave(citations, conceptKeywords.Zweckwechsel);

  if (!hasFromEvidence) missingEvidence.push("No indexed Chancenkarte source evidence was found.");
  if (!hasTargetEvidence) missingEvidence.push("No indexed Ausbildung residence source was found.");
  if (!hasChangeEvidence) missingEvidence.push("No indexed change-of-purpose / Zweckwechsel evidence was found.");

  return {
    fromStatus: "Chancenkarte",
    targetPath: "Ausbildung" as PathName,
    foundSourceTitles: Array.from(new Set(citations.map((citation) => citation.title))).slice(0, 6),
    missingEvidence,
    conservativeResult: transitionResult(missingEvidence),
    needsOfficialVerification: true,
  };
}

function buildCoverage(question: string, citations: RetrievedChunk[]): EvidenceCoverage {
  const expectedConcepts = Object.entries(conceptKeywords)
    .filter(([, keywords]) => questionHas(question, keywords))
    .map(([concept]) => concept);
  const coveredConcepts = expectedConcepts.filter((concept) => citationsHave(citations, conceptKeywords[concept]));
  const missingEvidence = expectedConcepts
    .filter((concept) => !coveredConcepts.includes(concept))
    .map((concept) => `No indexed ${concept} evidence was found.`);

  if (expectedConcepts.includes("Chancenkarte") && expectedConcepts.includes("Ausbildung")) {
    if (!citationsHave(citations, conceptKeywords.Zweckwechsel)) {
      missingEvidence.push("No indexed change-of-purpose / Zweckwechsel evidence was found.");
    }
  }

  return {
    retrievedSourceCount: new Set(citations.map((citation) => citation.sourceId)).size,
    categoriesUsed: Array.from(new Set(citations.map((citation) => citation.metadata.category))),
    coveredConcepts,
    missingEvidence: Array.from(new Set(missingEvidence)),
  };
}

export function buildRagAnalysis(question: string, citations: RetrievedChunk[]): RagAnalysisState {
  const detectedIntent = Object.entries(conceptKeywords)
    .filter(([, keywords]) => questionHas(question, keywords))
    .map(([concept]) => concept);
  const transition = detectTransition(question, citations);
  const evidenceCoverage = buildCoverage(question, citations);

  return {
    lastQuestion: question,
    retrievedCitations: citations,
    detectedIntent,
    relevantPath: transition?.targetPath ?? detectRelevantPath(question),
    evidenceCoverage,
    missingEvidence: evidenceCoverage.missingEvidence,
    transition,
    updatedAt: new Date().toISOString(),
  };
}

export function pathHasEvidence(path: PathName, citations: RetrievedChunk[]) {
  return citationsHave(citations, pathConcepts[path]);
}

export function pathEvidenceChunks(path: PathName, citations: RetrievedChunk[]) {
  return citations.filter((citation) => citationsHave([citation], pathConcepts[path]));
}
