import { useEffect, useState } from "react";
import { NotebookPen, Plus, Save, Trash2 } from "lucide-react";
import type { ChecklistItem, ProgressState } from "../domain/types";
import { createDefaultProgress, saveProgress } from "../storage/repository";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";

interface ProgressPageProps {
  onDataChange: () => void;
}

export function ProgressPage({ onDataChange }: ProgressPageProps) {
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    createDefaultProgress().then(setProgress);
  }, []);

  const currentProgress = progress;

  if (!currentProgress) {
    return <div className="p-8 text-sm text-muted-foreground">Loading local progress...</div>;
  }

  const readyProgress: ProgressState = currentProgress;

  async function persist(next: ProgressState) {
    setProgress(next);
    await saveProgress(next);
    onDataChange();
  }

  function toggleItem(id: string) {
    const next = {
      ...readyProgress,
      checklist: readyProgress.checklist.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
      updatedAt: new Date().toISOString(),
    };
    persist(next);
  }

  function addItem() {
    if (!newItem.trim()) return;
    const item: ChecklistItem = {
      id: crypto.randomUUID(),
      label: newItem.trim(),
      done: false,
    };
    persist({ ...readyProgress, checklist: [...readyProgress.checklist, item], updatedAt: new Date().toISOString() });
    setNewItem("");
  }

  function removeItem(id: string) {
    persist({
      ...readyProgress,
      checklist: readyProgress.checklist.filter((item) => item.id !== id),
      updatedAt: new Date().toISOString(),
    });
  }

  const doneCount = readyProgress.checklist.filter((item) => item.done).length;
  const percent = readyProgress.checklist.length ? Math.round((doneCount / readyProgress.checklist.length) * 100) : 0;

  return (
    <div className="grid gap-5 p-5 lg:p-8">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <NotebookPen className="h-4 w-4" />
          Local Progress Checklist
        </div>
        <h2 className="mt-2 text-3xl font-semibold text-foreground">Keep the path review grounded and unfinished until verified.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Checklist progress and notes are stored locally in the browser.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>{readyProgress.selectedPath ? `${readyProgress.selectedPath} checklist` : "Checklist"}</CardTitle>
                <CardDescription>
                  {doneCount} of {readyProgress.checklist.length} completed
                </CardDescription>
              </div>
              <div className="min-w-32">
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${percent}%` }} />
                </div>
                <p className="mt-1 text-right text-xs font-semibold text-muted-foreground">{percent}%</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            {readyProgress.checklist.length ? (
              readyProgress.checklist.map((item) => (
                <div key={item.id} className="flex items-start gap-3 rounded-md border border-border bg-background p-3">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleItem(item.id)}
                    className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-ring"
                  />
                  <span className={item.done ? "flex-1 text-sm leading-6 text-muted-foreground line-through" : "flex-1 text-sm leading-6 text-foreground"}>
                    {item.label}
                  </span>
                  <Button variant="ghost" size="icon" aria-label="Remove item" onClick={() => removeItem(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Save a path result as a checklist or add your own item.
              </div>
            )}

            <div className="flex gap-2">
              <Input value={newItem} placeholder="Add local action..." onChange={(event) => setNewItem(event.target.value)} />
              <Button onClick={addItem}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>Use this for authority contacts, appointment notes, or unresolved questions.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Textarea
              className="min-h-[320px]"
              value={readyProgress.notes}
              onChange={(event) => setProgress({ ...readyProgress, notes: event.target.value })}
            />
            <Button onClick={() => persist({ ...readyProgress, updatedAt: new Date().toISOString() })}>
              <Save className="h-4 w-4" />
              Save notes
            </Button>
            <p className="text-xs leading-5 text-muted-foreground">
              Last updated {new Date(readyProgress.updatedAt).toLocaleString()}. Nothing is synced to a server.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
