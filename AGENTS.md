# Agent Notes

Germany Path Finder is a local-first Vite + React + TypeScript app. Keep the product focused on source-aware decision support.

## Guardrails

- Do not add a backend, login, payments, or server database.
- Do not ship API keys.
- Keep official source metadata in `public/knowledge/manifest.json`.
- Keep rule logic transparent in `src/domain/rules/pathRules.ts`.
- AI may summarize retrieved chunks and extract profile fields, but it must not create legal facts.
- When evidence is missing, the UI should show uncertainty or `not found in provided sources`.

## Preferred Workflow

1. Update types and schemas first.
2. Update storage/RAG utilities.
3. Update screens and components.
4. Run `npm run build`.

Avoid broad refactors unless they directly support the MVP.
