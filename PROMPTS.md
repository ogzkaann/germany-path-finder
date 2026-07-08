# Prompts

The app uses strict prompts when BYOK AI is enabled.

## Profile Extraction Prompt

The model may extract structured JSON from user-provided document text. It must not infer unsupported values. Unknown fields should be omitted or left empty.

## RAG Answer Prompt

The model receives:

- user question,
- retrieved source chunks,
- editable user profile context,
- citation metadata.

It must:

- answer only from retrieved chunks and profile context,
- cite source title, authority, file name, page, and chunk where available,
- say `Not found in provided sources.` when evidence is missing,
- avoid final legal advice,
- mark uncertainty and official verification needs.

## Checklist Prompt

The model may suggest a checklist only from sourced findings and transparent rule outputs. It must not invent required documents.
