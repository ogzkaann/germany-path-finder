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

export function AskPage({ profile, settings, onCitations, onAnalysis }: AskPageProps) {
  const [question, setQuestion] = useState(sampleQuestions[0]);
  const [answer, setAnswer] = useState<RagAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<RagAnalysisState | null>(null);

  async function ask() {
    setBusy(true);
    const officialChunks = await listPublicOfficialChunks();
    const retrieved = retrieveChunks(question, officialChunks, 7);
    const nextAnalysis = buildRagAnalysis(question, retrieved);
    onCitations(retrieved);
    onAnalysis(nextAnalysis);
    setLastAnalysis(nextAnalysis);
    const nextAnswer = await answerWithRetrievedSources(question, retrieved, profile, settings, officialChunks.length);
    setAnswer(nextAnswer);
    setBusy(false);
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
            <div className="grid gap-4">
              {answer.warning ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                  <div>
                    <p className="font-semibold">{answer.warning}</p>
                    <p className="mt-1 text-xs leading-5">
                      RAG retrieval worked. AI explanation failed because the selected provider is unavailable.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={ask} disabled={busy}>
                    Retry AI answer
                  </Button>
                </div>
              ) : null}
              {lastAnalysis ? (
                <div className="grid gap-3 rounded-lg border border-border bg-slate-50 p-4 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <span className="font-semibold text-foreground">
                      Retrieved sources: {lastAnalysis.evidenceCoverage.retrievedSourceCount}
                    </span>
                    <span className="text-muted-foreground">
                      Categories: {lastAnalysis.evidenceCoverage.categoriesUsed.join(", ") || "none"}
                    </span>
                  </div>
                  {lastAnalysis.missingEvidence.length ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
                      {lastAnalysis.evidenceCoverage.coveredConcepts.length ? (
                        <p>Found evidence for {lastAnalysis.evidenceCoverage.coveredConcepts.join(", ")}.</p>
                      ) : null}
                      {lastAnalysis.missingEvidence.map((item) => (
                        <p key={item}>{item}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No missing evidence warning from retrieved citations.</p>
                  )}
                </div>
              ) : null}
              <div
                className={
                  answer.status === "not-found"
                    ? "rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950"
                    : "rounded-lg border border-border bg-slate-50 p-4 text-sm leading-7 text-foreground"
                }
              >
                <pre className="whitespace-pre-wrap font-sans">{answer.answer}</pre>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                {answer.citations.length} citation chunk{answer.citations.length === 1 ? "" : "s"} used / {answer.status}
              </p>
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
