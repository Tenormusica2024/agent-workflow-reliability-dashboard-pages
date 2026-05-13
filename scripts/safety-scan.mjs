import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const targets = args.length > 0 ? args : ["sample-runs.json"];

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
for (const target of targets) {
  const fullPath = path.resolve(root, target);
  if (!fs.existsSync(fullPath)) {
    failures.push(`${target}: missing`);
    continue;
  }
  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    for (const file of walk(fullPath)) scanFile(file);
  } else {
    scanFile(fullPath);
  }
}

if (failures.length > 0) {
  console.error(failures.map((line) => `FAIL: ${line}`).join("\n"));
  process.exit(1);
}

console.log(`OK: safety scan passed for ${targets.join(", ")}`);

function scanFile(filePath) {
  const rel = path.relative(root, filePath).replaceAll(path.sep, "/");
  if (shouldSkip(rel)) return;
  const text = fs.readFileSync(filePath, "utf8");
  const normalized = text.toLowerCase();
  for (const term of bannedTerms) {
    if (normalized.includes(term.toLowerCase())) failures.push(`${rel}: banned term detected: ${safeLabel(term)}`);
  }
  for (const { name, pattern } of bannedPatterns) {
    if (pattern.test(text)) failures.push(`${rel}: banned pattern detected: ${name}`);
  }
}

function shouldSkip(rel) {
  return rel.startsWith(".git/") || rel.startsWith("node_modules/") || rel.startsWith("assets/") || rel.startsWith("tmp/");
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
