import { useEffect, useMemo, useState } from "react";
import { CheckSquare, FileText, Route, ShieldAlert } from "lucide-react";
import type {
  KnowledgeManifest,
  PathEvaluation,
  PathName,
  Profile,
  RagAnalysisState,
  RetrievedChunk,
  RiskLevel,
  SourceChunk,
  StoredDocument,
} from "../domain/types";
import { documentKindLabels, pathDescriptions } from "../domain/labels";
import { evaluatePathRules } from "../domain/rules/pathRules";
import { pathEvidenceChunks, pathHasEvidence } from "../rag/analysis";
import { createDefaultProgress, listPublicOfficialChunks, saveProgress } from "../storage/repository";
import { RiskBadge } from "../components/RiskBadge";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

interface PathResultsPageProps {
  profile?: Profile;
  documents: StoredDocument[];
  indexedSourceIds: string[];
  manifest?: KnowledgeManifest;
  analysis?: RagAnalysisState;
  onCitations: (citations: RetrievedChunk[]) => void;
  onDataChange: () => void;
}

function toRetrieved(chunks: SourceChunk[]): RetrievedChunk[] {
  return chunks.slice(0, 5).map((chunk) => ({
    ...chunk,
    score: 1,
    matchedTerms: ["rule-source"],
  }));
}

function checklistFromEvaluation(evaluation: PathEvaluation) {
  const missingDocs = evaluation.missingDocuments.map((kind) => `Collect ${documentKindLabels[kind]}`);
  return [...missingDocs, ...evaluation.nextActions].slice(0, 8).map((label) => ({
    id: crypto.randomUUID(),
    label,
    done: false,
    sourceRuleId: evaluation.matchedRuleIds[0],
  }));
}

function riskForDynamicStatus(evaluation: PathEvaluation, hasEvidence: boolean): RiskLevel {
  if (!hasEvidence) return "red";
  return evaluation.fit;
}

export function PathResultsPage({
  profile,
  documents,
  indexedSourceIds,
  manifest,
  analysis,
  onCitations,
  onDataChange,
}: PathResultsPageProps) {
  const [selectedPath, setSelectedPath] = useState<PathName>("Ausbildung");
  const [officialChunks, setOfficialChunks] = useState<SourceChunk[]>([]);
  const evaluations = useMemo(
    () => evaluatePathRules({ profile, documents, indexedSourceIds }),
    [profile, documents, indexedSourceIds],
  );
  const selectedEvaluation = evaluations.find((evaluation) => evaluation.path === selectedPath) ?? evaluations[0];

  useEffect(() => {
    listPublicOfficialChunks().then(setOfficialChunks);
  }, [indexedSourceIds.join("|")]);

  useEffect(() => {
    if (analysis?.relevantPath) {
      setSelectedPath(analysis.relevantPath);
    }
  }, [analysis?.relevantPath]);

  const officialRetrieved = useMemo(() => toRetrieved(officialChunks), [officialChunks]);

  useEffect(() => {
    const citationChunks = pathEvidenceChunks(selectedEvaluation.path, officialRetrieved).slice(0, 6);
    onCitations(citationChunks);
  }, [officialRetrieved, selectedEvaluation.path, onCitations]);

  async function saveAsProgress(evaluation: PathEvaluation) {
    const progress = await createDefaultProgress();
    await saveProgress({
      ...progress,
      selectedPath: evaluation.path,
      checklist: checklistFromEvaluation(evaluation),
      updatedAt: new Date().toISOString(),
    });
    onDataChange();
  }

  return (
    <div className="grid gap-5 p-5 lg:p-8">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Route className="h-4 w-4" />
          Path Result Screen
        </div>
        <h2 className="mt-2 text-3xl font-semibold text-foreground">Possible paths, conservative fit, and missing evidence.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Rules are transparent placeholders. Exact conditions stay unresolved until official source chunks are indexed.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="grid gap-3">
          {evaluations.map((evaluation) => {
            const hasEvidence = pathHasEvidence(evaluation.path, officialRetrieved);
            const relatedToLastQuestion = analysis?.relevantPath === evaluation.path;
            return (
              <button
                key={evaluation.path}
                onClick={() => setSelectedPath(evaluation.path)}
                className={
                  evaluation.path === selectedPath
                    ? "rounded-lg border border-primary bg-card p-4 text-left shadow-crisp"
                    : "rounded-lg border border-border bg-card p-4 text-left shadow-none hover:bg-muted"
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{evaluation.path}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{pathDescriptions[evaluation.path]}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant={hasEvidence ? "green" : "yellow"}>
                        {hasEvidence ? "source evidence" : "needs source verification"}
                      </Badge>
                      {relatedToLastQuestion ? <Badge variant="outline">last question</Badge> : null}
                    </div>
                  </div>
                  <RiskBadge level={riskForDynamicStatus(evaluation, hasEvidence)} />
                </div>
              </button>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{selectedEvaluation.path}</CardTitle>
                <CardDescription>{pathDescriptions[selectedEvaluation.path]}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <RiskBadge level={riskForDynamicStatus(selectedEvaluation, pathHasEvidence(selectedEvaluation.path, officialRetrieved))} />
                <Badge variant="outline">
                  confidence: {pathHasEvidence(selectedEvaluation.path, officialRetrieved) ? selectedEvaluation.confidence : "low"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5">
            {analysis?.transition && selectedEvaluation.path === analysis.transition.targetPath ? (
              <section className="grid gap-3 rounded-lg border border-border bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Transition analyzer</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      From: {analysis.transition.fromStatus} / To: {analysis.transition.targetPath}
                    </p>
                  </div>
                  <RiskBadge level={analysis.transition.conservativeResult} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Sources found</p>
                    <div className="mt-2 grid gap-1.5">
                      {analysis.transition.foundSourceTitles.length ? (
                        analysis.transition.foundSourceTitles.map((title) => (
                          <p key={title} className="rounded-md bg-background p-2 text-xs leading-5 text-muted-foreground">
                            {title}
                          </p>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">No official source citations retrieved.</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Missing evidence</p>
                    <div className="mt-2 grid gap-1.5">
                      {analysis.transition.missingEvidence.length ? (
                        analysis.transition.missingEvidence.map((item) => (
                          <p key={item} className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs leading-5 text-amber-950">
                            {item}
                          </p>
                        ))
                      ) : (
                        <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs leading-5 text-amber-950">
                          Partial source evidence found. Still needs official verification before acting.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  User profile data that matters: current status, target training admission or contract, language certificate,
                  identity/residence documents, and local authority procedure.
                </p>
              </section>
            ) : null}

            {selectedEvaluation.needsOfficialVerification || !pathHasEvidence(selectedEvaluation.path, officialRetrieved) ? (
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  {!pathHasEvidence(selectedEvaluation.path, officialRetrieved)
                    ? "Needs source verification. No indexed official source evidence was found for this path."
                    : "Needs official verification. This is not an eligibility result."}
                </p>
              </div>
            ) : null}

            <section className="grid gap-2">
              <h3 className="text-sm font-semibold text-foreground">Source evidence coverage</h3>
              <div className="grid gap-2 rounded-md border border-border bg-slate-50 p-3 text-sm leading-6 text-muted-foreground">
                <p>
                  Profile fit: {selectedEvaluation.fit}. Source evidence:{" "}
                  {pathHasEvidence(selectedEvaluation.path, officialRetrieved) ? "indexed official chunks found" : "missing"}.
                </p>
                {analysis?.relevantPath === selectedEvaluation.path ? (
                  <>
                    <p>Last related question: {analysis.lastQuestion}</p>
                    <p>Retrieved sources: {analysis.evidenceCoverage.retrievedSourceCount}</p>
                    <p>Categories used: {analysis.evidenceCoverage.categoriesUsed.join(", ") || "none"}</p>
                    {analysis.missingEvidence.length ? (
                      <div className="grid gap-1">
                        {analysis.missingEvidence.map((item) => (
                          <p key={item} className="text-amber-900">
                            {item}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p>No related Ask/RAG question has been run for this path yet.</p>
                )}
              </div>
            </section>

            <section className="grid gap-2">
              <h3 className="text-sm font-semibold text-foreground">Why</h3>
              <ul className="grid gap-2">
                {selectedEvaluation.why.map((item) => (
                  <li key={item} className="rounded-md bg-slate-50 p-3 text-sm leading-6 text-muted-foreground">
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <div className="grid gap-4 md:grid-cols-2">
              <section className="grid gap-2">
                <h3 className="text-sm font-semibold text-foreground">Blockers</h3>
                {selectedEvaluation.blockers.length ? (
                  selectedEvaluation.blockers.map((item) => (
                    <p key={item} className="rounded-md border border-red-100 bg-red-50 p-3 text-sm leading-6 text-red-900">
                      {item}
                    </p>
                  ))
                ) : (
                  <p className="rounded-md border border-border bg-slate-50 p-3 text-sm text-muted-foreground">
                    No blocker identified by placeholder rules.
                  </p>
                )}
              </section>

              <section className="grid gap-2">
                <h3 className="text-sm font-semibold text-foreground">Missing documents</h3>
                <div className="flex flex-wrap gap-2 rounded-md border border-border bg-slate-50 p-3">
                  {selectedEvaluation.missingDocuments.length ? (
                    selectedEvaluation.missingDocuments.map((kind) => (
                      <Badge key={kind} variant="yellow">
                        {documentKindLabels[kind]}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No missing document flagged.</span>
                  )}
                </div>
              </section>
            </div>

            <section className="grid gap-2">
              <h3 className="text-sm font-semibold text-foreground">Next actions</h3>
              <div className="grid gap-2">
                {selectedEvaluation.nextActions.map((action) => (
                  <div key={action} className="flex items-start gap-2 rounded-md border border-border bg-background p-3 text-sm leading-6">
                    <CheckSquare className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    {action}
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-2">
              <h3 className="text-sm font-semibold text-foreground">Official source evidence</h3>
              <div className="grid gap-2">
                {pathEvidenceChunks(selectedEvaluation.path, officialRetrieved).slice(0, 6).map((chunk) => {
                  const source = manifest?.sources.find((item) => item.id === chunk.sourceId);
                  return (
                    <div key={chunk.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-slate-50 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{source?.title ?? chunk.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {chunk.metadata.category} / {chunk.metadata.jurisdiction} / chunk {chunk.chunkIndex}
                        </p>
                      </div>
                      <Badge variant="green">indexed</Badge>
                    </div>
                  );
                })}
                {pathEvidenceChunks(selectedEvaluation.path, officialRetrieved).length === 0 ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
                    Missing official sources for this path. Index or add relevant public/knowledge files, then ask again.
                  </div>
                ) : null}
              </div>
            </section>

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => saveAsProgress(selectedEvaluation)}>
                <CheckSquare className="h-4 w-4" />
                Save as checklist
              </Button>
              <Button variant="outline" onClick={() => onCitations(pathEvidenceChunks(selectedEvaluation.path, officialRetrieved).slice(0, 6))}>
                <FileText className="h-4 w-4" />
                Show citations
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
