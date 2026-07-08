import { useState } from "react";
import { AlertTriangle, MessageSquareText, Search } from "lucide-react";
import type { AppSettings, Profile, RagAnalysisState, RagAnswer, RetrievedChunk } from "../domain/types";
import { answerWithRetrievedSources } from "../ai/ragAnswer";
import { buildRagAnalysis } from "../rag/analysis";
import { retrieveChunks } from "../rag/retrieval";
import { listPublicOfficialChunks } from "../storage/repository";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";

interface AskPageProps {
  profile?: Profile;
  settings: AppSettings;
  onCitations: (citations: RetrievedChunk[]) => void;
  onAnalysis: (analysis: RagAnalysisState) => void;
}

const sampleQuestions = [
  "Can I move from Chancenkarte to Ausbildung?",
  "What documents do I need for a study applicant path?",
  "What are my risky points based on my profile?",
];

function profileContextSummary(profile?: Profile) {
  if (!profile) return "No saved local profile.";

  return [
    `Current status: ${profile.currentStatus || "not set"}`,
    `Location: ${profile.city || "unknown city"} / ${profile.state || "unknown state"}`,
    `German level: ${profile.germanLevel || "not set"}`,
    `Goal: ${profile.goal}`,
    `Education: ${profile.educationBackground || "not set"}`,
    `Work experience: ${profile.workExperience || "not set"}`,
  ].join("\n");
}

function citationLocation(citation: RetrievedChunk) {
  const page = typeof citation.pageNumber === "number" ? `page ${citation.pageNumber}` : "manual/no page";
  return `${citation.fileName} / ${page} / chunk ${citation.chunkIndex}`;
}

export function AskPage({ profile, settings, onCitations, onAnalysis }: AskPageProps) {
  const [question, setQuestion] = useState(sampleQuestions[0]);
  const [answer, setAnswer] = useState<RagAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<RagAnalysisState | null>(null);

  async function ask() {
    setBusy(true);
    try {
      const officialChunks = await listPublicOfficialChunks();
      const retrieved = retrieveChunks(question, officialChunks, 7);
      const nextAnalysis = buildRagAnalysis(question, retrieved);
      onCitations(retrieved);
      onAnalysis(nextAnalysis);
      setLastAnalysis(nextAnalysis);
      const nextAnswer = await answerWithRetrievedSources(question, retrieved, profile, settings, officialChunks.length);
      setAnswer(nextAnswer);
    } finally {
      setBusy(false);
    }
  }

  async function retryAiExplanation() {
    if (!answer) return;
    setBusy(true);
    try {
      const nextAnswer = await answerWithRetrievedSources(answer.question, answer.citations, profile, settings, answer.citations.length);
      const nextAnalysis = buildRagAnalysis(answer.question, nextAnswer.citations);
      onCitations(nextAnswer.citations);
      onAnalysis(nextAnalysis);
      setLastAnalysis(nextAnalysis);
      setAnswer(nextAnswer);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 p-5 lg:p-8">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <MessageSquareText className="h-4 w-4" />
          RAG Search / Ask
        </div>
        <h2 className="mt-2 text-3xl font-semibold text-foreground">Ask only what your sources can support.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Retrieval runs over indexed official chunks first. If no official source supports the question, the app must say
          "Not found in provided sources."
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Question</CardTitle>
            <CardDescription>Use specific transition or document questions for best retrieval.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              {sampleQuestions.map((sample) => (
                <button
                  key={sample}
                  onClick={() => setQuestion(sample)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-left text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  {sample}
                </button>
              ))}
            </div>
            <Textarea className="min-h-32 text-base" value={question} onChange={(event) => setQuestion(event.target.value)} />
            <Button className="w-fit" onClick={ask} disabled={busy || !question.trim()}>
              <Search className="h-4 w-4" />
              {busy ? "Searching sources..." : "Ask with citations"}
            </Button>
          </CardContent>
        </Card>

        <Card className="self-start border-amber-200 bg-amber-50/70 shadow-none">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <p className="text-sm font-semibold text-amber-950">AI is not the source of truth</p>
                <p className="mt-1 text-sm leading-6 text-amber-900">
                  It may summarize retrieved official chunks, explain risk in plain language, and suggest sourced next
                  steps. It must not invent legal rules or ignore missing evidence.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Answer</CardTitle>
          <CardDescription>Claims are constrained to retrieved official chunks and local profile context.</CardDescription>
        </CardHeader>
        <CardContent>
          {answer ? (
            <div className="max-h-[65vh] overflow-y-auto pr-1 sm:max-h-[70vh] lg:max-h-[calc(100vh-220px)]">
              <div className="grid gap-4">
                <section
                  className={
                    answer.status === "not-found"
                      ? "rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950"
                      : "rounded-lg border border-border bg-slate-50 p-4 text-sm leading-7 text-foreground"
                  }
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">Answer summary</p>
                      <p className="mt-1 text-xs text-muted-foreground">{answer.statusLabel}</p>
                    </div>
                    <span className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
                      {answer.citations.length} citation chunk{answer.citations.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <pre className="whitespace-pre-wrap break-words font-sans">{answer.answer}</pre>
                </section>

                {answer.warning ? (
                  <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                    <div className="min-w-0">
                      <p className="font-semibold">Provider warning</p>
                      <p className="mt-1 text-xs leading-5">{answer.warning}</p>
                      {answer.providerError ? (
                        <p className="mt-1 break-words text-xs leading-5 text-amber-800">{answer.providerError}</p>
                      ) : null}
                    </div>
                    <Button variant="outline" size="sm" onClick={retryAiExplanation} disabled={busy}>
                      Retry AI Explanation
                    </Button>
                  </section>
                ) : null}

                <section className="rounded-lg border border-border bg-background p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">Evidence citations</p>
                    {lastAnalysis ? (
                      <p className="text-xs text-muted-foreground">
                        {lastAnalysis.evidenceCoverage.retrievedSourceCount} source
                        {lastAnalysis.evidenceCoverage.retrievedSourceCount === 1 ? "" : "s"} /{" "}
                        {lastAnalysis.evidenceCoverage.categoriesUsed.join(", ") || "no categories"}
                      </p>
                    ) : null}
                  </div>
                  {answer.citations.length ? (
                    <div className="mt-3 grid gap-2">
                      {answer.citations.map((citation, index) => (
                        <div key={citation.id} className="rounded-md border border-border bg-slate-50 p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">C{index + 1}. {citation.title}</p>
                            <span className="text-xs text-muted-foreground">score {citation.score.toFixed(1)}</span>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{citation.authority}</p>
                          <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                            {citation.metadata.category} / {citationLocation(citation)}
                          </p>
                          <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-foreground">{citation.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">No retrieved official citations for this answer.</p>
                  )}
                </section>

                <section className="rounded-lg border border-border bg-background p-4">
                  <p className="text-sm font-semibold text-foreground">Profile context</p>
                  <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-xs leading-5 text-muted-foreground">{profileContextSummary(profile)}</pre>
                </section>

                <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950">
                  <p className="text-sm font-semibold">Missing evidence / official verification warning</p>
                  {lastAnalysis?.evidenceCoverage.coveredConcepts.length ? (
                    <p className="mt-2">Found evidence for {lastAnalysis.evidenceCoverage.coveredConcepts.join(", ")}.</p>
                  ) : null}
                  {lastAnalysis?.missingEvidence.length ? (
                    <div className="mt-2 grid gap-1">
                      {lastAnalysis.missingEvidence.map((item) => (
                        <p key={item}>{item}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2">No missing evidence warning was detected from the retrieved citation set.</p>
                  )}
                  <p className="mt-2 font-medium">
                    Not legal advice. Official verification is still required before acting, and unsupported claims must
                    be treated as not found in provided sources.
                  </p>
                </section>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Ask a question after indexing official source chunks.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
