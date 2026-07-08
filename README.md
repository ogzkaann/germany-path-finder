# Germany Path Finder

Germany Path Finder is a local-first RAG portfolio MVP for exploring residence and career transition paths in Germany with owner-curated official sources, user-reviewed personal profile data, and source-bound AI explanations.

It is not legal advice. It is a decision-support demo that keeps official evidence, private user documents, and AI explanations separated.

## What It Does

- Indexes owner-preloaded official documents from `public/knowledge`.
- Lets users upload personal documents for profile extraction and local analysis only.
- Answers questions with retrieved source citations.
- Evaluates paths such as Ausbildung, Studium, Studienbewerber, skilled job, EU Blue Card, and Chancenkarte.
- Shows risk/fit labels, missing documents, missing source evidence, and conservative verification warnings.
- Stores data locally in the browser with IndexedDB/localStorage.
- Supports BYOK AI settings for OpenAI-compatible providers, including OpenAI and Gemini's OpenAI-compatible endpoint.

## What I Designed

- Transparent residence/career path rules
- Local-first RAG over owner-curated official sources
- Separation between public official knowledge and private user documents
- Source-bound answers with citations
- BYOK AI workflow
- Conservative eligibility/risk handling instead of legal claims

## Local-First RAG

The browser cannot recursively list files in `public` at runtime, so this project generates static manifests before dev/build:

- `public/knowledge/manifest.json` for official/public RAG sources
- `public/sample-user-vault/manifest.json` for demo/private sample material

Official RAG only uses chunks where:

- `source_type === "official_knowledge"`
- `official === true`
- `user_scope === "public"`

Private uploaded documents and sample-user-vault files are never indexed into global official source chunks.

## Add Official PDFs

Project owners add official `.pdf`, `.txt`, or `.md` files under:

- `public/knowledge/official-law/`
- `public/knowledge/official-portals/`
- `public/knowledge/local-duesseldorf/`
- `public/knowledge/recognition/`
- `public/knowledge/language-integration/`

Optional sidecar metadata can sit beside a file:

```text
public/knowledge/official-law/AufenthG.pdf
public/knowledge/official-law/AufenthG.json
```

Example sidecar:

```json
{
  "title": "Official document title",
  "authority": "Official authority name",
  "jurisdiction": "Germany",
  "date_checked": "2026-07-08",
  "sourceUrl": "https://official.example/source-page",
  "documentType": "official-pdf",
  "tags": ["residence", "documents", "study"],
  "language": "de"
}
```

Then regenerate manifests:

```bash
npm run generate:knowledge
```

## Run Locally

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

`npm run dev` and `npm run build` both regenerate knowledge manifests first.

## Privacy Notes

There is no backend, login, payment, or server database. User profile data, uploaded document text, chunks, checklist progress, notes, and BYOK settings stay in the browser.

If AI is enabled, selected document/profile context and retrieved source chunks may be sent to the selected provider only when the user runs extraction or asks a question. Do not use sensitive documents on public/shared devices.

## Disclaimer

Germany Path Finder is not legal advice, immigration advice, or a replacement for official authorities or a qualified lawyer. It does not claim eligibility. It highlights source evidence, missing evidence, and verification needs.

## Future Improvements

- OCR for scanned PDFs
- Local embeddings or browser-side vector search
- Better source metadata curation
- Exportable evidence packs
- Region-specific rule packs maintained from official citations
