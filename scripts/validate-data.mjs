import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/(.:\/)/, "$1"));
const dataPath = path.join(root, "sample-runs.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(data.schemaVersion, "schemaVersion required");
assert(data.portfolioSafe === true, "portfolioSafe must be true");
assert(Array.isArray(data.workflows) && data.workflows.length >= 3, "at least 3 workflows required");
assert(Array.isArray(data.failureTaxonomy) && data.failureTaxonomy.length >= 3, "failure taxonomy required");
assert(Array.isArray(data.interviewPrompts) && data.interviewPrompts.length >= 3, "interview prompts required");

const ids = new Set();
for (const run of data.workflows) {
  assert(run.id && !ids.has(run.id), `unique id required: ${run.id}`);
  ids.add(run.id);
  assert(run.workflowName, `${run.id}: workflowName required`);
  assert(["success", "warning", "failed"].includes(run.status), `${run.id}: invalid status`);
  assert(run.goal && run.summary, `${run.id}: goal and summary required`);
  assert(Array.isArray(run.plan) && run.plan.length >= 3, `${run.id}: plan must have >=3 steps`);
  assert(Array.isArray(run.toolCalls), `${run.id}: toolCalls must be array`);
  assert(run.metrics && typeof run.metrics.evalScore === "number", `${run.id}: evalScore required`);
  assert(run.metrics.evalScore >= 0 && run.metrics.evalScore <= 1, `${run.id}: evalScore must be 0..1`);
  assert(run.evaluation?.criteria?.length >= 2, `${run.id}: evaluation criteria required`);
  assert(run.hitl?.status, `${run.id}: HITL status required`);
  assert(run.failure?.category, `${run.id}: failure category required`);
  assert(run.rollback?.condition && run.rollback?.command, `${run.id}: rollback required`);
  assert(Array.isArray(run.interviewNotes) && run.interviewNotes.length >= 1, `${run.id}: interview notes required`);
}

console.log(`OK: ${data.workflows.length} workflows, ${data.failureTaxonomy.length} failure categories, ${data.interviewPrompts.length} prompts`);
