import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const inputDir = path.resolve(root, args.inputDir ?? args["input-dir"] ?? "data/incoming");
const outputPath = path.resolve(root, args.output ?? "tmp/merged-agent-runs.json");

const files = fs.readdirSync(inputDir)
  .filter((file) => file.endsWith(".json"))
  .sort((a, b) => a.localeCompare(b));

if (files.length === 0) {
  throw new Error(`No .json files found in ${path.relative(root, inputDir)}`);
}

const workflows = [];
const seenIds = new Set();
for (const file of files) {
  const fullPath = path.join(inputDir, file);
  const item = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  const workflow = normalizeIncoming(item, file);
  if (seenIds.has(workflow.id)) {
    throw new Error(`Duplicate workflow id from incoming files: ${workflow.id}`);
  }
  seenIds.add(workflow.id);
  workflows.push(workflow);
}

const merged = {
  schemaVersion: "agent-runs.v0.1",
  generatedAt: new Date().toISOString(),
  source: {
    type: "file-drop",
    inputDir: path.relative(root, inputDir).replaceAll(path.sep, "/"),
    files,
  },
  defaultWorkflowId: workflows[0].id,
  workflows,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
console.log(`OK: merged ${files.length} incoming run file(s) into ${path.relative(root, outputPath)}`);

function normalizeIncoming(item, file) {
  if (item.schemaVersion === "agent-run.v0.1") {
    if (!item.workflow || typeof item.workflow !== "object") throw new Error(`${file}: workflow object required`);
    return item.workflow;
  }
  if (item.schemaVersion === "agent-runs.v0.1") {
    if (!Array.isArray(item.workflows) || item.workflows.length !== 1) {
      throw new Error(`${file}: agent-runs.v0.1 incoming files must contain exactly one workflow`);
    }
    return item.workflows[0];
  }
  throw new Error(`${file}: unsupported schemaVersion ${item.schemaVersion ?? "<missing>"}`);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    out[key] = value;
  }
  return out;
}
