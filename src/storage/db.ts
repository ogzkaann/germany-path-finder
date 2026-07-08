import Dexie, { type Table } from "dexie";
import type { ProgressState, Profile, SourceChunk, StoredDocument } from "../domain/types";

class GermanyPathDatabase extends Dexie {
  documents!: Table<StoredDocument, string>;
  chunks!: Table<SourceChunk, string>;
  profiles!: Table<Profile, string>;
  progress!: Table<ProgressState, string>;

  constructor() {
    super("germany-path-finder");
    this.version(1).stores({
      documents: "id, kind, fileName, createdAt, status",
      chunks: "id, sourceId, kind, documentId, fileName, createdAt, *tags",
      profiles: "id, updatedAt",
      progress: "id, updatedAt",
    });
  }
}

export const db = new GermanyPathDatabase();
