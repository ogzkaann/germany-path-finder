import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const publicKnowledgeDir = path.join(rootDir, "public", "knowledge");
const manifestPath = path.join(publicKnowledgeDir, "manifest.json");
const supportedExtensions = new Set([".pdf", ".txt", ".md"]);
const categories = [
  "official-law",
  "official-portals",
  "local-duesseldorf",
  "recognition",
  "language-integration",
];

const categoryDefaults = {
  "official-law": { label: "Official Law", jurisdiction: "Germany", region: "Germany" },
  "official-portals": { label: "Official Portals", jurisdiction: "Germany", region: "Germany" },
  "local-duesseldorf": { label: "Local Düsseldorf / NRW", jurisdiction: "Düsseldorf / NRW", region: "Düsseldorf / NRW" },
  recognition: { label: "Recognition", jurisdiction: "Germany", region: "Germany" },
  "language-integration": { label: "Language & Integration", jurisdiction: "Germany", region: "Germany" },
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function titleFromFileName(fileName) {
  return path.basename(fileName, path.extname(fileName)).replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

function slugify(value) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (slug) return slug;
  return Buffer.from(value).toString("hex").slice(0, 20);
}

function browserPath(relativePath) {
  return `/${relativePath.split(path.sep).map(encodeURIComponent).join("/")}`;
}

async function ensureStructure() {
  await fs.mkdir(publicKnowledgeDir, { recursive: true });
  await Promise.all(categories.map((category) => fs.mkdir(path.join(publicKnowledgeDir, category), { recursive: true })));
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonIfExists(filePath) {
  if (!(await pathExists(filePath))) return {};
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (supportedExtensions.has(ext)) {
      files.push(fullPath);
    }
  }

  return files;
}

function inferCategory(filePath) {
  const relativeToKnowledge = path.relative(publicKnowledgeDir, filePath);
  const [category] = relativeToKnowledge.split(path.sep);
  return categories.includes(category) ? category : "official-law";
}

function tagsFor(category, title, sidecarTags) {
  const base = [category, categoryDefaults[category].label.toLowerCase()];
  const titleTerms = title
    .toLowerCase()
    .split(/[^a-z0-9äöüß]+/i)
    .filter((term) => term.length > 2)
    .slice(0, 6);
  return Array.from(new Set([...(Array.isArray(sidecarTags) ? sidecarTags : []), ...base, ...titleTerms]));
}

async function sourceForFile(filePath, seenIds) {
  const category = inferCategory(filePath);
  const defaults = categoryDefaults[category];
  const fileName = path.basename(filePath);
  const fileTitle = titleFromFileName(fileName);
  const sidecarPath = path.join(path.dirname(filePath), `${path.basename(fileName, path.extname(fileName))}.json`);
  const sidecar = await readJsonIfExists(sidecarPath);
  const dateChecked = sidecar.date_checked || sidecar.lastChecked || today();
  const relativePublicPath = path.relative(path.join(rootDir, "public"), filePath);
  const relativeCategoryPath = path.relative(path.join(publicKnowledgeDir, category), filePath);
  const baseId = slugify(`${category}-${relativeCategoryPath.replace(path.extname(filePath), "")}`);
  let id = sidecar.id || baseId;
  let suffix = 2;

  while (seenIds.has(id)) {
    id = `${sidecar.id || baseId}-${suffix}`;
    suffix += 1;
  }
  seenIds.add(id);

  return {
    id,
    title: sidecar.title || fileTitle,
    authority: sidecar.authority || "Project owner curated official source",
    region: sidecar.region || defaults.region,
    category,
    jurisdiction: sidecar.jurisdiction || defaults.jurisdiction,
    filePath: browserPath(relativePublicPath),
    fileName,
    sourceUrl: sidecar.sourceUrl || "",
    lastChecked: dateChecked,
    date_checked: dateChecked,
    documentType: sidecar.documentType || path.extname(fileName).slice(1).toLowerCase(),
    tags: tagsFor(category, sidecar.title || fileTitle, sidecar.tags),
    language: sidecar.language || "de",
    status: "available",
    source_type: "official_knowledge",
    official: true,
    official_non_official: "official",
    user_scope: "public",
  };
}

await ensureStructure();

const files = (await walk(publicKnowledgeDir))
  .filter((filePath) => path.basename(filePath) !== "manifest.json")
  .sort((a, b) => a.localeCompare(b, "de"));
const seenIds = new Set();
const sources = [];

for (const filePath of files) {
  sources.push(await sourceForFile(filePath, seenIds));
}

const manifest = {
  version: "1.0.0",
  lastUpdated: today(),
  sourceRoot: "/knowledge",
  sources,
};

await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Generated ${path.relative(rootDir, manifestPath)} with ${sources.length} official source(s).`);
