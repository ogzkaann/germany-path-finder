import type { KnowledgeSource } from "../domain/types";
import { replaceChunksForSource } from "../storage/repository";
import { createOfficialChunks } from "./chunking";
import { fetchAndExtractPdf, fetchAndExtractText } from "./pdf";

export interface SourceIndexResult {
  sourceId: string;
  state: "indexed" | "missing" | "failed" | "skipped";
  message: string;
  chunkCount: number;
}

export async function indexPreloadedOfficialSource(source: KnowledgeSource): Promise<SourceIndexResult> {
  if (source.status !== "available") {
    return {
        sourceId: source.id,
        state: "skipped",
        message:
          source.status === "placeholder"
            ? "Placeholder source. Project owner must add the real file and regenerate manifest.json."
            : "Missing file. Project owner must add it under the matching public/knowledge category folder and regenerate the manifest.",
      chunkCount: 0,
    };
  }

  try {
    const lowerPath = source.filePath.toLowerCase();
    const extracted = lowerPath.endsWith(".pdf")
      ? await fetchAndExtractPdf(source.filePath)
      : await fetchAndExtractText(source.filePath);
    if (!extracted.text.trim()) {
      return {
        sourceId: source.id,
        state: "failed",
        message: "No selectable text found. OCR support is a future improvement.",
        chunkCount: 0,
      };
    }

    const chunks = createOfficialChunks(source, extracted.pages);
    await replaceChunksForSource(source.id, chunks);
    return {
      sourceId: source.id,
      state: "indexed",
      message: `Indexed ${chunks.length} chunks from ${extracted.pageCount} page/section(s).`,
      chunkCount: chunks.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Indexing failed.";
    return {
      sourceId: source.id,
      state: message.includes("404") || message.toLowerCase().includes("unavailable") ? "missing" : "failed",
      message: `Missing file or parse failure. Project owner must verify ${source.filePath} in the public knowledge base. ${message}`,
      chunkCount: 0,
    };
  }
}

export async function indexPreloadedOfficialSources(
  sources: KnowledgeSource[],
  onProgress?: (result: SourceIndexResult) => void,
) {
  const results: SourceIndexResult[] = [];

  for (const source of sources) {
    const result = await indexPreloadedOfficialSource(source);
    results.push(result);
    onProgress?.(result);
  }

  return results;
}
