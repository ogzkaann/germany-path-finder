# Sources

Official source metadata is generated into `public/knowledge/manifest.json`. The project owner preloads official PDFs, text files, or Markdown files under the category folders in `public/knowledge/`. Normal users upload personal documents only.

The browser cannot recursively list public files at runtime, so `npm run generate:knowledge` scans the folders and writes static manifests before dev/build.

## Official Categories

- `public/knowledge/official-law/`
- `public/knowledge/official-portals/`
- `public/knowledge/local-duesseldorf/`
- `public/knowledge/recognition/`
- `public/knowledge/language-integration/`

## Source Entry Fields

- `id`
- `title`
- `authority`
- `region`
- `category`
- `jurisdiction`
- `filePath`
- `fileName`
- `sourceUrl`
- `lastChecked`
- `date_checked`
- `documentType`
- `tags`
- `language`
- `status`
- `source_type`: `official_knowledge`
- `official`: `true`
- `user_scope`: `public`

## Sidecar Metadata

Optional sidecar JSON files can sit next to source files and override:

- `title`
- `authority`
- `jurisdiction`
- `date_checked`
- `sourceUrl`
- `tags`
- `language`
- `documentType`

Example:

- `public/knowledge/official-law/AufenthG.pdf`
- `public/knowledge/official-law/AufenthG.json`

## Source Handling

- Available PDFs are parsed client-side with `pdfjs-dist`.
- Available `.txt` and `.md` files are fetched as text.
- Extracted chunks are saved to IndexedDB with official/public metadata.
- Missing or failed files do not crash the app.
- Scanned PDFs may fail extraction. OCR is future support.
- Manual official text fallback is hidden behind developer source tools.
- `public/sample-user-vault/manifest.json` is generated separately and is not consumed by official RAG indexing.
