import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/(.:\/)/, "$1"));
const args = parseArgs(process.argv.slice(2));
const dataPath = args.path ? path.resolve(root, args.path) : path.join(root, "sample-runs.json");
const minWorkflows = Number(args.minWorkflows ?? 2);
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
if (data.reliabilityThresholds != null) {
  validateReliabilityThresholds(data.reliabilityThresholds, "reliabilityThresholds");
}
assert(Number.isInteger(minWorkflows) && minWorkflows >= 1, "minWorkflows must be a positive integer");
assert(Array.isArray(data.workflows) && data.workflows.length >= minWorkflows, `workflows must have >= ${minWorkflows} workflow(s)`);
assert(data.workflows.some((workflow) => workflow.id === data.defaultWorkflowId), "defaultWorkflowId must point to a workflow");

const ids = new Set();
for (const workflow of data.workflows) {
  nonEmptyString(workflow.id, "workflow.id");
  assert(!ids.has(workflow.id), `duplicate workflow id: ${workflow.id}`);
  ids.add(workflow.id);
  for (const key of ["name", "environment", "viewState", "window"]) nonEmptyString(workflow[key], `${workflow.id}.${key}`);
  if (workflow.scheduler != null) validateScheduler(workflow.scheduler, `${workflow.id}.scheduler`);
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
  if (workflow.historySource != null) {
    assert(["collector", "fallback"].includes(workflow.historySource), `${workflow.id}.historySource invalid`);
  }
  if (workflow.history != null) {
    assert(Array.isArray(workflow.history) && workflow.history.length >= 2, `${workflow.id}.history must have >= 2 items`);
    for (const [index, item] of workflow.history.entries()) {
      const itemPath = `${workflow.id}.history[${index}]`;
      assert(item && typeof item === "object", `${itemPath} must be object`);
      nonEmptyString(item.label ?? item.time, `${itemPath}.labelOrTime`);
      for (const key of ["affectedSessions", "sloBurn", "durationMs", "errorRate"]) {
        assert(typeof item[key] === "number" && Number.isFinite(item[key]) && item[key] >= 0, `${itemPath}.${key} must be non-negative number`);
      }
    }
  }
  if (workflow.reliabilityDecision != null) {
    const decision = workflow.reliabilityDecision;
    assert(decision && typeof decision === "object", `${workflow.id}.reliabilityDecision must be object`);
    assert(["critical", "alert", "recovering", "stable"].includes(decision.level), `${workflow.id}.reliabilityDecision.level invalid`);
    for (const key of ["sloDelta", "sloBaselineRatio", "errorDelta", "affectedDelta"]) {
      assert(typeof decision[key] === "number" && Number.isFinite(decision[key]), `${workflow.id}.reliabilityDecision.${key} must be number`);
    }
    assert(Array.isArray(decision.ruleHits), `${workflow.id}.reliabilityDecision.ruleHits must be array`);
    if (decision.historySource != null) {
      assert(["collector", "fallback", "unknown"].includes(decision.historySource), `${workflow.id}.reliabilityDecision.historySource invalid`);
    }
    if (decision.thresholds != null) {
      validateReliabilityThresholds(decision.thresholds, `${workflow.id}.reliabilityDecision.thresholds`);
    }
    nonEmptyString(decision.nextActionKey, `${workflow.id}.reliabilityDecision.nextActionKey`);
  }
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

function validateScheduler(scheduler, pathName) {
  assert(scheduler && typeof scheduler === "object" && !Array.isArray(scheduler), `${pathName}: object required`);
  for (const key of ["profileId", "taskName", "trigger", "cadence", "sourceType", "inputMode", "adapter", "outputTarget", "historyStore", "lastRunAt", "nextRunAt"]) {
    if (scheduler[key] != null) nonEmptyString(scheduler[key], `${pathName}.${key}`);
  }
}

function parseArgs(argv) {
  const out = { path: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--") && !out.path) {
      out.path = arg;
      continue;
    }
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    out[key] = value;
  }
  return out;
}

function validateReliabilityThresholds(thresholds, pathName) {
  assert(thresholds && typeof thresholds === "object" && !Array.isArray(thresholds), `${pathName}: object required`);
  for (const key of [
    "sloPreviousDeltaAlert",
    "sloBaselineRatioAlert",
    "errorRateDeltaAlert",
    "affectedSessionsDeltaAlert",
    "recoverySloBurnMax",
    "criticalSloBurnMin",
  ]) {
    assert(typeof thresholds[key] === "number" && Number.isFinite(thresholds[key]) && thresholds[key] >= 0, `${pathName}.${key} must be non-negative number`);
  }
}
