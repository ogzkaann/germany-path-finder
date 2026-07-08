# CLAUDE.md

This repository is a portfolio MVP named Germany Path Finder.

The app is intentionally local-first:

- IndexedDB via Dexie for source chunks, profile, uploaded document text, checklist progress, and notes.
- localStorage for user-managed OpenAI-compatible API settings.
- No backend.
- No server database.

Legal-safety principle: the AI layer is not the source of truth. Retrieval and transparent rules define the evidence boundary. If a legal condition is not in the retrieved official sources, the app must mark it as unresolved or needing official verification.
