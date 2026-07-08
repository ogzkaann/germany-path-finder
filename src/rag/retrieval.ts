import type { RetrievedChunk, SourceChunk } from "../domain/types";
import { stableTextHash } from "./chunking";

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "can",
  "do",
  "for",
  "from",
  "i",
  "in",
  "is",
  "it",
  "my",
  "of",
  "on",
  "or",
  "the",
  "to",
  "und",
  "der",
  "die",
  "das",
  "ein",
  "eine",
  "mit",
  "von",
  "zu",
]);

const queryExpansion: Array<{ triggers: string[]; terms: string[] }> = [
  {
    triggers: ["ausbildung", "training", "vocational"],
    terms: ["berufsausbildung", "vocational training", "16a", "§16a", "ausbildungserlaubnis"],
  },
  {
    triggers: ["chancenkarte", "opportunity"],
    terms: ["20a", "§20a", "opportunity card", "such-chancenkarte", "folge-chancenkarte"],
  },
  {
    triggers: ["studium", "study", "master", "student"],
    terms: ["16b", "§16b", "studienbewerber", "university admission", "zulassung"],
  },
  {
    triggers: ["blue", "card", "blaue"],
    terms: ["blaue karte", "18g", "§18g", "blue card"],
  },
  {
    triggers: ["skilled", "worker", "fachkraft"],
    terms: ["fachkraft", "18a", "§18a", "18b", "§18b"],
  },
  {
    triggers: ["move", "change", "wechsel", "transition", "from"],
    terms: ["zweckwechsel", "wechsel", "aufenthaltszweck", "change of residence purpose", "transition"],
  },
];

export function tokenize(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 2 && !stopWords.has(term));
}

export function expandQuery(query: string) {
  const lower = query.toLowerCase();
  const additions = queryExpansion.flatMap((rule) =>
    rule.triggers.some((trigger) => lower.includes(trigger)) ? rule.terms : [],
  );
  return `${query} ${additions.join(" ")}`;
}

const preferredCategoryOrder = [
  "official-law",
  "official-portals",
  "local-duesseldorf",
  "recognition",
  "language-integration",
];

function categoryPriority(category: string) {
  const index = preferredCategoryOrder.indexOf(category);
  return index === -1 ? preferredCategoryOrder.length : index;
}

function citationDedupeKey(chunk: RetrievedChunk) {
  const pageKey = chunk.pageNumber ?? "manual";
  return `${chunk.sourceId}::p${pageKey}::c${chunk.chunkIndex}::${stableTextHash(chunk.text)}`;
}

export function dedupeRetrievedCitations(chunks: RetrievedChunk[]) {
  const seen = new Set<string>();
  const deduped: RetrievedChunk[] = [];

  for (const chunk of chunks) {
    const key = citationDedupeKey(chunk);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(chunk);
  }

  return deduped;
}

function diversifyChunks(chunks: RetrievedChunk[], limit: number) {
  const selected: RetrievedChunk[] = [];
  const selectedIds = new Set<string>();
  const perSource = new Map<string, number>();
  const uniqueSourceCount = new Set(chunks.map((chunk) => chunk.sourceId)).size;
  const maxPerSource = uniqueSourceCount <= 1 ? Number.POSITIVE_INFINITY : 2;

  function addChunk(chunk: RetrievedChunk) {
    if (selectedIds.has(chunk.id)) return false;
    const sourceCount = perSource.get(chunk.sourceId) ?? 0;
    if (sourceCount >= maxPerSource) return false;
    selected.push(chunk);
    selectedIds.add(chunk.id);
    perSource.set(chunk.sourceId, sourceCount + 1);
    return true;
  }

  for (const category of preferredCategoryOrder) {
    const candidate = chunks.find((chunk) => chunk.metadata.category === category && !selectedIds.has(chunk.id));
    if (candidate) {
      addChunk(candidate);
      if (selected.length >= limit) return selected;
    }
  }

  for (const chunk of chunks) {
    addChunk(chunk);
    if (selected.length >= limit) break;
  }

  return selected;
}

export function retrieveChunks(query: string, chunks: SourceChunk[], limit = 6): RetrievedChunk[] {
  const queryTerms = tokenize(expandQuery(query));
  if (queryTerms.length === 0) return [];

  const scored = chunks
    .map((chunk) => {
      const text = `${chunk.title} ${chunk.authority ?? ""} ${chunk.fileName} ${chunk.tags.join(" ")} ${chunk.text}`.toLowerCase();
      const matchedTerms = Array.from(new Set(queryTerms.filter((term) => text.includes(term))));
      const exactTitleBonus = queryTerms.some((term) => chunk.title.toLowerCase().includes(term)) ? 1.5 : 0;
      const tagBonus = queryTerms.filter((term) => chunk.tags.some((tag) => tag.toLowerCase().includes(term))).length * 0.75;
      const categoryBonus = Math.max(0, 1.2 - categoryPriority(chunk.metadata.category) * 0.25);
      const densityScore = matchedTerms.reduce((score, term) => {
        const matches = text.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"));
        return score + (matches?.length ?? 0);
      }, 0);

      return {
        ...chunk,
        score: matchedTerms.length * 2 + densityScore * 0.35 + exactTitleBonus + tagBonus + categoryBonus,
        matchedTerms,
      };
    })
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score || categoryPriority(a.metadata.category) - categoryPriority(b.metadata.category));

  return diversifyChunks(dedupeRetrievedCitations(scored), limit);
}
