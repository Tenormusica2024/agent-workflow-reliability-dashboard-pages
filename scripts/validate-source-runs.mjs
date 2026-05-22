import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputs = process.argv.slice(2);
const targets = inputs.length > 0 ? inputs : ["data/agent-runs.example.json"];
const files = expandTargets(targets);

if (files.length === 0) {
  throw new Error("No source telemetry JSON files found");
}

let workflowCount = 0;
for (const filePath of files) {
  const relativePath = toRelative(filePath);
  const data = readJson(filePath, relativePath);
  workflowCount += validateDocument(data, relativePath);
}

console.log(`OK: ${workflowCount} source workflow(s) validated across ${files.length} file(s)`);

function expandTargets(targetsToExpand) {
  const out = [];
  for (const target of targetsToExpand) {
    const targetPath = path.resolve(root, target);
    if (!fs.existsSync(targetPath)) {
      throw new Error(`Input path missing: ${toRelative(targetPath)}`);
    }
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      const children = fs.readdirSync(targetPath)
        .filter((name) => name.endsWith(".json"))
        .sort((a, b) => a.localeCompare(b))
        .map((name) => path.join(targetPath, name));
      if (children.length === 0) {
        throw new Error(`No .json files found in directory: ${toRelative(targetPath)}`);
      }
      out.push(...children);
    } else if (stat.isFile()) {
      out.push(targetPath);
    } else {
      throw new Error(`Input is neither file nor directory: ${toRelative(targetPath)}`);
    }
  }
  return out;
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${label}: invalid JSON (${error.message})`);
  }
}

function validateDocument(data, label) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    fail(label, "root object required");
  }

  if (data.schemaVersion === "agent-run.v0.1") {
    validateWorkflow(data.workflow, `${label}.workflow`);
    return 1;
  }

  if (data.schemaVersion === "agent-runs.v0.1") {
    arrayMin(data.workflows, 1, `${label}.workflows`);
    const ids = new Set();
    for (const [index, workflow] of data.workflows.entries()) {
      validateWorkflow(workflow, `${label}.workflows[${index}]`);
      if (ids.has(workflow.id)) fail(label, `duplicate workflow id: ${workflow.id}`);
      ids.add(workflow.id);
    }
    if (data.defaultWorkflowId != null) {
      nonEmptyString(data.defaultWorkflowId, `${label}.defaultWorkflowId`);
      if (!ids.has(data.defaultWorkflowId)) {
        fail(label, `defaultWorkflowId does not point to a workflow: ${data.defaultWorkflowId}`);
      }
    }
    return data.workflows.length;
  }

  fail(label, `unsupported schemaVersion: ${data.schemaVersion ?? "<missing>"}`);
}

function validateWorkflow(workflow, label) {
  if (!workflow || typeof workflow !== "object" || Array.isArray(workflow)) fail(label, "workflow object required");
  nonEmptyString(workflow.id, `${label}.id`);
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(workflow.id)) {
    fail(`${label}.id`, "must use only letters, numbers, underscore, or hyphen");
  }
  for (const key of ["name", "environment", "window"]) {
    nonEmptyString(workflow[key], `${label}.${key}`);
  }
  if (workflow.scheduler != null) validateScheduler(workflow.scheduler, `${label}.scheduler`);

  validateIncident(workflow.incident, `${label}.incident`);
  validateTrace(workflow.trace, `${label}.trace`);
  validateSpans(workflow.spans, workflow.trace.durationMs, `${label}.spans`);
  validateHypotheses(workflow.hypotheses, `${label}.hypotheses`);
  validateRecommendedAction(workflow.recommendedAction, `${label}.recommendedAction`);
  if (!workflow.payload || typeof workflow.payload !== "object" || Array.isArray(workflow.payload)) {
    fail(`${label}.payload`, "object required");
  }
  validateEvaluations(workflow.evaluations, `${label}.evaluations`);
  if (workflow.history != null) validateHistory(workflow.history, `${label}.history`);
  validateReplay(workflow.replay, `${label}.replay`);
  validateLogs(workflow.logs, `${label}.logs`);
}

function validateScheduler(scheduler, label) {
  if (!scheduler || typeof scheduler !== "object" || Array.isArray(scheduler)) fail(label, "object required");
  for (const key of ["profileId", "taskName", "trigger", "cadence", "sourceType", "inputMode", "adapter", "outputTarget", "historyStore"]) {
    optionalString(scheduler[key], `${label}.${key}`);
  }
}

function validateIncident(incident, label) {
  if (!incident || typeof incident !== "object" || Array.isArray(incident)) fail(label, "object required");
  for (const key of ["title", "started", "sessionDelta", "status"]) {
    nonEmptyString(incident[key], `${label}.${key}`);
  }
  nonNegativeNumber(incident.affectedSessions, `${label}.affectedSessions`);
  nonNegativeNumber(incident.impactedWorkflows, `${label}.impactedWorkflows`);
  nonNegativeNumber(incident.sloBurn, `${label}.sloBurn`);
}

function validateTrace(trace, label) {
  if (!trace || typeof trace !== "object" || Array.isArray(trace)) fail(label, "object required");
  for (const key of ["sessionId", "traceId", "model"]) {
    nonEmptyString(trace[key], `${label}.${key}`);
  }
  positiveNumber(trace.durationMs, `${label}.durationMs`);
  nonNegativeNumber(trace.tokens, `${label}.tokens`);
  nonNegativeNumber(trace.costUsd, `${label}.costUsd`);
}

function validateSpans(spans, traceDurationMs, label) {
  arrayMin(spans, 3, label);
  const ids = new Set();
  for (const [index, span] of spans.entries()) {
    const itemPath = `${label}[${index}]`;
    if (!span || typeof span !== "object" || Array.isArray(span)) fail(itemPath, "object required");
    nonEmptyString(span.id, `${itemPath}.id`);
    if (ids.has(span.id)) fail(label, `duplicate span id: ${span.id}`);
    ids.add(span.id);
    nonEmptyString(span.name, `${itemPath}.name`);
    oneOf(span.status, ["success", "warning", "error", "skipped"], `${itemPath}.status`);
    nonNegativeNumber(span.startMs, `${itemPath}.startMs`);
    positiveNumber(span.durationMs, `${itemPath}.durationMs`);
    if (span.startMs + span.durationMs > traceDurationMs) {
      fail(itemPath, `span end exceeds trace.durationMs (${span.startMs + span.durationMs} > ${traceDurationMs})`);
    }
    nonEmptyString(span.provider, `${itemPath}.provider`);
    optionalNonNegativeInteger(span.retries, `${itemPath}.retries`);
    optionalNonNegativeNumber(span.tokens, `${itemPath}.tokens`);
    optionalNonNegativeNumber(span.costUsd, `${itemPath}.costUsd`);
    optionalBoolean(span.highlight, `${itemPath}.highlight`);
    optionalString(span.annotation, `${itemPath}.annotation`);
    if (span.retryDurationsMs != null) {
      arrayMin(span.retryDurationsMs, 1, `${itemPath}.retryDurationsMs`);
      for (const [retryIndex, duration] of span.retryDurationsMs.entries()) {
        positiveNumber(duration, `${itemPath}.retryDurationsMs[${retryIndex}]`);
      }
    }
  }
}

function validateHypotheses(hypotheses, label) {
  arrayMin(hypotheses, 3, label);
  const ranks = new Set();
  for (const [index, item] of hypotheses.entries()) {
    const itemPath = `${label}[${index}]`;
    if (!item || typeof item !== "object" || Array.isArray(item)) fail(itemPath, "object required");
    positiveNumber(item.rank, `${itemPath}.rank`);
    if (ranks.has(item.rank)) fail(label, `duplicate hypothesis rank: ${item.rank}`);
    ranks.add(item.rank);
    nonEmptyString(item.title, `${itemPath}.title`);
    ratio(item.score, `${itemPath}.score`);
    if (item.tone != null) oneOf(item.tone, ["danger", "warning", "info", "success"], `${itemPath}.tone`);
    arrayMin(item.evidence, 1, `${itemPath}.evidence`);
    for (const [evidenceIndex, evidence] of item.evidence.entries()) {
      nonEmptyString(evidence, `${itemPath}.evidence[${evidenceIndex}]`);
    }
  }
}

function validateRecommendedAction(action, label) {
  if (!action || typeof action !== "object" || Array.isArray(action)) fail(label, "object required");
  for (const key of ["title", "body", "button"]) {
    nonEmptyString(action[key], `${label}.${key}`);
  }
}

function validateEvaluations(evaluations, label) {
  arrayMin(evaluations, 5, label);
  for (const [index, item] of evaluations.entries()) {
    const itemPath = `${label}[${index}]`;
    if (!item || typeof item !== "object" || Array.isArray(item)) fail(itemPath, "object required");
    nonEmptyString(item.name, `${itemPath}.name`);
    ratio(item.score, `${itemPath}.score`);
    ratio(item.baseline, `${itemPath}.baseline`);
    nonEmptyString(item.impact, `${itemPath}.impact`);
  }
}

function validateHistory(history, label) {
  arrayMin(history, 2, label);
  for (const [index, item] of history.entries()) {
    const itemPath = `${label}[${index}]`;
    if (!item || typeof item !== "object" || Array.isArray(item)) fail(itemPath, "object required");
    nonEmptyString(item.label ?? item.time, `${itemPath}.labelOrTime`);
    if (item.label != null) nonEmptyString(item.label, `${itemPath}.label`);
    if (item.time != null) nonEmptyString(item.time, `${itemPath}.time`);
    nonNegativeNumber(item.affectedSessions, `${itemPath}.affectedSessions`);
    nonNegativeNumber(item.sloBurn, `${itemPath}.sloBurn`);
    positiveNumber(item.durationMs, `${itemPath}.durationMs`);
    nonNegativeNumber(item.errorRate, `${itemPath}.errorRate`);
    optionalString(item.status, `${itemPath}.status`);
  }
}

function validateReplay(replay, label) {
  if (!replay || typeof replay !== "object" || Array.isArray(replay)) fail(label, "object required");
  for (const key of ["model", "temperature", "tools"]) {
    nonEmptyString(replay[key], `${label}.${key}`);
  }
}

function validateLogs(logs, label) {
  arrayMin(logs, 4, label);
  for (const [index, item] of logs.entries()) {
    const itemPath = `${label}[${index}]`;
    if (!item || typeof item !== "object" || Array.isArray(item)) fail(itemPath, "object required");
    for (const key of ["time", "level", "source", "message"]) {
      nonEmptyString(item[key], `${itemPath}.${key}`);
    }
  }
}

function nonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) fail(label, "non-empty string required");
}

function optionalString(value, label) {
  if (value != null && typeof value !== "string") fail(label, "string required when present");
}

function optionalBoolean(value, label) {
  if (value != null && typeof value !== "boolean") fail(label, "boolean required when present");
}

function positiveNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) fail(label, "positive number required");
}

function nonNegativeNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) fail(label, "non-negative number required");
}

function optionalNonNegativeNumber(value, label) {
  if (value != null) nonNegativeNumber(value, label);
}

function optionalNonNegativeInteger(value, label) {
  if (value != null && (!Number.isInteger(value) || value < 0)) fail(label, "non-negative integer required when present");
}

function ratio(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    fail(label, "number between 0 and 1 required");
  }
}

function oneOf(value, allowed, label) {
  if (!allowed.includes(value)) fail(label, `must be one of: ${allowed.join(", ")}`);
}

function arrayMin(value, min, label) {
  if (!Array.isArray(value) || value.length < min) fail(label, `array with >= ${min} item(s) required`);
}

function fail(label, message) {
  throw new Error(`${label}: ${message}`);
}

function toRelative(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, "/");
}
