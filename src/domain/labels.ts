import type { DocumentKind, Goal, PathName, RiskLevel } from "./types";

export const goalLabels: Record<Goal, string> = {
  ausbildung: "Ausbildung",
  master: "Master / Studium",
  "skilled-job": "Skilled job",
  "blue-card": "EU Blue Card",
  chancenkarte: "Chancenkarte",
  "study-applicant": "Study applicant",
};

export const documentKindLabels: Record<DocumentKind, string> = {
  cv: "CV",
  diploma: "Diploma",
  transcript: "Transcript",
  "language-certificate": "Language certificate",
  "employment-contract": "Employment contract",
  official: "Official source",
  other: "Other",
};

export const riskLabels: Record<RiskLevel, string> = {
  green: "Green fit",
  yellow: "Yellow fit",
  red: "Red fit",
};

export const pathDescriptions: Record<PathName, string> = {
  Ausbildung: "Training route with source-backed document and language review.",
  "Master / Studium": "Academic route requiring separation of admission and residence evidence.",
  Studienbewerber: "Study applicant route for incomplete admission scenarios.",
  "Skilled job": "Employment route with contract, qualification and authority checks.",
  "EU Blue Card": "Employment route needing official criteria and document verification.",
  Chancenkarte: "Opportunity card continuation or transition review.",
};
