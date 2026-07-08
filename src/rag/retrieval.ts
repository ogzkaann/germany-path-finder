import type { RetrievedChunk, SourceChunk } from "../domain/types";

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

function categoryPriority(category: string) {
  if (category === "official-law") return 0;
  if (category === "official-portals") return 1;
  if (category === "local-duesseldorf") return 2;
  return 3;
}

function diversifyChunks(chunks: RetrievedChunk[], limit: number) {
  const selected: RetrievedChunk[] = [];
  const perSource = new Map<string, number>();
  const maxPerSource = limit <= 6 ? 2 : 3;

  for (const chunk of chunks) {
    const sourceCount = perSource.get(chunk.sourceId) ?? 0;
    if (sourceCount >= maxPerSource) continue;
    selected.push(chunk);
    perSource.set(chunk.sourceId, sourceCount + 1);
    if (selected.length >= limit) return selected;
  }

  for (const chunk of chunks) {
    if (selected.some((item) => item.id === chunk.id)) continue;
    selected.push(chunk);
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

  return diversifyChunks(scored, limit);
}
