import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/(.:\/)/, "$1"));
const runtimeDir = path.join(root, "runtime-flow");
const dataPath = path.join(runtimeDir, "sample-runs.json");
const htmlPath = path.join(runtimeDir, "index.html");
const appPath = path.join(runtimeDir, "app.js");
const cssPath = path.join(runtimeDir, "styles.css");

function assert(condition, message) {
  if (!condition) throw new Error(`runtime-flow smoke: ${message}`);
}

function readRequired(filePath) {
  assert(fs.existsSync(filePath), `${path.relative(root, filePath)} missing`);
  const text = fs.readFileSync(filePath, "utf8");
  assert(text.trim().length > 0, `${path.relative(root, filePath)} empty`);
  return text;
}

function assertIncludes(haystack, needle, label) {
  assert(haystack.includes(needle), `${label} missing: ${needle}`);
}

function nonEmptyString(value, label) {
  assert(typeof value === "string" && value.trim().length > 0, `${label} must be a non-empty string`);
}

const html = readRequired(htmlPath);
const app = readRequired(appPath);
const css = readRequired(cssPath);
const data = JSON.parse(readRequired(dataPath));

assertIncludes(html, '<div id="app"', "runtime-flow/index.html");
assertIncludes(html, 'href="styles.css"', "runtime-flow/index.html");
assertIncludes(html, 'src="app.js"', "runtime-flow/index.html");

for (const needle of [
  'const DEFAULT_DATA_URL = "sample-runs.json"',
  "function dataUrlFromLocation()",
  'params.get("workflow") || params.get("profile")',
  "workflowSelect",
  "data-workflow-id",
  "scheduler-switcher",
  "program-card",
  "scheduler-bridge",
  "scheduler-rail",
  "workflowOnlyNotice",
]) {
  assertIncludes(app, needle, "runtime-flow/app.js");
}

for (const needle of [
  ".scheduler-switcher",
  ".program-card",
  ".switcher-count",
  ".scheduler-bridge",
  ".flow-map",
  ".runtime-card",
  ".scheduler-rail",
]) {
  assertIncludes(css, needle, "runtime-flow/styles.css");
}

assert(data.schemaVersion === "0.3.0", "sample-runs schemaVersion must be 0.3.0");
assert(data.portfolioSafe === true, "sample-runs must be marked portfolioSafe");
assert(Array.isArray(data.workflows), "sample-runs workflows must be an array");
assert(data.workflows.length >= 5, "sample-runs must keep at least 5 public demo workflows");
assert(data.workflows.some((workflow) => workflow.id === data.defaultWorkflowId), "defaultWorkflowId must point to a workflow");

const publicSafeSegment = /^[a-z0-9][a-z0-9_-]{0,79}$/;
const workflowIds = new Set();
const profileIds = new Set();
const taskNames = new Set();
const requiredSchedulerKeys = [
  "profileId",
  "taskName",
  "trigger",
  "cadence",
  "sourceType",
  "inputMode",
  "adapter",
  "outputTarget",
  "historyStore",
  "lastRunAt",
  "nextRunAt",
  "switchHint",
];

for (const [index, workflow] of data.workflows.entries()) {
  const prefix = `workflows[${index}]`;
  nonEmptyString(workflow.id, `${prefix}.id`);
  assert(!workflowIds.has(workflow.id), `duplicate workflow id: ${workflow.id}`);
  workflowIds.add(workflow.id);
  nonEmptyString(workflow.name, `${prefix}.name`);
  nonEmptyString(workflow.environment, `${workflow.id}.environment`);

  const scheduler = workflow.scheduler;
  assert(scheduler && typeof scheduler === "object" && !Array.isArray(scheduler), `${workflow.id}.scheduler is required for runtime-flow public demo`);
  for (const key of requiredSchedulerKeys) {
    nonEmptyString(scheduler[key], `${workflow.id}.scheduler.${key}`);
  }

  assert(publicSafeSegment.test(scheduler.profileId), `${workflow.id}.scheduler.profileId must be public-safe path segment`);
  assert(publicSafeSegment.test(scheduler.taskName), `${workflow.id}.scheduler.taskName must be public-safe path segment`);
  assert(scheduler.taskName.startsWith("public-"), `${workflow.id}.scheduler.taskName must use public- prefix in public sample data`);
  assert(!profileIds.has(scheduler.profileId), `duplicate scheduler profileId: ${scheduler.profileId}`);
  assert(!taskNames.has(scheduler.taskName), `duplicate scheduler taskName: ${scheduler.taskName}`);
  profileIds.add(scheduler.profileId);
  taskNames.add(scheduler.taskName);

  assert(scheduler.trigger.includes("Scheduled Demo"), `${workflow.id}.scheduler.trigger should remain public demo wording`);
  assert(scheduler.inputMode.toLowerCase().includes("synthetic"), `${workflow.id}.scheduler.inputMode should make synthetic public data explicit`);
  assert(scheduler.outputTarget.toLowerCase().includes("public"), `${workflow.id}.scheduler.outputTarget should make public demo target explicit`);
}

const serializedData = JSON.stringify(data).toLowerCase();
const bannedPublicDataTerms = [
  "c:\\",
  "c:/",
  "\\users\\",
  "/users/",
  "tenormusica",
  "dbj",
  "localhost",
  "127.0.0.1",
  "windows task scheduler",
  "\\tenormusica\\",
  "新規パネル",
  "既存パネル",
  "human approval",
  "hitl",
  "人間確認",
  "承認待ち",
];

for (const term of bannedPublicDataTerms) {
  assert(!serializedData.includes(term.toLowerCase()), `public runtime-flow data must not include: ${term}`);
}

console.log(`OK: runtime-flow public demo smoke passed (${data.workflows.length} workflows, ${profileIds.size} scheduler profiles)`);
