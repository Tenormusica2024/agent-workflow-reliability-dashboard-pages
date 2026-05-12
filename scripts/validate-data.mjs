import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/(.:\/)/, "$1"));
const data = JSON.parse(fs.readFileSync(path.join(root, "sample-runs.json"), "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function nonEmptyString(value, pathName) {
  assert(typeof value === "string" && value.trim().length > 0, `${pathName}: non-empty string required`);
}

assert(data.schemaVersion === "0.3.0", "schemaVersion must be 0.3.0");
assert(data.portfolioSafe === true, "portfolioSafe must be true");
assert(Array.isArray(data.workflows) && data.workflows.length >= 2, "workflows must have >= 2 items");
assert(data.workflows.some((workflow) => workflow.id === data.defaultWorkflowId), "defaultWorkflowId must match a workflow");

const ids = new Set();
for (const workflow of data.workflows) {
  nonEmptyString(workflow.id, "workflow.id");
  assert(!ids.has(workflow.id), `duplicate workflow id: ${workflow.id}`);
  ids.add(workflow.id);
  for (const key of ["name", "environment", "viewState", "window"]) nonEmptyString(workflow[key], `${workflow.id}.${key}`);
  assert(typeof workflow.rcaConfidence === "number", `${workflow.id}.rcaConfidence required`);
  assert(workflow.incident && typeof workflow.incident === "object", `${workflow.id}.incident required`);
  nonEmptyString(workflow.incident.title, `${workflow.id}.incident.title`);
  assert(Array.isArray(workflow.traceTree) && workflow.traceTree.length >= 5, `${workflow.id}.traceTree required`);
  assert(workflow.waterfall && Array.isArray(workflow.waterfall.spans) && workflow.waterfall.spans.length >= 5, `${workflow.id}.waterfall required`);
  assert(Array.isArray(workflow.hypotheses) && workflow.hypotheses.length >= 3, `${workflow.id}.hypotheses required`);
  assert(workflow.payload && Array.isArray(workflow.payload.code), `${workflow.id}.payload required`);
  assert(Array.isArray(workflow.evaluations) && workflow.evaluations.length >= 5, `${workflow.id}.evaluations required`);
  assert(Array.isArray(workflow.logs) && workflow.logs.length >= 4, `${workflow.id}.logs required`);
}

const serialized = JSON.stringify(data);
for (const term of ["crm" + ".internal", "payments" + ".internal", "billing" + ".internal", "policy" + ".internal"]) {
  assert(!serialized.includes(term), `internal-looking term remained: ${term}`);
}

console.log(`OK: ${data.workflows.length} public workflows validated`);

