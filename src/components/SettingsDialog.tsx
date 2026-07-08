import { useEffect, useState } from "react";
import { KeyRound, ShieldAlert } from "lucide-react";
import type { AppSettings } from "../domain/types";
import { normalizeSettings, providerPresets, saveSettings } from "../ai/settings";
import { testAiConnection } from "../ai/client";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Input } from "./ui/input";
import { Select } from "./ui/select";

interface SettingsDialogProps {
  open: boolean;
  settings: AppSettings;
  onOpenChange: (open: boolean) => void;
  onSave: (settings: AppSettings) => void;
}

export function SettingsDialog({ open, settings, onOpenChange, onSave }: SettingsDialogProps) {
  const [draft, setDraft] = useState(settings);
  const [testState, setTestState] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraft(settings);
    setTestState("idle");
    setMessage("");
  }, [open, settings]);

  function updateField(field: keyof AppSettings, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateProvider(providerId: AppSettings["providerId"]) {
    const preset = providerPresets[providerId];
    if (preset.disabled) return;
    setDraft((current) => ({
      ...current,
      providerId,
      providerName: preset.providerName,
      endpoint: preset.endpoint,
      model: preset.model,
    }));
  }

  async function handleTest() {
    const normalized = normalizeSettings(draft);
    setTestState("testing");
    setMessage("");
    try {
      await testAiConnection(normalized);
      saveSettings(normalized);
      setDraft(normalized);
      onSave(normalized);
      setTestState("ok");
      setMessage("Connection succeeded. Settings saved locally.");
    } catch (error) {
      setTestState("error");
      setMessage(error instanceof Error ? error.message : "Connection failed.");
    }
  }

  function handleSave() {
    const normalized = normalizeSettings(draft);
    saveSettings(normalized);
    onSave(normalized);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="BYOK AI settings"
      description="Choose an OpenAI-compatible provider. Settings are stored only in this browser."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <KeyRound className="h-4 w-4" />
            Save locally
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Your key is stored locally in this browser. Personal documents may be sent to the selected provider only
              when you run AI extraction or ask a question.
            </p>
          </div>
        </div>

        <label className="grid gap-2 text-sm font-medium text-foreground">
          API provider
          <Select
            value={draft.providerId}
            onChange={(event) => updateProvider(event.target.value as AppSettings["providerId"])}
          >
            <option value="custom">OpenAI-compatible custom</option>
            <option value="gemini">Gemini API</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic" disabled>
              Anthropic (not implemented)
            </option>
          </Select>
        </label>

        <label className="grid gap-2 text-sm font-medium text-foreground">
          Base URL
          <Input value={draft.endpoint} onChange={(event) => updateField("endpoint", event.target.value)} />
        </label>

        <label className="grid gap-2 text-sm font-medium text-foreground">
          API key
          <Input
            type="password"
            value={draft.apiKey}
            placeholder="sk-..."
            onChange={(event) => updateField("apiKey", event.target.value)}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-foreground">
          Model name
          <Input value={draft.model} onChange={(event) => updateField("model", event.target.value)} />
        </label>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleTest} disabled={testState === "testing"}>
            Test connection
          </Button>
          {message ? (
            <p className={testState === "ok" ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{message}</p>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}
