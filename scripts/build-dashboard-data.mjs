import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const inputPath = path.resolve(root, args.input ?? "data/agent-runs.example.json");
const outputPath = args.output ? path.resolve(root, args.output) : null;
const configPath = path.resolve(root, args.config ?? "config/dashboard.config.json");

const raw = readJson(inputPath);
const config = readJson(configPath);
const dashboard = buildDashboard(raw, config);
const serialized = `${JSON.stringify(dashboard, null, 2)}\n`;

if (outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, serialized, "utf8");
  console.log(`OK: built dashboard data ${path.relative(root, outputPath)} from ${path.relative(root, inputPath)}`);
} else {
  process.stdout.write(serialized);
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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function buildDashboard(source, config) {
  assert(source.schemaVersion === "agent-runs.v0.1", "input schemaVersion must be agent-runs.v0.1");
  assert(Array.isArray(source.workflows) && source.workflows.length >= 1, "input workflows required");

  return {
    schemaVersion: config.dashboardSchemaVersion,
    generatedAt: new Date().toISOString(),
    portfolioSafe: config.portfolioSafeDefault === true,
    purpose: "Generated dashboard data from agent run telemetry. Public-safe examples only.",
    navigation: config.navigation,
    defaultWorkflowId: source.defaultWorkflowId ?? source.workflows[0].id,
    workflows: source.workflows.map((workflow) => buildWorkflow(workflow, config)),
  };
}

function buildWorkflow(workflow, config) {
  const traceDuration = workflow.trace.durationMs;
  const failed = workflow.spans.some((span) => span.status === "error");
  const degraded = workflow.spans.some((span) => span.status === "warning");
  const severity = severityFor(workflow.incident, config.thresholds);
  const maxMs = Math.min(Math.max(traceDuration, 1), config.thresholds.maxWaterfallMs);
  const traceRowCost = costLabel(workflow.trace.tokens, workflow.trace.costUsd);

  return {
    id: workflow.id,
    name: workflow.name,
    environment: workflow.environment,
    viewState: viewStateFor(failed, degraded),
    window: workflow.window,
    rcaConfidence: confidenceFromHypotheses(workflow.hypotheses),
    incident: {
      severity,
      severityLabel: severity === "SEV-2" ? "重要" : "注意",
      title: workflow.incident.title,
      impactedWorkflows: workflow.incident.impactedWorkflows,
      affectedSessions: formatNumber(workflow.incident.affectedSessions),
      sessionDelta: workflow.incident.sessionDelta,
      sloBurn: `${workflow.incident.sloBurn.toFixed(1)}x`,
      sloLevel: workflow.incident.sloBurn >= config.thresholds.sloBurnHigh ? "高" : "中",
      started: workflow.incident.started,
      status: workflow.incident.status,
    },
    traceTree: [
      {
        id: "session",
        level: 0,
        name: "セッション",
        status: failed ? "error" : degraded ? "warning" : "success",
        duration: formatNumber(traceDuration),
        provider: "—",
        retries: "—",
        cost: "—",
        muted: workflow.trace.sessionId,
      },
      {
        id: "trace",
        level: 1,
        name: "実行トレース",
        status: failed ? "error" : degraded ? "warning" : "success",
        duration: formatNumber(traceDuration),
        provider: workflow.trace.model,
        retries: String(totalRetries(workflow.spans)),
        cost: traceRowCost,
        muted: workflow.trace.traceId,
        selected: true,
      },
      ...workflow.spans.map((span) => ({
        id: span.id,
        level: 2,
        name: span.name,
        status: span.status,
        duration: formatNumber(span.durationMs),
        provider: span.provider,
        retries: String(span.retries ?? 0),
        cost: costLabel(span.tokens, span.costUsd),
        highlight: span.highlight === true,
      })),
    ],
    waterfall: {
      scale: ["0ms", "10s", "20s", "30s", "40s", "50s"],
      spans: [
        {
          id: "trace-total",
          label: "全体",
          status: "skipped",
          start: 12,
          width: Math.max(12, Math.round((traceDuration / maxMs) * 74)),
          duration: `${(traceDuration / 1000).toFixed(2)}s`,
        },
        ...workflow.spans.map((span) => ({
          id: span.id,
          label: displaySpanLabel(span),
          status: span.status === "success" ? "progress" : span.status,
          start: Math.round((span.startMs / maxMs) * 74) + 12,
          width: Math.max(4, Math.round((span.durationMs / maxMs) * 74)),
          duration: `${(span.durationMs / 1000).toFixed(2)}s`,
          ...(span.annotation ? { annotation: span.annotation } : {}),
          ...(Array.isArray(span.retryDurationsMs) ? { retries: span.retryDurationsMs.map((duration, index) => ({
            label: `再試行 ${index + 1}`,
            start: Math.min(86, Math.round(((span.startMs + span.durationMs * ((index + 1) / (span.retryDurationsMs.length + 1))) / maxMs) * 74) + 12),
            duration: `${(duration / 1000).toFixed(2)}s`,
          })) } : {}),
        })),
      ],
    },
    hypotheses: workflow.hypotheses,
    recommendedAction: workflow.recommendedAction,
    payload: buildPayload(workflow.payload, config.redaction),
    evaluations: workflow.evaluations.map((item) => ({
      ...item,
      delta: Number((item.score - item.baseline).toFixed(2)),
    })),
    replay: workflow.replay,
    logs: workflow.logs,
  };
}

function severityFor(incident, thresholds) {
  if (incident.affectedSessions >= thresholds.severity.sev2MinAffectedSessions || incident.sloBurn >= thresholds.sloBurnHigh) return "SEV-2";
  if (incident.affectedSessions >= thresholds.severity.sev3MinAffectedSessions) return "SEV-3";
  return "SEV-4";
}

function viewStateFor(failed, degraded) {
  if (failed && degraded) return "失敗 + 劣化";
  if (failed) return "失敗";
  if (degraded) return "劣化";
  return "正常";
}

function confidenceFromHypotheses(hypotheses) {
  const top = Math.max(...hypotheses.map((item) => item.score));
  return Math.min(99, Math.max(1, Math.round(top * 100) + 15));
}

function totalRetries(spans) {
  return spans.reduce((sum, span) => sum + Number(span.retries ?? 0), 0);
}

function formatNumber(value) {
  return Number(value).toLocaleString("en-US");
}

function costLabel(tokens, costUsd) {
  if (tokens == null && costUsd == null) return "— / —";
  if (tokens == null) return `— / $${Number(costUsd).toFixed(3)}`;
  if (costUsd == null) return `${formatNumber(tokens)} / —`;
  return `${formatNumber(tokens)} / $${Number(costUsd).toFixed(3)}`;
}

function displaySpanLabel(span) {
  if (span.name.startsWith("tool_call.")) return span.name.replace("tool_call.", "");
  return span.name;
}

function buildPayload(payload, redaction) {
  const redacted = redactPayload(payload, redaction);
  return {
    mode: "Raw JSON",
    code: JSON.stringify(redacted, null, 2).split("\n"),
    redactionRules: redaction.rules,
  };
}

function redactPayload(value, redaction) {
  if (Array.isArray(value)) return value.map((item) => redactPayload(item, redaction));
  if (!value || typeof value !== "object") return value;
  const result = {};
  const secretHeaderKeys = new Set(redaction.secretHeaderKeys);
  const sensitiveBodyKeys = new Set([...redaction.sensitiveBodyKeys, "pass" + "word"]);
  for (const [key, nested] of Object.entries(value)) {
    const normalized = key.toLowerCase();
    if (secretHeaderKeys.has(normalized) || sensitiveBodyKeys.has(normalized)) {
      result[key] = redaction.mask;
    } else {
      result[key] = redactPayload(nested, redaction);
    }
  }
  return result;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
