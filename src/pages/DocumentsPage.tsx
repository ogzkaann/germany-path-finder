import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { FileUp, Loader2, Save, Wand2 } from "lucide-react";
import type { AppSettings, DocumentKind, ExtractedProfile, StoredDocument } from "../domain/types";
import { documentKindLabels } from "../domain/labels";
import { extractedProfileSchema } from "../domain/schemas";
import { extractProfileFromDocumentText } from "../ai/profileExtraction";
import { createPrivateUserDocumentMetadata, createUserDocumentChunks } from "../rag/chunking";
import { extractPdfText } from "../rag/pdf";
import { getProfile, listDocuments, replaceChunksForDocument, saveDocument, saveProfile, updateDocument } from "../storage/repository";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Select } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";

interface DocumentsPageProps {
  settings: AppSettings;
  onDataChange: () => void;
}

const uploadKinds: DocumentKind[] = ["cv", "diploma", "transcript", "language-certificate", "employment-contract", "other"];

export function DocumentsPage({ settings, onDataChange }: DocumentsPageProps) {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [kind, setKind] = useState<DocumentKind>("cv");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [jsonDraft, setJsonDraft] = useState("{}");

  async function refresh() {
    const stored = await listDocuments();
    setDocuments(stored);
    if (!selectedDocumentId && stored[0]) {
      setSelectedDocumentId(stored[0].id);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedDocumentId),
    [documents, selectedDocumentId],
  );

  useEffect(() => {
    if (selectedDocument?.extractedProfile) {
      setJsonDraft(JSON.stringify(selectedDocument.extractedProfile, null, 2));
    }
  }, [selectedDocument]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage("");

    try {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        throw new Error("Only PDF upload is supported in this MVP.");
      }

      const extracted = await extractPdfText(file);
      if (!extracted.text.trim()) {
        throw new Error("No selectable text found. This may be a scanned PDF; OCR is future support.");
      }

      const id = crypto.randomUUID();
      const extraction = await extractProfileFromDocumentText(extracted.text, settings);
      const metadata = createPrivateUserDocumentMetadata(kind);
      const stored: StoredDocument = {
        id,
        kind,
        fileName: file.name,
        text: extracted.text,
        metadata,
        pageCount: extracted.pageCount,
        extractedProfile: extraction.profile,
        createdAt: new Date().toISOString(),
        status: "parsed",
      };

      await saveDocument(stored);
      await replaceChunksForDocument(id, createUserDocumentChunks(id, file.name, extracted.text, kind, metadata));
      setSelectedDocumentId(id);
      setJsonDraft(JSON.stringify(extraction.profile, null, 2));
      setMessage(`${file.name} parsed. ${extraction.warning ?? "Structured profile extracted."}`);
      await refresh();
      onDataChange();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function handleSaveJson() {
    if (!selectedDocument) return;
    try {
      const parsed = extractedProfileSchema.parse(JSON.parse(jsonDraft)) as ExtractedProfile;
      const updated = { ...selectedDocument, extractedProfile: parsed };
      await updateDocument(updated);
      const profile = await getProfile();
      await saveProfile({
        id: "local-profile",
        currentStatus: profile?.currentStatus ?? "",
        city: profile?.city ?? "Düsseldorf",
        state: profile?.state ?? "NRW",
        germanLevel: parsed.germanLevel ?? profile?.germanLevel ?? "B1",
        educationBackground:
          profile?.educationBackground ??
          [parsed.degree, parsed.fieldOfStudy, parsed.university, parsed.ects, parsed.gpa].filter(Boolean).join(", "),
        workExperience: profile?.workExperience ?? parsed.workExperience?.join("\n") ?? "",
        goal: profile?.goal ?? "ausbildung",
        extracted: parsed,
        updatedAt: new Date().toISOString(),
      });
      setMessage("Reviewed JSON saved to the document and local profile.");
      await refresh();
      onDataChange();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save JSON.");
    }
  }

  return (
    <div className="grid gap-5 p-5 lg:p-8">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <FileUp className="h-4 w-4" />
          Personal Document Upload
        </div>
        <h2 className="mt-2 text-3xl font-semibold text-foreground">Parse personal documents, then review the extracted profile.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          User uploads are for personal documents only. Official PDFs are preloaded by the project owner through the
          manifest source registry.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Upload vault</CardTitle>
            <CardDescription>CV, diploma, transcript, language certificate, employment contract or related PDF.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium">
              Document type
              <Select value={kind} onChange={(event) => setKind(event.target.value as DocumentKind)}>
                {uploadKinds.map((item) => (
                  <option key={item} value={item}>
                    {documentKindLabels[item]}
                  </option>
                ))}
              </Select>
            </label>

            <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-slate-50 px-4 py-8 text-center hover:bg-muted">
              {busy ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <FileUp className="h-8 w-8 text-primary" />}
              <span className="mt-3 text-sm font-semibold text-foreground">Upload PDF</span>
              <span className="mt-1 text-xs leading-5 text-muted-foreground">Scanned PDFs can be handled with future OCR support.</span>
              <input className="sr-only" type="file" accept="application/pdf,.pdf" onChange={handleUpload} disabled={busy} />
            </label>

            {message ? <p className="rounded-md bg-muted p-3 text-sm leading-6 text-muted-foreground">{message}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Review extracted profile JSON</CardTitle>
            <CardDescription>Edit before saving. Unknown fields should stay empty instead of guessed.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              {documents.map((document) => (
                <button
                  key={document.id}
                  onClick={() => setSelectedDocumentId(document.id)}
                  className={
                    document.id === selectedDocumentId
                      ? "rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                      : "rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                  }
                >
                  {documentKindLabels[document.kind]} / {document.fileName}
                </button>
              ))}
            </div>

            {selectedDocument ? (
              <>
                <div className="grid gap-2 rounded-lg border border-border bg-slate-50 p-3 text-xs leading-5 text-muted-foreground sm:grid-cols-3">
                  <span>Status: {selectedDocument.status}</span>
                  <span>Pages: {selectedDocument.pageCount ?? "manual"}</span>
                  <span>Stored locally: {new Date(selectedDocument.createdAt).toLocaleString()}</span>
                </div>
                <Textarea className="min-h-[360px] font-mono text-xs" value={jsonDraft} onChange={(event) => setJsonDraft(event.target.value)} />
                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleSaveJson}>
                    <Save className="h-4 w-4" />
                    Save reviewed JSON
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setBusy(true);
                      const extraction = await extractProfileFromDocumentText(selectedDocument.text, settings);
                      setJsonDraft(JSON.stringify(extraction.profile, null, 2));
                      setMessage(extraction.warning ?? "Extraction refreshed.");
                      setBusy(false);
                    }}
                    disabled={busy}
                  >
                    <Wand2 className="h-4 w-4" />
                    Re-extract
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Upload a PDF to review extracted profile data.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
