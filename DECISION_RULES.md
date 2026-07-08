# Decision Rules

Decision rules live in `src/domain/rules/pathRules.ts`.

Rules are intentionally conservative placeholders. They are designed to show product architecture, not to encode final legal eligibility.

Each rule includes:

- `id`
- `path`
- `condition`
- `result`
- `explanation`
- `requiredSources`
- `requiredDocuments`
- `blockers`
- `nextActions`

If official source chunks are not indexed for a rule's required sources, the UI marks the path as needing official verification.

Do not add exact legal thresholds unless they are backed by a source entry and citations in the knowledge vault.
