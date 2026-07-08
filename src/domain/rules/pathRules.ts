import type {
  DocumentKind,
  PathEvaluation,
  PathName,
  PathRule,
  RiskLevel,
  RuleContext,
} from "../types";

const ausbildungSource = "official-law-16a-aufenthg-berufsausbildung";
const studySource = "official-law-16b-aufenthg-studium";
const studyApplicantSource = "official-law-17-aufenthg-ausbildungsplatzsuche-studienplatzsuche";
const chancenkarteSource = "official-law-20a-aufenthg-chancenkarte";
const blueCardSource = "official-law-18g-aufenthg-blaue-karte-eu";
const skilledWorkerSource = "official-portals-make-it-in-germany-work-visa-for-qualified-professionals";
const vocationalPortalSource = "official-portals-make-it-in-germany-visa-for-vocational-training";
const studyingPortalSource = "official-portals-make-it-in-germany-visa-for-studying";
const chancenkartePortalSource = "official-portals-make-it-in-germany-job-search-opportunity-card";

const levelRank: Record<string, number> = {
  none: 0,
  a1: 1,
  a2: 2,
  b1: 3,
  b2: 4,
  c1: 5,
  c2: 6,
};

function germanLevelScore(level?: string) {
  if (!level) return 0;
  return levelRank[level.toLowerCase()] ?? 0;
}

function hasDocument(context: RuleContext, kinds: DocumentKind[]) {
  return context.documents.some((document) => kinds.includes(document.kind));
}

function hasProfileSignal(context: RuleContext, words: string[]) {
  const profile = context.profile;
  if (!profile) return false;
  const haystack = [
    profile.educationBackground,
    profile.workExperience,
    profile.currentStatus,
    profile.extracted?.degree,
    profile.extracted?.fieldOfStudy,
    profile.extracted?.university,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return words.some((word) => haystack.includes(word.toLowerCase()));
}

export const pathRules: PathRule[] = [
  {
    id: "ausbildung-interest-or-open",
    path: "Ausbildung",
    condition: "User goal is Ausbildung or no strong alternative is established.",
    result: "yellow",
    explanation:
      "Ausbildung can be explored, but the MVP requires official source chunks before describing transition conditions.",
    requiredSources: [ausbildungSource, vocationalPortalSource],
    requiredDocuments: ["cv", "language-certificate"],
    blockers: [],
    nextActions: [
      "Index official federal and Düsseldorf source documents.",
      "Collect training contract or school/employer admission evidence before making a decision.",
      "Verify the transition with the responsible Ausländerbehörde.",
    ],
    evaluate: (context) =>
      !context.profile || context.profile.goal === "ausbildung" || context.profile.goal === "chancenkarte",
  },
  {
    id: "ausbildung-language-review",
    path: "Ausbildung",
    condition: "German level is missing or below B1 in the local profile.",
    result: "red",
    explanation:
      "The profile shows a language uncertainty. The app cannot infer language sufficiency without official and program-specific evidence.",
    requiredSources: [ausbildungSource],
    requiredDocuments: ["language-certificate"],
    blockers: ["German language evidence is missing or weak."],
    nextActions: ["Upload a language certificate.", "Check the exact language requirement with the program and authority."],
    evaluate: (context) => germanLevelScore(context.profile?.germanLevel) < 3,
  },
  {
    id: "master-degree-signal",
    path: "Master / Studium",
    condition: "User goal is Master or education profile contains a degree signal.",
    result: "yellow",
    explanation:
      "A study route may be relevant because the profile contains higher-education signals, but admission and residence requirements must come from indexed official sources.",
    requiredSources: [studySource, studyingPortalSource],
    requiredDocuments: ["diploma", "transcript", "language-certificate"],
    blockers: [],
    nextActions: [
      "Upload diploma and transcript.",
      "Index official study and residence sources.",
      "Separate university admission requirements from residence procedure requirements.",
    ],
    evaluate: (context) =>
      context.profile?.goal === "master" || hasProfileSignal(context, ["bachelor", "degree", "university", "ects"]),
  },
  {
    id: "study-applicant-doc-gap",
    path: "Studienbewerber",
    condition: "User goal is study applicant or admission evidence is not yet present.",
    result: "yellow",
    explanation:
      "A study applicant path can only be explained from official source chunks. The MVP marks this as a candidate path when admission evidence is incomplete.",
    requiredSources: [studySource, studyApplicantSource, studyingPortalSource],
    requiredDocuments: ["diploma", "transcript", "language-certificate"],
    blockers: ["Admission or application evidence has not been reviewed in this MVP."],
    nextActions: [
      "Upload university application or admission-related documents if available.",
      "Index official sources for study applicant procedures.",
      "Verify required documents with the university and local authority.",
    ],
    evaluate: (context) => context.profile?.goal === "study-applicant" || !hasDocument(context, ["diploma", "transcript"]),
  },
  {
    id: "skilled-job-work-signal",
    path: "Skilled job",
    condition: "User goal is skilled job or work experience / employment document is present.",
    result: "yellow",
    explanation:
      "Employment-based paths need source-backed checks for qualification recognition, contract details, and local procedure. This MVP does not claim eligibility.",
    requiredSources: [skilledWorkerSource],
    requiredDocuments: ["cv", "diploma", "employment-contract"],
    blockers: [],
    nextActions: [
      "Upload employment contract if available.",
      "Upload diploma or recognition-related documents.",
      "Verify recognition and document requirements with official sources.",
    ],
    evaluate: (context) =>
      context.profile?.goal === "skilled-job" || hasDocument(context, ["employment-contract"]) || Boolean(context.profile?.workExperience),
  },
  {
    id: "blue-card-contract-and-degree",
    path: "EU Blue Card",
    condition: "User goal is Blue Card or both degree and employment-contract evidence appear in local records.",
    result: "yellow",
    explanation:
      "EU Blue Card review needs official source evidence for current legal criteria. This MVP only flags whether the user's document set looks ready for a sourced check.",
    requiredSources: [blueCardSource],
    requiredDocuments: ["diploma", "employment-contract"],
    blockers: ["Exact legal thresholds and recognition checks are not encoded without official source chunks."],
    nextActions: [
      "Upload contract and degree evidence.",
      "Index official federal Blue Card sources.",
      "Confirm salary, recognition, and profession-specific requirements from official sources.",
    ],
    evaluate: (context) =>
      context.profile?.goal === "blue-card" || (hasDocument(context, ["diploma"]) && hasDocument(context, ["employment-contract"])),
  },
  {
    id: "blue-card-missing-core-docs",
    path: "EU Blue Card",
    condition: "Blue Card is selected but degree or employment contract is missing.",
    result: "red",
    explanation:
      "The local document set is not sufficient for even a source-backed Blue Card review in this MVP.",
    requiredSources: [blueCardSource],
    requiredDocuments: ["diploma", "employment-contract"],
    blockers: ["Degree evidence or employment contract is missing."],
    nextActions: ["Upload the missing core documents.", "Do not treat this as an eligibility result."],
    evaluate: (context) =>
      context.profile?.goal === "blue-card" &&
      (!hasDocument(context, ["diploma"]) || !hasDocument(context, ["employment-contract"])),
  },
  {
    id: "chancenkarte-transition-review",
    path: "Chancenkarte",
    condition: "Current status or selected goal references Chancenkarte.",
    result: "yellow",
    explanation:
      "Chancenkarte continuation or change scenarios must be sourced from official documents. The MVP treats this as an official-verification-first path.",
    requiredSources: [chancenkarteSource, chancenkartePortalSource],
    requiredDocuments: ["cv", "diploma", "language-certificate"],
    blockers: ["Transition rules are not available until official source chunks are indexed."],
    nextActions: [
      "Index official Chancenkarte and local authority sources.",
      "Ask a source-backed question about the exact transition scenario.",
      "Verify the result with the authority before acting.",
    ],
    evaluate: (context) =>
      context.profile?.goal === "chancenkarte" ||
      context.profile?.currentStatus.toLowerCase().includes("chancenkarte") === true,
  },
];

const pathOrder: PathName[] = [
  "Ausbildung",
  "Master / Studium",
  "Studienbewerber",
  "Skilled job",
  "EU Blue Card",
  "Chancenkarte",
];

const severity: Record<RiskLevel, number> = {
  green: 1,
  yellow: 2,
  red: 3,
};

function worstRisk(levels: RiskLevel[]): RiskLevel {
  return levels.reduce<RiskLevel>((current, next) => (severity[next] > severity[current] ? next : current), "green");
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

export function evaluatePathRules(context: RuleContext): PathEvaluation[] {
  return pathOrder.map((path) => {
    const matchedRules = pathRules.filter((rule) => rule.path === path && rule.evaluate(context));
    const rules =
      matchedRules.length > 0
        ? matchedRules
        : [
            {
              id: `${path.toLowerCase().replace(/\s+/g, "-")}-insufficient-profile`,
              path,
              condition: "No local profile or document signal currently supports this path.",
              result: "red" as RiskLevel,
              explanation:
                "The app does not have enough local profile evidence to present this path beyond a generic placeholder.",
              requiredSources: [ausbildungSource],
              requiredDocuments: ["cv" as DocumentKind],
              blockers: ["Profile data is incomplete for this path."],
              nextActions: ["Complete the profile builder.", "Upload relevant documents.", "Index official sources."],
              evaluate: () => true,
            },
          ];

    const sourceIds = unique(rules.flatMap((rule) => rule.requiredSources));
    const missingSources = sourceIds.filter((sourceId) => !context.indexedSourceIds.includes(sourceId));
    const missingDocuments = unique(
      rules
        .flatMap((rule) => rule.requiredDocuments)
        .filter((kind) => !hasDocument(context, [kind])),
    );
    const needsOfficialVerification = missingSources.length > 0 || rules.some((rule) => rule.result !== "green");

    return {
      path,
      fit: worstRisk(rules.map((rule) => rule.result)),
      why: unique(rules.map((rule) => rule.explanation)),
      blockers: unique([...rules.flatMap((rule) => rule.blockers), ...missingSources.map((id) => `Source not indexed: ${id}`)]),
      missingDocuments,
      nextActions: unique(rules.flatMap((rule) => rule.nextActions)),
      sourceIds,
      matchedRuleIds: rules.map((rule) => rule.id),
      confidence: missingSources.length === 0 && missingDocuments.length === 0 ? "medium" : "low",
      needsOfficialVerification,
    };
  });
}
