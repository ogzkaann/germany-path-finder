import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck,
  History,
  KeyRound,
  Play,
  Settings,
  ShieldCheck,
} from "lucide-react";
import type {
  AppSettings,
  KnowledgeManifest,
  Profile,
  ProgressState,
  RagAnalysisState,
  RetrievedChunk,
  StoredDocument,
} from "./domain/types";
import { loadSettings } from "./ai/settings";
import { loadKnowledgeManifest } from "./rag/manifest";
import { getIndexedSourceIds, getProfile, getProgress, listDocuments } from "./storage/repository";
import { SettingsDialog } from "./components/SettingsDialog";
import { SourcePanel, SourcePanelContent } from "./components/SourcePanel";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { Dialog } from "./components/ui/dialog";
import { CommandCenter } from "./pages/CommandCenter";
import { ProfileBuilder } from "./pages/ProfileBuilder";
import { DocumentsPage } from "./pages/DocumentsPage";
import { VaultPage } from "./pages/VaultPage";
import { AskPage } from "./pages/AskPage";
import { PathResultsPage } from "./pages/PathResultsPage";
import { ProgressPage } from "./pages/ProgressPage";

type View = "home" | "profile" | "documents" | "vault" | "ask" | "paths" | "progress";

export default function App() {
  const [activeView, setActiveView] = useState<View>("home");
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [manifest, setManifest] = useState<KnowledgeManifest>();
  const [manifestError, setManifestError] = useState("");
  const [profile, setProfile] = useState<Profile>();
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [progress, setProgress] = useState<ProgressState>();
  const [indexedSourceIds, setIndexedSourceIds] = useState<string[]>([]);
  const [citations, setCitations] = useState<RetrievedChunk[]>([]);
  const [analysis, setAnalysis] = useState<RagAnalysisState>();

  const refreshLocalData = useCallback(async () => {
    const [nextProfile, nextDocuments, nextProgress, nextIndexedIds] = await Promise.all([
      getProfile(),
      listDocuments(),
      getProgress(),
      getIndexedSourceIds(),
    ]);
    setProfile(nextProfile);
    setDocuments(nextDocuments);
    setProgress(nextProgress);
    setIndexedSourceIds(nextIndexedIds);
  }, []);

  const updateCitations = useCallback((next: RetrievedChunk[]) => {
    setCitations(next);
  }, []);

  const updateAnalysis = useCallback((next: RagAnalysisState) => {
    setAnalysis(next);
    setCitations(next.retrievedCitations);
  }, []);

  useEffect(() => {
    loadKnowledgeManifest()
      .then(setManifest)
      .catch((error) => setManifestError(error instanceof Error ? error.message : "Manifest load failed."));
    refreshLocalData();
  }, [refreshLocalData]);

  const indexedCount = indexedSourceIds.length;
  const manifestCount = manifest?.sources.length ?? 0;
  const activeSourceList = useMemo(() => manifest?.sources ?? [], [manifest]);

  function renderView() {
    switch (activeView) {
      case "home":
        return (
          <CommandCenter
            profile={profile}
            documents={documents}
            progress={progress}
            manifest={manifest}
            indexedSourceIds={indexedSourceIds}
            settings={settings}
            onNavigate={(view) => setActiveView(view)}
            onDataChange={refreshLocalData}
            onCitations={updateCitations}
            onAnalysis={updateAnalysis}
          />
        );
      case "profile":
        return <ProfileBuilder onSaved={refreshLocalData} />;
      case "documents":
        return <DocumentsPage settings={settings} onDataChange={refreshLocalData} />;
      case "vault":
        return <VaultPage manifest={manifest} onDataChange={refreshLocalData} />;
      case "ask":
        return <AskPage profile={profile} settings={settings} onCitations={updateCitations} onAnalysis={updateAnalysis} />;
      case "paths":
        return (
          <PathResultsPage
            profile={profile}
            documents={documents}
            indexedSourceIds={indexedSourceIds}
            manifest={manifest}
            analysis={analysis}
            onCitations={updateCitations}
            onDataChange={refreshLocalData}
          />
        );
      case "progress":
        return <ProgressPage onDataChange={refreshLocalData} />;
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/92 backdrop-blur">
        <div className="flex min-h-16 items-center gap-3 px-4 lg:px-5">
          <button className="flex items-center gap-3" onClick={() => setActiveView("home")} aria-label="Go home">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="hidden sm:block">
              <span className="block text-left text-sm font-semibold leading-5">Germany Path Finder</span>
              <span className="block text-left text-xs text-muted-foreground">Local-first RAG demo</span>
            </span>
          </button>

          <nav className="no-scrollbar ml-auto flex min-w-0 items-center gap-1 overflow-x-auto">
            <Button variant="ghost" size="sm" onClick={() => setActiveView("vault")}>
              <BookOpenCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Vault</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setActiveView("progress")}>
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
            <Button variant={activeView === "home" ? "default" : "outline"} size="sm" onClick={() => setActiveView("home")}>
              <Play className="h-4 w-4" />
              <span className="hidden sm:inline">Demo</span>
            </Button>
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Badge variant={indexedCount > 0 ? "green" : "yellow"}>
              {indexedCount}/{manifestCount} sources
            </Badge>
            <Badge variant={settings.apiKey ? "green" : "outline"}>
              {settings.apiKey ? settings.providerName : "No API key"}
            </Badge>
          </div>
          <Button className="hidden sm:inline-flex" variant="outline" onClick={() => setSettingsOpen(true)}>
            <KeyRound className="h-4 w-4" />
            BYOK API Key
          </Button>
          <Button className="xl:hidden" variant="outline" size="sm" onClick={() => setSourcesOpen(true)}>
            Sources
          </Button>
        </div>
        {manifestError ? (
          <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900">
            {manifestError}
          </div>
        ) : null}
      </header>

      <main className="flex">
        <section className="min-w-0 flex-1">{renderView()}</section>
        <SourcePanel citations={citations} manifestSources={activeSourceList} />
      </main>

      <SettingsDialog
        open={settingsOpen}
        settings={settings}
        onOpenChange={setSettingsOpen}
        onSave={(nextSettings) => setSettings(nextSettings)}
      />

      <Dialog
        open={sourcesOpen}
        onOpenChange={setSourcesOpen}
        title="Sources & Citations"
        description="Mobile source rail for active citations and manifest categories."
      >
        <SourcePanelContent citations={citations} manifestSources={activeSourceList} />
      </Dialog>
    </div>
  );
}
