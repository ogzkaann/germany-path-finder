import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const sampleVaultDir = path.join(rootDir, "public", "sample-user-vault");
const manifestPath = path.join(sampleVaultDir, "manifest.json");
const supportedExtensions = new Set([".pdf", ".txt", ".md"]);
const categories = ["education", "work", "language", "insurance", "residence"];

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
  await fs.mkdir(sampleVaultDir, { recursive: true });
  await Promise.all(categories.map((category) => fs.mkdir(path.join(sampleVaultDir, category), { recursive: true })));
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
  const relativeToVault = path.relative(sampleVaultDir, filePath);
  const [category] = relativeToVault.split(path.sep);
  return categories.includes(category) ? category : "education";
}

await ensureStructure();

const files = (await walk(sampleVaultDir))
  .filter((filePath) => path.basename(filePath) !== "manifest.json")
  .sort((a, b) => a.localeCompare(b, "de"));

const sources = files.map((filePath) => {
  const category = inferCategory(filePath);
  const fileName = path.basename(filePath);
  const relativePublicPath = path.relative(path.join(rootDir, "public"), filePath);

  return {
    id: slugify(`sample-${category}-${path.relative(sampleVaultDir, filePath).replace(path.extname(filePath), "")}`),
    title: titleFromFileName(fileName),
    category,
    filePath: browserPath(relativePublicPath),
    fileName,
    date_checked: today(),
    documentType: path.extname(fileName).slice(1).toLowerCase(),
    tags: ["sample-user-vault", category],
    language: "de",
    status: "available",
    source_type: "sample_user_document",
    official: false,
    official_non_official: "non_official",
    user_scope: "demo_private",
  };
});

const manifest = {
  version: "1.0.0",
  generatedAt: new Date().toISOString(),
  lastUpdated: today(),
  sourceRoot: "/sample-user-vault",
  sources,
};

await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Generated ${path.relative(rootDir, manifestPath)} with ${sources.length} sample user document(s).`);
