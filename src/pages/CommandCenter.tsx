import { useMemo, useState } from "react";
import {
  BookOpenCheck,
  CheckCircle2,
  DatabaseZap,
  FileText,
  FileUp,
  Loader2,
  MessageSquareText,
  Route,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import type {
  AppSettings,
  KnowledgeManifest,
  PathEvaluation,
  Profile,
  ProgressState,
  RagAnswer,
  RagAnalysisState,
  RetrievedChunk,
  StoredDocument,
} from "../domain/types";
import { documentKindLabels, goalLabels, pathDescriptions } from "../domain/labels";
import { evaluatePathRules } from "../domain/rules/pathRules";
import { answerWithRetrievedSources } from "../ai/ragAnswer";
import { buildRagAnalysis } from "../rag/analysis";
import { indexPreloadedOfficialSources, type SourceIndexResult } from "../rag/indexing";
import { retrieveChunks } from "../rag/retrieval";
import { listPublicOfficialChunks } from "../storage/repository";
import { RiskBadge } from "../components/RiskBadge";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";

type CommandView = "profile" | "documents" | "vault" | "ask" | "paths" | "progress";

interface CommandCenterProps {
  profile?: Profile;
  documents: StoredDocument[];
  progress?: ProgressState;
  manifest?: KnowledgeManifest;
  indexedSourceIds: string[];
  indexedChunkCount: number;
  settings: AppSettings;
  onNavigate: (view: CommandView) => void;
  onDataChange: () => void;
  onCitations: (citations: RetrievedChunk[]) => void;
  onAnalysis: (analysis: RagAnalysisState) => void;
}

const workflowItems: Array<{ id: CommandView; label: string; helper: string; icon: typeof UserRound }> = [
  { id: "profile", label: "Profile Builder", helper: "Situation and goal", icon: UserRound },
  { id: "documents", label: "Personal Documents", helper: "CV, diploma, certificates", icon: FileText },
  { id: "ask", label: "Ask & Analyze", helper: "Source-bound RAG", icon: MessageSquareText },
  { id: "paths", label: "Path Results", helper: "Fit, blockers, next actions", icon: Route },
  { id: "progress", label: "Progress", helper: "Checklist and notes", icon: CheckCircle2 },
];

function shortText(value: string | undefined, fallback: string) {
  return value?.trim() ? value : fallback;
}

function fitRank(fit: PathEvaluation["fit"]) {
  return fit === "green" ? 1 : fit === "yellow" ? 2 : 3;
}

function workflowCompletion(profile: Profile | undefined, documents: StoredDocument[], indexedSourceIds: string[], progress?: ProgressState) {
  return [
    Boolean(profile?.currentStatus && profile?.goal),
    documents.length > 0,
    indexedSourceIds.length > 0,
    Boolean(progress?.selectedPath),
    Boolean(progress?.checklist.length),
  ];
}

export function CommandCenter({
  profile,
  documents,
  progress,
  manifest,
  indexedSourceIds,
  indexedChunkCount,
  settings,
  onNavigate,
  onDataChange,
  onCitations,
  onAnalysis,
}: CommandCenterProps) {
  const [question, setQuestion] = useState("Can I move from Chancenkarte to Ausbildung?");
  const [answer, setAnswer] = useState<RagAnswer | null>(null);
  const [asking, setAsking] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [indexResults, setIndexResults] = useState<SourceIndexResult[]>([]);

  const completion = workflowCompletion(profile, documents, indexedSourceIds, progress);
  const doneCount = completion.filter(Boolean).length;
  const evaluations = useMemo(
    () => evaluatePathRules({ profile, documents, indexedSourceIds }).sort((a, b) => fitRank(a.fit) - fitRank(b.fit)),
    [profile, documents, indexedSourceIds],
  );
  const topPaths = evaluations.slice(0, 3);
  const availableSources = manifest?.sources.filter((source) => source.status === "available").length ?? 0;
  const indexedAvailableSources =
    manifest?.sources.filter((source) => source.status === "available" && indexedSourceIds.includes(source.id)).length ??
    indexedSourceIds.length;
  const failedSourceCount = indexResults.filter((result) => result.state === "failed" || result.state === "missing").length;
  const checklistDone = progress?.checklist.filter((item) => item.done).length ?? 0;

  async function handleIndexAll() {
    if (!manifest) return;
    setIndexing(true);
    setIndexResults([]);
    try {
      const results = await indexPreloadedOfficialSources(manifest.sources, (result) => {
        setIndexResults((current) => [...current.filter((item) => item.sourceId !== result.sourceId), result]);
      });
      setIndexResults(results);
      onDataChange();
    } finally {
      setIndexing(false);
    }
  }

  async function handleAsk() {
    setAsking(true);
    try {
      const officialChunks = await listPublicOfficialChunks();
      const retrieved = retrieveChunks(question, officialChunks, 6);
      const nextAnswer = await answerWithRetrievedSources(question, retrieved, profile, settings, officialChunks.length);
      const nextAnalysis = buildRagAnalysis(question, nextAnswer.citations);
      onCitations(nextAnswer.citations);
      onAnalysis(nextAnalysis);
      setAnswer(nextAnswer);
    } finally {
      setAsking(false);
    }
  }

  async function retryAiExplanation() {
    if (!answer) return;
    setAsking(true);
    try {
      const nextAnswer = await answerWithRetrievedSources(answer.question, answer.citations, profile, settings, answer.citations.length);
      const nextAnalysis = buildRagAnalysis(answer.question, nextAnswer.citations);
      onCitations(nextAnswer.citations);
      onAnalysis(nextAnalysis);
      setAnswer(nextAnswer);
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[248px_minmax(0,1fr)] lg:p-5">
      <aside className="grid gap-4 lg:sticky lg:top-[88px] lg:max-h-[calc(100vh-104px)] lg:content-start">
        <div className="rounded-lg border border-border bg-card p-4 shadow-crisp">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Your workflow</p>
          <div className="mt-3 grid gap-2">
            {workflowItems.map((item, index) => {
              const Icon = item.icon;
              const complete = completion[index];
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className="flex items-center gap-3 rounded-md border border-border bg-background p-3 text-left hover:bg-muted"
                >
                  <span
                    className={
                      complete
                        ? "flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"
                        : "flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-muted-foreground"
                    }
                  >
                    {complete ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">{item.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.helper}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 shadow-crisp">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Progress checklist</p>
            <Badge variant={doneCount === completion.length ? "green" : "outline"}>
              {doneCount}/{completion.length}
            </Badge>
          </div>
          <div className="mt-3 h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${(doneCount / completion.length) * 100}%` }} />
          </div>
          <div className="mt-3 grid gap-2 text-xs leading-5 text-muted-foreground">
            <p>{documents.length} personal document{documents.length === 1 ? "" : "s"} stored locally</p>
            <p>{indexedSourceIds.length} official source{indexedSourceIds.length === 1 ? "" : "s"} indexed</p>
            <p>
              {checklistDone}/{progress?.checklist.length ?? 0} saved checklist items done
            </p>
          </div>
        </div>
      </aside>

      <section className="grid min-w-0 gap-4">
        <div className="grid min-w-0 gap-4 xl:grid-cols-[1fr_0.85fr]">
          <Card className="min-w-0 shadow-crisp">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">Profile Builder</CardTitle>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Reviewed local context for rules and RAG.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => onNavigate("profile")}>
                  Edit profile
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 pt-2">
              <div className="grid gap-2 md:grid-cols-3">
                <div className="rounded-md border border-border bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">Status</p>
                  <p className="mt-1 truncate text-sm font-semibold">{shortText(profile?.currentStatus, "Not set")}</p>
                </div>
                <div className="rounded-md border border-border bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">Location</p>
                  <p className="mt-1 text-sm font-semibold leading-5">
                    {profile ? `${profile.city} / ${profile.state}` : "Düsseldorf / NRW"}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">Goal</p>
                  <p className="mt-1 truncate text-sm font-semibold">{profile ? goalLabels[profile.goal] : "Not set"}</p>
                </div>
              </div>
              <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                {shortText(profile?.educationBackground, "Education background is not complete yet.")}
              </p>
            </CardContent>
          </Card>

          <Card className="min-w-0 shadow-crisp">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-lg">Personal Documents</CardTitle>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Users upload personal PDFs only. Official PDFs are owner-preloaded.
              </p>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 pt-2">
              <div className="flex items-center justify-between rounded-md border border-dashed border-border bg-slate-50 p-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Upload and review profile JSON</p>
                  <p className="mt-1 text-xs text-muted-foreground">CV, diploma, transcript, certificate, contract.</p>
                </div>
                <Button size="sm" onClick={() => onNavigate("documents")}>
                  <FileUp className="h-4 w-4" />
                  Upload
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {documents.slice(0, 4).map((document) => (
                  <Badge key={document.id} variant="outline">
                    {documentKindLabels[document.kind]}
                  </Badge>
                ))}
                {documents.length === 0 ? <span className="text-xs text-muted-foreground">No personal documents yet.</span> : null}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid min-w-0 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="min-w-0 shadow-crisp">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">Official Knowledge Vault</CardTitle>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Generated public/knowledge source manifest.</p>
                </div>
                <Button size="sm" onClick={handleIndexAll} disabled={indexing || !manifest}>
                  {indexing ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseZap className="h-4 w-4" />}
                  Index
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 pt-2">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className="rounded-md border border-border bg-slate-50 p-3">
                  <p className="text-xs text-muted-foreground">Available sources</p>
                  <p className="text-lg font-semibold">{availableSources}</p>
                </div>
                <div className="rounded-md border border-border bg-slate-50 p-3">
                  <p className="text-xs text-muted-foreground">Indexed sources</p>
                  <p className="text-lg font-semibold">
                    {indexedAvailableSources}/{availableSources}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-slate-50 p-3">
                  <p className="text-xs text-muted-foreground">Indexed chunks</p>
                  <p className="text-lg font-semibold">{indexedChunkCount}</p>
                </div>
                <div className="rounded-md border border-border bg-slate-50 p-3">
                  <p className="text-xs text-muted-foreground">Failed sources</p>
                  <p className="text-lg font-semibold">{failedSourceCount}</p>
                </div>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                The project owner preloads official files into public/knowledge. Users only upload personal documents.
              </p>
              {indexResults[0] ? (
                <p className="rounded-md bg-muted p-2 text-xs leading-5 text-muted-foreground">
                  {indexResults[indexResults.length - 1]?.message}
                </p>
              ) : null}
              <Button variant="outline" size="sm" className="w-fit" onClick={() => onNavigate("vault")}>
                Open vault
              </Button>
            </CardContent>
          </Card>

          <Card className="min-w-0 shadow-crisp">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">Ask / RAG Answer</CardTitle>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Fails closed when no official chunks are indexed.</p>
                </div>
                <Badge variant={indexedSourceIds.length ? "green" : "yellow"}>
                  {indexedSourceIds.length ? "sources ready" : "no sources"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 pt-2">
              <Textarea className="min-h-20 text-sm" value={question} onChange={(event) => setQuestion(event.target.value)} />
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={handleAsk} disabled={asking || !question.trim()}>
                  {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareText className="h-4 w-4" />}
                  Ask with citations
                </Button>
                <Button variant="outline" size="sm" onClick={() => onNavigate("ask")}>
                  Full ask screen
                </Button>
              </div>
              {answer ? (
                <div className="grid gap-2">
                  <p className="text-xs font-semibold text-foreground">{answer.statusLabel}</p>
                  {answer.warning ? (
                    <div className="grid gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs leading-5 text-amber-950">
                      <p>{answer.warning}</p>
                      <Button variant="outline" size="sm" className="w-fit" onClick={retryAiExplanation} disabled={asking}>
                        Retry AI Explanation
                      </Button>
                    </div>
                  ) : null}
                  <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 p-3 font-sans text-xs leading-5 text-muted-foreground">{answer.answer}</pre>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card className="min-w-0 shadow-crisp">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Path Results</CardTitle>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Transparent placeholder rules with conservative risk labels.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => onNavigate("paths")}>
                Review all
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto p-4 pt-2">
            <table className="w-full min-w-[680px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-muted-foreground">
                  <th className="border-b border-border py-2 pr-3">Path</th>
                  <th className="border-b border-border px-3 py-2">Why</th>
                  <th className="border-b border-border px-3 py-2">Missing docs</th>
                  <th className="border-b border-border py-2 pl-3">Fit / risk</th>
                </tr>
              </thead>
              <tbody>
                {topPaths.map((path) => (
                  <tr key={path.path}>
                    <td className="border-b border-border py-3 pr-3 align-top">
                      <p className="font-semibold text-foreground">{path.path}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{path.confidence} confidence</p>
                    </td>
                    <td className="border-b border-border px-3 py-3 align-top text-xs leading-5 text-muted-foreground">
                      {pathDescriptions[path.path]}
                    </td>
                    <td className="border-b border-border px-3 py-3 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        {path.missingDocuments.slice(0, 3).map((kind) => (
                          <Badge key={kind} variant="outline">
                            {documentKindLabels[kind]}
                          </Badge>
                        ))}
                        {path.missingDocuments.length === 0 ? <span className="text-xs text-muted-foreground">None flagged</span> : null}
                      </div>
                    </td>
                    <td className="border-b border-border py-3 pl-3 align-top">
                      <RiskBadge level={path.fit} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="grid min-w-0 gap-4 xl:grid-cols-[1fr_0.9fr]">
          <Card className="min-w-0 border-amber-200 bg-amber-50/60 shadow-none">
            <CardContent className="flex items-start gap-3 p-4">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" />
              <div>
                <p className="text-sm font-semibold text-amber-950">Source-bound decision support</p>
                <p className="mt-1 text-xs leading-5 text-amber-900">
                  AI can summarize retrieved official chunks and reviewed profile context. It cannot claim eligibility or
                  fill missing legal facts.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0 shadow-none">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-foreground">What this demonstrates</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Local-first RAG, BYOK AI, source-bound answers, transparent rules, personal document extraction,
                manifest-driven official sources, and human review before profile save.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
