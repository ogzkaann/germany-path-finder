export type Goal =
  | "ausbildung"
  | "master"
  | "skilled-job"
  | "blue-card"
  | "chancenkarte"
  | "study-applicant";

export type RiskLevel = "green" | "yellow" | "red";

export type DocumentKind =
  | "cv"
  | "diploma"
  | "transcript"
  | "language-certificate"
  | "employment-contract"
  | "official"
  | "other";

export interface Profile {
  id: "local-profile";
  currentStatus: string;
  city: string;
  state: string;
  germanLevel: string;
  educationBackground: string;
  workExperience: string;
  goal: Goal;
  extracted?: ExtractedProfile;
  updatedAt: string;
}

export interface ExtractedProfile {
  name?: string;
  degree?: string;
  fieldOfStudy?: string;
  university?: string;
  gpa?: string;
  ects?: string;
  courses?: string[];
  workExperience?: string[];
  germanLevel?: string;
  englishLevel?: string;
}

export interface KnowledgeSource {
  id: string;
  title: string;
  authority: string;
  region: string;
  category: KnowledgeCategory;
  jurisdiction: string;
  filePath: string;
  fileName: string;
  sourceUrl: string;
  lastChecked: string;
  date_checked: string;
  documentType: string;
  tags: string[];
  language: string;
  status: "available" | "missing" | "placeholder";
  source_type: "official_knowledge";
  official: boolean;
  official_non_official: "official" | "non_official";
  user_scope: "public" | "private_user" | "demo_private";
  children?: KnowledgeSource[];
}

export interface KnowledgeManifest {
  version: string;
  lastUpdated: string;
  sources: KnowledgeSource[];
}

export type KnowledgeCategory =
  | "official-law"
  | "official-portals"
  | "local-duesseldorf"
  | "recognition"
  | "language-integration";

export interface SourceChunk {
  id: string;
  sourceId: string;
  documentId?: string;
  kind: "official" | "user";
  title: string;
  authority?: string;
  region?: string;
  fileName: string;
  sourceUrl?: string;
  pageNumber?: number;
  chunkIndex: number;
  text: string;
  tags: string[];
  createdAt: string;
  metadata: DocumentMetadata;
}

export interface DocumentMetadata {
  source_id?: string;
  source_title?: string;
  source_type: string;
  category: string;
  jurisdiction: string;
  date_checked: string;
  official: boolean;
  official_non_official: "official" | "non_official";
  user_scope: "public" | "private_user" | "demo_private";
  filePath?: string;
  pageNumber?: number;
  chunkIndex?: number;
}

export interface RetrievedChunk extends SourceChunk {
  score: number;
  matchedTerms: string[];
}

export interface StoredDocument {
  id: string;
  kind: DocumentKind;
  fileName: string;
  text: string;
  metadata: DocumentMetadata;
  pageCount?: number;
  extractedProfile?: ExtractedProfile;
  createdAt: string;
  status: "parsed" | "failed" | "manual";
  error?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  sourceRuleId?: string;
}

export interface ProgressState {
  id: "local-progress";
  selectedPath?: PathName;
  checklist: ChecklistItem[];
  notes: string;
  updatedAt: string;
}

export type PathName =
  | "Ausbildung"
  | "Master / Studium"
  | "Studienbewerber"
  | "Skilled job"
  | "EU Blue Card"
  | "Chancenkarte";

export interface PathRule {
  id: string;
  path: PathName;
  condition: string;
  result: RiskLevel;
  explanation: string;
  requiredSources: string[];
  requiredDocuments: DocumentKind[];
  blockers: string[];
  nextActions: string[];
  evaluate: (context: RuleContext) => boolean;
}

export interface RuleContext {
  profile?: Profile;
  documents: StoredDocument[];
  indexedSourceIds: string[];
}

export interface PathEvaluation {
  path: PathName;
  fit: RiskLevel;
  why: string[];
  blockers: string[];
  missingDocuments: DocumentKind[];
  nextActions: string[];
  sourceIds: string[];
  matchedRuleIds: string[];
  confidence: "low" | "medium" | "high";
  needsOfficialVerification: boolean;
}

export interface AppSettings {
  providerId: "custom" | "gemini" | "openai" | "anthropic";
  providerName: string;
  endpoint: string;
  apiKey: string;
  model: string;
}

export interface RagAnswer {
  question: string;
  answer: string;
  citations: RetrievedChunk[];
  warning?: string;
  providerError?: string;
  status: "answered" | "not-found" | "error";
  statusLabel: string;
  createdAt: string;
}

export interface EvidenceCoverage {
  retrievedSourceCount: number;
  categoriesUsed: string[];
  coveredConcepts: string[];
  missingEvidence: string[];
}

export interface TransitionAnalysis {
  fromStatus: string;
  targetPath: PathName;
  foundSourceTitles: string[];
  missingEvidence: string[];
  conservativeResult: RiskLevel;
  needsOfficialVerification: boolean;
}

export interface RagAnalysisState {
  lastQuestion: string;
  retrievedCitations: RetrievedChunk[];
  detectedIntent: string[];
  relevantPath?: PathName;
  evidenceCoverage: EvidenceCoverage;
  missingEvidence: string[];
  transition?: TransitionAnalysis;
  updatedAt: string;
}
