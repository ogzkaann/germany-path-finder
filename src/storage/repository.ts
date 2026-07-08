import type { ProgressState, Profile, SourceChunk, StoredDocument } from "../domain/types";
import { db } from "./db";

function isPublicOfficialChunk(chunk: SourceChunk) {
  return (
    chunk.metadata?.source_type === "official_knowledge" &&
    chunk.metadata.official === true &&
    chunk.metadata.user_scope === "public"
  );
}

export async function getProfile() {
  return db.profiles.get("local-profile");
}

export async function saveProfile(profile: Profile) {
  await db.profiles.put({ ...profile, updatedAt: new Date().toISOString() });
}

export async function listDocuments() {
  return db.documents.orderBy("createdAt").reverse().toArray();
}

export async function saveDocument(document: StoredDocument) {
  await db.documents.put(document);
}

export async function updateDocument(document: StoredDocument) {
  await db.documents.put(document);
}

export async function listChunks(kind?: "official" | "user") {
  if (kind) {
    return db.chunks.where("kind").equals(kind).toArray();
  }
  return db.chunks.toArray();
}

export async function listPublicOfficialChunks() {
  const chunks = await db.chunks.where("kind").equals("official").toArray();
  return chunks.filter(isPublicOfficialChunk);
}

export async function listPrivateUserChunks() {
  const chunks = await db.chunks.where("kind").equals("user").toArray();
  return chunks.filter((chunk) => chunk.metadata?.user_scope === "private_user");
}

export async function replaceChunksForSource(sourceId: string, chunks: SourceChunk[]) {
  await db.transaction("rw", db.chunks, async () => {
    await db.chunks.where("sourceId").equals(sourceId).delete();
    if (chunks.length > 0) {
      await db.chunks.bulkPut(chunks);
    }
  });
}

export async function clearPublicOfficialChunks() {
  await db.transaction("rw", db.chunks, async () => {
    const chunks = await db.chunks.where("kind").equals("official").toArray();
    const ids = chunks.filter(isPublicOfficialChunk).map((chunk) => chunk.id);
    if (ids.length > 0) {
      await db.chunks.bulkDelete(ids);
    }
  });
}

export async function replaceChunksForDocument(documentId: string, chunks: SourceChunk[]) {
  await db.transaction("rw", db.chunks, async () => {
    await db.chunks.where("documentId").equals(documentId).delete();
    if (chunks.length > 0) {
      await db.chunks.bulkPut(chunks);
    }
  });
}

export async function getIndexedSourceIds() {
  const chunks = await listPublicOfficialChunks();
  return Array.from(new Set(chunks.map((chunk) => chunk.sourceId)));
}

export async function getOfficialIndexStats() {
  const chunks = await listPublicOfficialChunks();
  const indexedSourceIds = Array.from(new Set(chunks.map((chunk) => chunk.sourceId)));
  return {
    indexedSourceIds,
    indexedSourceCount: indexedSourceIds.length,
    indexedChunkCount: chunks.length,
  };
}

export async function getProgress() {
  return db.progress.get("local-progress");
}

export async function saveProgress(progress: ProgressState) {
  await db.progress.put({ ...progress, updatedAt: new Date().toISOString() });
}

export async function createDefaultProgress(): Promise<ProgressState> {
  const existing = await getProgress();
  if (existing) return existing;
  const progress: ProgressState = {
    id: "local-progress",
    checklist: [],
    notes: "",
    updatedAt: new Date().toISOString(),
  };
  await saveProgress(progress);
  return progress;
}
