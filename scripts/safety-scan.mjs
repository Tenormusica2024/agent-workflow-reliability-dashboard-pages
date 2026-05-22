import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const parsedArgs = parseArgs(process.argv.slice(2));
const targets = parsedArgs.targets.length > 0 ? parsedArgs.targets : ["sample-runs.json"];

const bannedTerms = [
  "client" + " name",
  "employer" + " private",
  "salary" + " band",
  "年" + "収",
  "credential",
  "pass" + "word",
  "secret_access_key",
  "private_screenshots",
  "github" + "-remote" + "-desktop",
  "docs" + "/research",
  "crm" + ".internal",
  "payments" + ".internal",
  "billing" + ".internal",
  "policy" + ".internal",
];

const bannedPatterns = [
  { name: "internal hostname", pattern: /\b[a-z0-9.-]+\.internal\b/i },
  { name: "bearer token value", pattern: /bearer\s+(?!\*{4,}|demo-token)[a-z0-9._~+/=-]{8,}/i },
  { name: "openai-style secret", pattern: /\bsk-[a-z0-9]{20,}\b/i },
  { name: "aws access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "email address", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
];

const failures = [];
const scannedTargets = [];
const skippedOptionalTargets = [];
for (const target of targets) {
  const fullPath = path.resolve(root, target);
  const targetRel = path.relative(root, fullPath).replaceAll(path.sep, "/");
  if (!fs.existsSync(fullPath)) {
    if (parsedArgs.optionalTargets.has(targetRel)) {
      skippedOptionalTargets.push(target);
      continue;
    }
    failures.push(`${target}: missing`);
    continue;
  }
  scannedTargets.push(target);
  const stat = fs.statSync(fullPath);
  const allowedSkippedRoot = isSkippedRoot(targetRel) ? targetRel : null;
  if (stat.isDirectory()) {
    for (const file of walk(fullPath)) scanFile(file, { allowedSkippedRoot });
  } else {
    scanFile(fullPath, { explicitFile: true });
  }
}

if (failures.length > 0) {
  console.error(failures.map((line) => `FAIL: ${line}`).join("\n"));
  process.exit(1);
}

console.log(`OK: safety scan passed for ${scannedTargets.join(", ")}`);
if (skippedOptionalTargets.length > 0) {
  console.log(`INFO: skipped missing optional target(s): ${skippedOptionalTargets.join(", ")}`);
}

function scanFile(filePath, { explicitFile = false, allowedSkippedRoot = null } = {}) {
  const rel = path.relative(root, filePath).replaceAll(path.sep, "/");
  if (!explicitFile && shouldSkip(rel, allowedSkippedRoot)) return;
  const text = fs.readFileSync(filePath, "utf8");
  const normalized = text.toLowerCase();
  for (const term of bannedTerms) {
    if (normalized.includes(term.toLowerCase())) failures.push(`${rel}: banned term detected: ${safeLabel(term)}`);
  }
  for (const { name, pattern } of bannedPatterns) {
    if (pattern.test(text)) failures.push(`${rel}: banned pattern detected: ${name}`);
  }
}

function shouldSkip(rel, allowedSkippedRoot = null) {
  if (allowedSkippedRoot && (rel === allowedSkippedRoot || rel.startsWith(`${allowedSkippedRoot}/`))) {
    return rel.split("/").some((part) => part === ".git" || part === "node_modules" || part === "assets");
  }
  return rel.startsWith(".git/") || rel.startsWith("node_modules/") || rel.startsWith("assets/") || rel.startsWith("tmp/");
}

function isSkippedRoot(rel) {
  return rel === ".git" || rel === "node_modules" || rel === "assets" || rel === "tmp" || shouldSkip(rel);
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

function safeLabel(term) {
  return term.replace(/[A-Za-z0-9]/g, "*");
}

function parseArgs(argv) {
  const out = { targets: [], optionalTargets: new Set() };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--optional-target") {
      const target = argv[++i];
      if (!target) throw new Error("--optional-target requires a path");
      out.targets.push(target);
      out.optionalTargets.add(toRelativeTarget(target));
      continue;
    }
    out.targets.push(arg);
  }
  return out;
}

function toRelativeTarget(target) {
  return path.relative(root, path.resolve(root, target)).replaceAll(path.sep, "/");
}
