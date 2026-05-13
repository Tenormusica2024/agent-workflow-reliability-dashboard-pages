import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const inputPath = path.resolve(root, args.input ?? "tmp/generated-sample-runs.json");
const targetPath = path.resolve(root, args.target ?? "sample-runs.json");
const backupDir = path.resolve(root, args.backupDir ?? args["backup-dir"] ?? "tmp/backups");
const skipBackup = args.backup === "false" || args["no-backup"] === true;

assertFile(inputPath, "input");

run("node", ["scripts/validate-data.mjs", path.relative(root, inputPath)]);
run("node", ["scripts/safety-scan.mjs", path.relative(root, inputPath)]);

const current = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8") : null;
const next = fs.readFileSync(inputPath, "utf8");
if (current === next) {
  console.log(`OK: ${path.relative(root, targetPath)} already matches ${path.relative(root, inputPath)}`);
  process.exit(0);
}

if (!skipBackup && current != null) {
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
  const backupPath = path.join(backupDir, `sample-runs.${stamp}.json`);
  fs.writeFileSync(backupPath, current, "utf8");
  console.log(`OK: backup written ${path.relative(root, backupPath)}`);
}

fs.writeFileSync(targetPath, next, "utf8");
run("node", ["scripts/validate-data.mjs", path.relative(root, targetPath)]);
run("node", ["scripts/safety-scan.mjs", path.relative(root, targetPath)]);
console.log(`OK: promoted ${path.relative(root, inputPath)} -> ${path.relative(root, targetPath)}`);

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

function assertFile(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} file missing: ${path.relative(root, filePath)}`);
  if (!fs.statSync(filePath).isFile()) throw new Error(`${label} is not a file: ${path.relative(root, filePath)}`);
}

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    throw new Error(`${command} ${commandArgs.join(" ")} failed with status ${result.status}`);
  }
}
