import { ArrowRight, Database, FileSearch, KeyRound, Scale, ShieldCheck } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

interface LandingProps {
  onStart: () => void;
  onOpenSettings: () => void;
  onNavigate: (view: string) => void;
}

export function Landing({ onStart, onOpenSettings, onNavigate }: LandingProps) {
  return (
    <div className="grid min-h-[calc(100vh-88px)] content-start gap-8 p-5 lg:p-8">
      <section className="grid gap-7">
        <div className="max-w-5xl">
          <div className="mb-6 flex items-center gap-3 text-sm font-semibold text-muted-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Scale className="h-4 w-4" />
            </span>
            Germany Path Finder
          </div>
          <h1 className="max-w-5xl text-4xl font-semibold leading-[1.08] text-foreground sm:text-5xl lg:text-[52px]">
            Understand your next legal/career path in Germany — with source-backed AI
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            A local-first RAG demo for residence and career transition research. Official documents and transparent
            rules set the boundary; AI explains only what the sources support.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={onStart}>
              Demo
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={onOpenSettings}>
              <KeyRound className="h-4 w-4" />
              BYOK API key setup
            </Button>
          </div>
          <div className="mt-6 flex items-center gap-2 text-sm font-medium text-amber-800">
            <ShieldCheck className="h-4 w-4" />
            Not legal advice. Source-aware decision support demo.
          </div>
        </div>

        <div className="grid content-start gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-slate-200 bg-slate-50/80 shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Current workflow</p>
                  <p className="text-xs leading-5 text-muted-foreground">Profile → Evidence → Path review</p>
                </div>
                <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                  Local-first
                </span>
              </div>
              <div className="mt-4 grid gap-2">
                {["Build profile", "Index official sources", "Ask with citations", "Save checklist"].map((item, index) => (
                  <button
                    key={item}
                    className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => onNavigate(index === 0 ? "profile" : index === 1 ? "vault" : index === 2 ? "ask" : "progress")}
                  >
                    <span>{item}</span>
                    <span className="text-xs font-semibold text-muted-foreground">0{index + 1}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Card className="shadow-none">
              <CardContent className="p-4">
                <FileSearch className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-semibold text-foreground">Citation panel</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Every answer displays source title, authority, file and chunk details.
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="p-4">
                <Database className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-semibold text-foreground">IndexedDB vault</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Personal profile, extracted text and progress stay in the browser.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          ["AI is constrained", "No source, no legal claim. Missing evidence is explicit."],
          ["Rules are editable", "Path evaluation lives in transparent TypeScript rules."],
          ["Ready for real PDFs", "Replace placeholder manifest entries with official documents."],
        ].map(([title, body]) => (
          <Card key={title} className="shadow-none">
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
