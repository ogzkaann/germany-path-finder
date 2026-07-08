import { useEffect, useState } from "react";
import { BookOpenCheck, Code2, DatabaseZap, FileWarning, Loader2, RefreshCw } from "lucide-react";
import type { KnowledgeManifest, KnowledgeSource } from "../domain/types";
import { createManualOfficialChunks } from "../rag/chunking";
import { indexPreloadedOfficialSource, indexPreloadedOfficialSources, type SourceIndexResult } from "../rag/indexing";
import { getIndexedSourceIds, replaceChunksForSource } from "../storage/repository";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";

interface VaultPageProps {
  manifest?: KnowledgeManifest;
  onDataChange: () => void;
}

const categoryLabels: Record<string, string> = {
  "official-law": "Official Law",
  "official-portals": "Official Portals",
  "local-duesseldorf": "Local Düsseldorf / NRW",
  recognition: "Recognition",
  "language-integration": "Language & Integration",
};

function sourceStatusBadge(source: KnowledgeSource, indexed: boolean) {
  if (indexed) return <Badge variant="green">Indexed</Badge>;
  if (source.status === "available") return <Badge variant="yellow">Ready to index</Badge>;
  if (source.status === "missing") return <Badge variant="red">Missing file</Badge>;
  return <Badge variant="yellow">Placeholder</Badge>;
}

function diagnosticForSource(source: KnowledgeSource, indexed: boolean, message = "") {
  const lower = message.toLowerCase();
  const extension = source.fileName.split(".").pop()?.toLowerCase() ?? "";
  const supported = ["pdf", "txt", "md"].includes(extension);

  if (indexed) {
    return {
      state: "indexed",
      variant: "green" as const,
      message: message || "Indexed successfully.",
      fix: "No action needed.",
    };
  }

  if (!supported) {
    return {
      state: "unsupported",
      variant: "red" as const,
      message: `Unsupported file extension: .${extension || "unknown"}.`,
      fix: "Use PDF, TXT, or Markdown.",
    };
  }

  if (lower.includes("no selectable text") || lower.includes("ocr")) {
    return {
      state: "scanned PDF suspected",
      variant: "red" as const,
      message: message || "Scanned/image PDF - OCR support needed.",
      fix: "Replace with selectable-text PDF or add OCR support.",
    };
  }

  if (lower.includes("missing") || lower.includes("404") || lower.includes("unavailable")) {
    return {
      state: "failed",
      variant: "red" as const,
      message: message || "File was not available to the browser.",
      fix: "Verify file path, regenerate manifest, then index again.",
    };
  }

  if (message) {
    return {
      state: lower.includes("indexed") ? "indexed" : "failed",
      variant: lower.includes("indexed") ? ("green" as const) : ("red" as const),
      message,
      fix: lower.includes("indexed") ? "No action needed." : "Review the error and retry indexing.",
    };
  }

  return {
    state: "not indexed",
    variant: "yellow" as const,
    message: "No chunks found in this browser for this source.",
    fix: "Click Index preloaded official sources.",
  };
}

export function VaultPage({ manifest, onDataChange }: VaultPageProps) {
  const [indexedIds, setIndexedIds] = useState<string[]>([]);
  const [manualText, setManualText] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, string>>({});
  const [busySourceId, setBusySourceId] = useState<string | null>(null);
  const [indexingAll, setIndexingAll] = useState(false);

  async function refreshIndexed() {
    setIndexedIds(await getIndexedSourceIds());
  }

  useEffect(() => {
    refreshIndexed();
  }, []);

  function recordResult(result: SourceIndexResult) {
    setStatus((current) => ({ ...current, [result.sourceId]: result.message }));
  }

  async function indexPdf(source: KnowledgeSource) {
    setBusySourceId(source.id);
    setStatus((current) => ({ ...current, [source.id]: "Indexing preloaded source..." }));
    try {
      const result = await indexPreloadedOfficialSource(source);
      recordResult(result);
      await refreshIndexed();
      onDataChange();
    } finally {
      setBusySourceId(null);
    }
  }

  async function indexAll() {
    if (!manifest) return;
    setIndexingAll(true);
    try {
      await indexPreloadedOfficialSources(manifest.sources, recordResult);
      await refreshIndexed();
      onDataChange();
    } finally {
      setIndexingAll(false);
    }
  }

  async function indexManualText(source: KnowledgeSource) {
    const text = manualText[source.id]?.trim();
    if (!text) {
      setStatus((current) => ({ ...current, [source.id]: "Paste official text before indexing manual developer chunks." }));
      return;
    }

    const chunks = createManualOfficialChunks(source, text);
    await replaceChunksForSource(source.id, chunks);
    setStatus((current) => ({ ...current, [source.id]: `Indexed ${chunks.length} manual developer chunks.` }));
    await refreshIndexed();
    onDataChange();
  }

  const availableCount = manifest?.sources.filter((source) => source.status === "available").length ?? 0;
  const missingCount = manifest?.sources.filter((source) => source.status === "missing").length ?? 0;
  const placeholderCount = manifest?.sources.filter((source) => source.status === "placeholder").length ?? 0;
  const failedCount = Object.values(status).filter((message) => message.toLowerCase().includes("failed")).length;
  const categoryCounts = manifest?.sources.reduce<Record<string, number>>((counts, source) => {
    counts[source.category] = (counts[source.category] ?? 0) + 1;
    return counts;
  }, {});
  const diagnosticRows =
    manifest?.sources
      .map((source) => ({
        source,
        diagnostic: diagnosticForSource(source, indexedIds.includes(source.id), status[source.id]),
      }))
      .filter((row) => row.diagnostic.state !== "indexed") ?? [];

  return (
    <div className="grid gap-5 p-5 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <BookOpenCheck className="h-4 w-4" />
            Official Knowledge Vault
          </div>
          <h2 className="mt-2 text-3xl font-semibold text-foreground">Preloaded official source library.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            The project owner preloads official PDFs, text, or Markdown into public/knowledge. Users only upload
            personal documents. The browser reads the generated manifest and indexes public official sources only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={indexAll} disabled={indexingAll || !manifest}>
            {indexingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseZap className="h-4 w-4" />}
            Index preloaded official sources
          </Button>
          <Button variant="outline" onClick={refreshIndexed}>
            <RefreshCw className="h-4 w-4" />
            Refresh status
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="shadow-none">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground">Manifest entries</p>
            <p className="mt-1 text-2xl font-semibold">{manifest?.sources.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground">Available files</p>
            <p className="mt-1 text-2xl font-semibold">{availableCount}</p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground">Indexed sources</p>
            <p className="mt-1 text-2xl font-semibold">{indexedIds.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground">Missing / failed</p>
            <p className="mt-1 text-2xl font-semibold">{Math.max(missingCount + placeholderCount + failedCount, diagnosticRows.length)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {Object.entries(categoryLabels).map(([category, label]) => (
          <Card key={category} className="shadow-none">
            <CardContent className="p-3">
              <p className="text-xs font-semibold text-muted-foreground">{label}</p>
              <p className="mt-1 text-lg font-semibold">{categoryCounts?.[category] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Indexing diagnostics</CardTitle>
          <CardDescription>Files without indexed official chunks in this browser, plus current-run failures.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {diagnosticRows.length ? (
            diagnosticRows.slice(0, 12).map(({ source, diagnostic }) => (
              <div key={source.id} className="grid gap-2 rounded-md border border-border bg-slate-50 p-3 md:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{source.fileName}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{diagnostic.message}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Recommended fix: {diagnostic.fix}</p>
                </div>
                <Badge variant={diagnostic.variant}>{diagnostic.state}</Badge>
              </div>
            ))
          ) : (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              All available manifest sources have indexed chunks in this browser.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {manifest?.sources.map((source) => {
          const indexed = indexedIds.includes(source.id);
          return (
            <Card key={source.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{source.title}</CardTitle>
                    <CardDescription>
                      {source.authority} / {source.jurisdiction} / {source.language} / date checked {source.date_checked}
                    </CardDescription>
                  </div>
                  {sourceStatusBadge(source, indexed)}
                </div>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-3 text-sm leading-6 text-muted-foreground lg:grid-cols-[1fr_1fr]">
                  <div className="rounded-md border border-border bg-slate-50 p-3">
                    <p className="font-medium text-foreground">Preloaded file path</p>
                    <p className="break-all text-xs">{source.filePath}</p>
                    {source.status !== "available" ? (
                      <p className="mt-2 text-xs text-amber-800">
                        Project owner must add this file under the matching public/knowledge category folder and regenerate the manifest.
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-md border border-border bg-slate-50 p-3">
                    <p className="font-medium text-foreground">Official URL</p>
                    {source.sourceUrl ? (
                      <a className="break-all text-xs text-blue-700 hover:underline" href={source.sourceUrl} target="_blank" rel="noreferrer">
                        {source.sourceUrl}
                      </a>
                    ) : (
                      <p className="text-xs text-muted-foreground">No source URL sidecar metadata yet.</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant={source.official ? "green" : "red"}>{source.official ? "official source" : "not official"}</Badge>
                  <Badge variant="outline">{source.documentType}</Badge>
                  <Badge variant="outline">{categoryLabels[source.category] ?? source.category}</Badge>
                  <Badge variant="outline">{source.jurisdiction}</Badge>
                  <Badge variant="outline">{source.source_type}</Badge>
                  <Badge variant="outline">{source.user_scope}</Badge>
                  <Badge variant="outline">checked {source.date_checked}</Badge>
                  {source.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => indexPdf(source)} disabled={busySourceId === source.id || source.status !== "available"}>
                    {busySourceId === source.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseZap className="h-4 w-4" />}
                    Index source
                  </Button>
                  {source.sourceUrl ? (
                    <a
                      className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-semibold hover:bg-muted"
                      href={source.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open official source
                    </a>
                  ) : null}
                </div>

                <details className="rounded-lg border border-dashed border-border bg-background p-3">
                  <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-foreground">
                    <Code2 className="h-4 w-4" />
                    Developer source tools
                  </summary>
                  <div className="mt-3 grid gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <FileWarning className="h-4 w-4" />
                      Manual official text fallback
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">
                      For development only. Normal users should not upload or paste official law/immigration PDFs.
                    </p>
                    <Textarea
                      value={manualText[source.id] ?? ""}
                      placeholder="Paste copied text from an official source only when developing or debugging source ingestion."
                      onChange={(event) => setManualText((current) => ({ ...current, [source.id]: event.target.value }))}
                    />
                    <Button variant="outline" className="w-fit" onClick={() => indexManualText(source)}>
                      Save manual developer chunks
                    </Button>
                  </div>
                </details>

                {status[source.id] ? <p className="rounded-md bg-muted p-3 text-sm leading-6 text-muted-foreground">{status[source.id]}</p> : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
