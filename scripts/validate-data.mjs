import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/(.:\/)/, "$1"));
const dataPath = process.argv[2] ? path.resolve(root, process.argv[2]) : path.join(root, "sample-runs.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(`${path.relative(root, dataPath)}: ${message}`);
}

function nonEmptyString(value, pathName) {
  assert(typeof value === "string" && value.trim().length > 0, `${pathName}: non-empty string required`);
}

function numberLike(value, pathName) {
  assert(typeof value === "number" || typeof value === "string", `${pathName}: number or string required`);
}

assert(data.schemaVersion === "0.3.0", "schemaVersion must be 0.3.0");
assert(data.portfolioSafe === true, "portfolioSafe must be true");
assert(Array.isArray(data.navigation) && data.navigation.length >= 6, "navigation must have >= 6 items");
assert(Array.isArray(data.workflows) && data.workflows.length >= 2, "workflows must have >= 2 workflows for future multi-agent support");
assert(data.workflows.some((workflow) => workflow.id === data.defaultWorkflowId), "defaultWorkflowId must point to a workflow");

const ids = new Set();
for (const workflow of data.workflows) {
  nonEmptyString(workflow.id, "workflow.id");
  assert(!ids.has(workflow.id), `duplicate workflow id: ${workflow.id}`);
  ids.add(workflow.id);
  for (const key of ["name", "environment", "viewState", "window"]) nonEmptyString(workflow[key], `${workflow.id}.${key}`);
  assert(typeof workflow.rcaConfidence === "number" && workflow.rcaConfidence >= 0 && workflow.rcaConfidence <= 100, `${workflow.id}.rcaConfidence must be 0-100`);

  const incident = workflow.incident;
  assert(incident && typeof incident === "object", `${workflow.id}.incident required`);
  for (const key of ["severity", "severityLabel", "title", "affectedSessions", "sessionDelta", "sloBurn", "sloLevel", "started", "status"]) {
    nonEmptyString(incident[key], `${workflow.id}.incident.${key}`);
  }
  assert(typeof incident.impactedWorkflows === "number", `${workflow.id}.incident.impactedWorkflows must be number`);

  assert(Array.isArray(workflow.traceTree) && workflow.traceTree.length >= 5, `${workflow.id}.traceTree must have >= 5 rows`);
  for (const row of workflow.traceTree) {
    for (const key of ["id", "name", "status", "duration", "provider", "retries", "cost"]) nonEmptyString(String(row[key] ?? ""), `${workflow.id}.traceTree.${key}`);
    assert(Number.isInteger(row.level) && row.level >= 0, `${workflow.id}.traceTree.level must be non-negative integer`);
  }

  assert(workflow.waterfall && Array.isArray(workflow.waterfall.scale) && workflow.waterfall.scale.length >= 5, `${workflow.id}.waterfall.scale required`);
  assert(Array.isArray(workflow.waterfall.spans) && workflow.waterfall.spans.length >= 5, `${workflow.id}.waterfall.spans must have >= 5 items`);
  for (const span of workflow.waterfall.spans) {
    for (const key of ["id", "label", "status", "duration"]) nonEmptyString(span[key], `${workflow.id}.waterfall.span.${key}`);
    numberLike(span.start, `${workflow.id}.waterfall.span.start`);
    numberLike(span.width, `${workflow.id}.waterfall.span.width`);
  }

  assert(Array.isArray(workflow.hypotheses) && workflow.hypotheses.length >= 3, `${workflow.id}.hypotheses must have >= 3 items`);
  for (const item of workflow.hypotheses) {
    assert(typeof item.rank === "number", `${workflow.id}.hypotheses.rank must be number`);
    nonEmptyString(item.title, `${workflow.id}.hypotheses.title`);
    assert(typeof item.score === "number", `${workflow.id}.hypotheses.score must be number`);
    assert(Array.isArray(item.evidence) && item.evidence.length >= 1, `${workflow.id}.hypotheses.evidence required`);
  }

  assert(workflow.recommendedAction, `${workflow.id}.recommendedAction required`);
  for (const key of ["title", "body", "button"]) nonEmptyString(workflow.recommendedAction[key], `${workflow.id}.recommendedAction.${key}`);
  assert(workflow.payload && Array.isArray(workflow.payload.code) && workflow.payload.code.length >= 4, `${workflow.id}.payload.code required`);
  assert(Array.isArray(workflow.payload.redactionRules) && workflow.payload.redactionRules.length >= 3, `${workflow.id}.payload.redactionRules required`);
  assert(Array.isArray(workflow.evaluations) && workflow.evaluations.length >= 5, `${workflow.id}.evaluations required`);
  assert(workflow.replay, `${workflow.id}.replay required`);
  assert(Array.isArray(workflow.logs) && workflow.logs.length >= 4, `${workflow.id}.logs required`);
}

const serialized = JSON.stringify(data).toLowerCase();
const bannedTerms = [
  "client" + " name",
  "employer" + " private",
  "salary" + " band",
  "年" + "収",
  "credential",
  "pass" + "word"
];
for (const term of bannedTerms) {
  assert(!serialized.includes(term.toLowerCase()), `public data must not include banned term: ${term}`);
}

console.log(`OK: ${data.workflows.length} agent workflows validated for trace triage dashboard (${path.relative(root, dataPath)})`);
