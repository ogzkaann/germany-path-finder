import { AlertTriangle, ExternalLink, FileText, ShieldCheck } from "lucide-react";
import type { KnowledgeSource, RetrievedChunk } from "../domain/types";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface SourcePanelProps {
  citations: RetrievedChunk[];
  manifestSources: KnowledgeSource[];
}

const categoryLabels: Record<string, string> = {
  "official-law": "Official Law",
  "official-portals": "Official Portals",
  "local-duesseldorf": "Local Düsseldorf / NRW",
  recognition: "Recognition",
  "language-integration": "Language & Integration",
};

export function SourcePanel({ citations, manifestSources }: SourcePanelProps) {
  return (
    <aside className="hidden w-[360px] shrink-0 border-l border-border bg-card/95 p-4 xl:block">
      <div className="sticky top-[88px] max-h-[calc(100vh-104px)] overflow-auto pr-1">
        <SourcePanelContent citations={citations} manifestSources={manifestSources} />
      </div>
    </aside>
  );
}

export function SourcePanelContent({ citations, manifestSources }: SourcePanelProps) {
  const categoryCounts = manifestSources.reduce<Record<string, number>>((counts, source) => {
    counts[source.category] = (counts[source.category] ?? 0) + 1;
    return counts;
  }, {});

  const regionCounts = manifestSources.reduce<Record<string, number>>((counts, source) => {
    counts[source.region] = (counts[source.region] ?? 0) + 1;
    return counts;
  }, {});

  const statusCounts = manifestSources.reduce<Record<string, number>>((counts, source) => {
    counts[source.status] = (counts[source.status] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4" />
          Sources & Citations
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Answers must stay inside indexed official chunks and the reviewed local profile.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>Not legal advice. Unsupported claims must be treated as not found in provided sources.</p>
        </div>
      </div>

      <div className="space-y-3">
        {citations.length > 0 ? (
          citations.map((citation, index) => (
            <Card key={citation.id} className="shadow-none">
              <CardHeader className="p-3 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm">C{index + 1}. {citation.title}</CardTitle>
                  <Badge variant="outline">score {citation.score.toFixed(1)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 p-3 pt-0">
                <p className="text-xs leading-5 text-muted-foreground">{citation.authority}</p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{categoryLabels[citation.metadata.category] ?? citation.metadata.category}</span>
                  <span>{citation.metadata.jurisdiction}</span>
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {citation.fileName}
                  </span>
                  <span>chunk {citation.chunkIndex}</span>
                  {citation.pageNumber ? <span>page {citation.pageNumber}</span> : <span>manual/no page</span>}
                </div>
                <p className="line-clamp-4 text-xs leading-5 text-foreground">{citation.text}</p>
                {citation.sourceUrl ? (
                  <a
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
                    href={citation.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Official URL
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="shadow-none">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-foreground">No active citations yet.</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Index owner-preloaded official PDFs from the manifest, then ask a question.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="rounded-lg border border-dashed border-border bg-background p-3">
        <p className="text-xs font-semibold text-foreground">Manifest source registry</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Object.entries(categoryCounts).map(([category, count]) => (
            <Badge key={category} variant="outline">
              {categoryLabels[category] ?? category}: {count}
            </Badge>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Object.entries(regionCounts).map(([region, count]) => (
            <Badge key={region} variant="outline">
              {region}: {count}
            </Badge>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant={statusCounts.available ? "green" : "outline"}>available {statusCounts.available ?? 0}</Badge>
          <Badge variant={statusCounts.missing ? "red" : "outline"}>missing {statusCounts.missing ?? 0}</Badge>
          <Badge variant={statusCounts.placeholder ? "yellow" : "outline"}>placeholder {statusCounts.placeholder ?? 0}</Badge>
        </div>
        <div className="mt-3 space-y-2">
          {manifestSources.slice(0, 5).map((source) => (
            <div key={source.id} className="text-xs leading-5 text-muted-foreground">
              <span className="font-medium text-foreground">{categoryLabels[source.category] ?? source.category}</span> / {source.title}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
