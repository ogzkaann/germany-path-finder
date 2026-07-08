import type { DocumentMetadata, KnowledgeSource, SourceChunk } from "../domain/types";
import type { ExtractedPdfPage } from "./pdf";

const DEFAULT_WORDS_PER_CHUNK = 150;
const DEFAULT_OVERLAP = 24;

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function splitWords(text: string) {
  return normalizeText(text).split(" ").filter(Boolean);
}

function chunkWords(words: string[], wordsPerChunk = DEFAULT_WORDS_PER_CHUNK, overlap = DEFAULT_OVERLAP) {
  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + wordsPerChunk, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end >= words.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

export function createOfficialChunks(source: KnowledgeSource, pages: ExtractedPdfPage[]): SourceChunk[] {
  const fileName = source.fileName || source.filePath.split("/").pop() || source.filePath;
  let chunkIndex = 0;

  return pages.flatMap((page) => {
    const chunks = chunkWords(splitWords(page.text));
    return chunks.map((text) => {
      const currentChunkIndex = chunkIndex++;
      return {
        id: crypto.randomUUID(),
        sourceId: source.id,
        kind: "official" as const,
        title: source.title,
        authority: source.authority,
        region: source.region,
        fileName,
        sourceUrl: source.sourceUrl,
        pageNumber: page.pageNumber,
        chunkIndex: currentChunkIndex,
        text,
        tags: source.tags,
        createdAt: new Date().toISOString(),
        metadata: {
          source_id: source.id,
          source_title: source.title,
          source_type: source.source_type,
          category: source.category,
          jurisdiction: source.jurisdiction,
          date_checked: source.date_checked,
          official: source.official,
          official_non_official: source.official_non_official,
          user_scope: source.user_scope,
          filePath: source.filePath,
          pageNumber: page.pageNumber,
          chunkIndex: currentChunkIndex,
        },
      };
    });
  });
}

export function createManualOfficialChunks(source: KnowledgeSource, text: string): SourceChunk[] {
  const fileName = `${source.id}-manual-text`;
  return chunkWords(splitWords(text)).map((chunkText, chunkIndex) => ({
    id: crypto.randomUUID(),
    sourceId: source.id,
    kind: "official" as const,
    title: source.title,
    authority: source.authority,
    region: source.region,
    fileName,
    sourceUrl: source.sourceUrl,
    chunkIndex,
    text: chunkText,
    tags: [...source.tags, "manual-text"],
    createdAt: new Date().toISOString(),
    metadata: {
      source_id: source.id,
      source_title: source.title,
      source_type: source.source_type,
      category: source.category,
      jurisdiction: source.jurisdiction,
      date_checked: source.date_checked,
      official: source.official,
      official_non_official: source.official_non_official,
      user_scope: source.user_scope,
      filePath: source.filePath,
      chunkIndex,
    },
  }));
}

export function createPrivateUserDocumentMetadata(category = "personal-document"): DocumentMetadata {
  return {
    source_type: "private_user_document",
    category,
    jurisdiction: "private-user",
    date_checked: new Date().toISOString().slice(0, 10),
    official: false,
    official_non_official: "non_official",
    user_scope: "private_user",
  };
}

export function createUserDocumentChunks(
  documentId: string,
  fileName: string,
  text: string,
  category = "personal-document",
  metadata = createPrivateUserDocumentMetadata(category),
): SourceChunk[] {
  return chunkWords(splitWords(text)).map((chunkText, chunkIndex) => ({
    id: crypto.randomUUID(),
    sourceId: documentId,
    documentId,
    kind: "user" as const,
    title: fileName,
    authority: "User-provided document",
    fileName,
    chunkIndex,
    text: chunkText,
    tags: ["user-document"],
    createdAt: new Date().toISOString(),
    metadata: {
      ...metadata,
      source_id: documentId,
      source_title: fileName,
      chunkIndex,
    },
  }));
}
