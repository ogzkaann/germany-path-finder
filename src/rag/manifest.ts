import type { KnowledgeManifest } from "../domain/types";
import { manifestSchema } from "../domain/schemas";

function flattenSources(sources: KnowledgeManifest["sources"]): KnowledgeManifest["sources"] {
  return sources.flatMap((source) => {
    const normalized = {
      ...source,
      fileName: source.fileName || source.filePath.split("/").pop() || source.id,
      date_checked: source.date_checked || source.lastChecked,
      children: source.children?.map((child) => ({
        ...child,
        fileName: child.fileName || child.filePath.split("/").pop() || child.id,
        date_checked: child.date_checked || child.lastChecked,
      })),
    };
    return [normalized, ...flattenSources(normalized.children ?? [])];
  });
}

export async function loadKnowledgeManifest(): Promise<KnowledgeManifest> {
  const response = await fetch("/knowledge/manifest.json", { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Could not load knowledge manifest (${response.status})`);
  }

  const json = await response.json();
  const manifest = manifestSchema.parse(json);
  return {
    ...manifest,
    sources: flattenSources(manifest.sources as KnowledgeManifest["sources"]),
  };
}
