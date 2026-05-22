import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { attachRunHistory } from "./run-history.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const configPath = path.resolve(root, args.config ?? "config/scheduled-sources.example.json");
const config = readJson(configPath);
const profile = selectProfile(config, args.profile);
const profilePathId = validateProfileId(profile.id);
const inputPath = path.resolve(root, args.input ?? profile.input);
const outputPath = path.resolve(root, args.output ?? `data/private-incoming/${profilePathId}.json`);
const historyDisabled = args.noHistoryStore === true || args["no-history-store"] === true || profile.historyStore === false;
const historyStorePath = historyDisabled
  ? null
  : path.resolve(root, args.historyStore ?? args["history-store"] ?? profile.historyStore ?? `data/private-runs/${profilePathId}.history.json`);

if (!fs.existsSync(inputPath)) {
  throw new Error([
    `Scheduled source file not found: ${inputPath}`,
    "Usage:",
    "  node scripts/import-scheduled-run.mjs --config <profiles.json> --profile <id> [--input <path>] [--output data/private-incoming/<id>.json]",
  ].join("\n"));
}

const sourceText = fs.readFileSync(inputPath, "utf8").replace(/^\uFEFF/, "");
const source = parseSource(sourceText, profile.type, inputPath);
const workflow = profile.type === "agent-run-json"
  ? workflowFromAgentRun(source, profile)
  : buildWorkflow({ source, sourceText, inputPath, profile });
const historyResult = attachRunHistory({
  workflow,
  storePath: historyStorePath,
  limit: args.historyLimit ?? args["history-limit"] ?? profile.historyLimit,
  disabled: historyDisabled,
});
applyHistoryResult(workflow, historyResult);

const output = {
  schemaVersion: "agent-run.v0.1",
  generatedAt: new Date().toISOString(),
  source: {
    type: "scheduled-source-profile",
    profile: profile.id,
    sourceType: profile.type,
    redaction: redactionSummaryFor(profile),
  },
  workflow,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`OK: imported scheduled run profile '${profile.id}' to ${toRelative(outputPath)}`);
console.log("Next:");
console.log("  example profile flow: npm run check:scheduled:example");
console.log("  local/private profile flow: npm run check:scheduled");

function buildWorkflow({ source, sourceText, inputPath, profile }) {
  const checks = normalizeChecks(profile.checks ?? [], source, profile.type);
  const startedValue = valueOf(profile.extract?.startedAt, source, profile.type);
  const startedMs = timestamp(startedValue)
    ?? fs.statSync(inputPath).mtimeMs;
  const durationMs = positiveNumber(valueOf(profile.extract?.durationMs, source, profile.type))
    ?? durationFromTimestamps(startedMs, valueOf(profile.extract?.finishedAt, source, profile.type))
    ?? Math.max(1000, sumCheckDurations(checks));
  const nextRunAt = stringValue(valueOf(profile.extract?.nextRunAt, source, profile.type));
  const runId = stringValue(valueOf(profile.extract?.runId, source, profile.type))
    ?? `${profile.id}_${new Date(startedMs).toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  const sessionId = stringValue(valueOf(profile.extract?.sessionId, source, profile.type)) ?? `scheduled_${safeId(profile.id)}`;
  const { spec: primaryStatusSpec, value: rawStatus } = primaryStatusCandidate(profile, source, profile.type);
  const primaryStatus = statusFor(rawStatus, primaryStatusSpec ?? {});
  const hasPrimaryStatusMapping = profile.extract?.status != null || profile.extract?.verdict != null;
  const primaryStatusUnknown = hasPrimaryStatusMapping && (rawStatus == null || primaryStatus === "skipped");
  const primaryCheckStatus = primaryStatusUnknown ? "warning" : primaryStatus;
  if (hasPrimaryStatusMapping && primaryCheckStatus !== "success") {
    checks.unshift(primaryStatusCheckFor(checks, rawStatus, primaryCheckStatus, primaryStatusUnknown));
  }
  const failed = checks.some((check) => check.status === "error") || primaryStatus === "error";
  const degraded = checks.some((check) => check.status === "warning") || primaryStatus === "warning" || primaryStatusUnknown;
  const state = failed ? "要対応" : degraded ? "監視中" : "正常";
  const affectedSessions = nonNegativeNumber(valueOf(profile.extract?.affectedSessions, source, profile.type), failed ? 1 : 0);
  const sloBurn = nonNegativeNumber(valueOf(profile.extract?.sloBurn, source, profile.type), failed ? 2.4 : degraded ? 1.4 : 0.7);
  const errorRate = nonNegativeNumber(valueOf(profile.extract?.errorRate, source, profile.type), failed ? 3 : degraded ? 1 : 0);
  const spans = buildSpans(checks, durationMs);
  const sourceHash = sha256(sourceText);
  const summarySignals = summarizeSignals(profile, source, profile.type);

  return {
    id: safeId(profile.workflow?.id ?? profile.id),
    name: stringValue(profile.workflow?.name) ?? profile.id,
    environment: stringValue(profile.workflow?.environment) ?? "local scheduled run",
    window: stringValue(profile.workflow?.window) ?? "latest run",
    scheduler: schedulerForProfile({ profile, outputPath, historyStorePath, historyDisabled, lastRunAt: stringValue(startedValue) ?? new Date(startedMs).toISOString(), nextRunAt }),
    incident: {
      title: stringValue(profile.workflow?.incidentTitle)
        ?? (failed ? "定期実行runで確認が必要" : degraded ? "定期実行runに軽微な劣化" : "定期実行runは正常に完了"),
      started: new Date(startedMs).toISOString(),
      affectedSessions,
      sessionDelta: stringValue(valueOf(profile.extract?.sessionDelta, source, profile.type)) ?? (affectedSessions > 0 ? `+${affectedSessions}` : "+0.0%"),
      impactedWorkflows: nonNegativeNumber(valueOf(profile.extract?.impactedWorkflows, source, profile.type), 1),
      sloBurn,
      status: state,
    },
    trace: {
      sessionId,
      traceId: safeId(runId),
      durationMs,
      model: stringValue(valueOf(profile.extract?.model, source, profile.type)) ?? stringValue(profile.workflow?.model) ?? "scheduled project adapter",
      tokens: nonNegativeNumber(valueOf(profile.extract?.tokens, source, profile.type), 0),
      costUsd: nonNegativeNumber(valueOf(profile.extract?.costUsd, source, profile.type), 0),
    },
    spans,
    hypotheses: buildHypotheses(checks, failed, degraded),
    recommendedAction: buildRecommendedAction(profile, failed, degraded),
    payload: {
      adapter: "scheduled-source-profile.v0.1",
      profile_id: profile.id,
      source_type: profile.type,
      source_file_name_copied: false,
      source_file_extension: path.extname(inputPath).toLowerCase() || "none",
      source_sha256: sourceHash,
      raw_body_copied: false,
      local_path_copied: false,
      command_output_copied: false,
      mapped_signal_count: summarySignals.length,
      latest_error_rate: errorRate,
      mapped_signals: summarySignals,
    },
    evaluations: buildEvaluations(checks, failed, degraded),
    replay: {
      model: stringValue(profile.replay?.model) ?? "local scheduled adapter",
      temperature: stringValue(profile.replay?.temperature) ?? "n/a",
      tools: stringValue(profile.replay?.tools) ?? "profile extraction, validation, dashboard build",
    },
    logs: buildLogs(startedMs, checks, state),
  };
}

function workflowFromAgentRun(source, profile) {
  if (profile.trustedPreSanitized !== true) {
    throw new Error(`${profile.id}: agent-run-json requires trustedPreSanitized=true because the workflow body is reused`);
  }
  const workflow = source?.schemaVersion === "agent-run.v0.1" ? source.workflow : null;
  if (!workflow || typeof workflow !== "object" || Array.isArray(workflow)) {
    throw new Error(`${profile.id}: agent-run-json profile requires schemaVersion=agent-run.v0.1 with workflow`);
  }
  requireObject(workflow.payload, `${profile.id}: agent-run-json workflow.payload`);
  requireObject(workflow.incident, `${profile.id}: agent-run-json workflow.incident`);
  requireObject(workflow.trace, `${profile.id}: agent-run-json workflow.trace`);
  requireObject(workflow.recommendedAction, `${profile.id}: agent-run-json workflow.recommendedAction`);
  requireObject(workflow.replay, `${profile.id}: agent-run-json workflow.replay`);
  requireArray(workflow.spans, `${profile.id}: agent-run-json workflow.spans`);
  requireArray(workflow.hypotheses, `${profile.id}: agent-run-json workflow.hypotheses`);
  requireArray(workflow.evaluations, `${profile.id}: agent-run-json workflow.evaluations`);
  requireArray(workflow.logs, `${profile.id}: agent-run-json workflow.logs`);
  return JSON.parse(JSON.stringify(workflow));
}

function applyHistoryResult(workflow, historyResult) {
  workflow.payload.history_store_enabled = historyResult.enabled;
  workflow.payload.history_record_count = historyResult.recordCount;
  workflow.payload.history_attached = historyResult.attached;

  if (historyResult.enabled) return;

  const historySpan = workflow.spans?.find((span) => span.id === "history_store"
    && span.provider === "adapter"
    && span.annotation === "safe summary history only");
  if (historySpan) {
    historySpan.status = "skipped";
    historySpan.annotation = "history store disabled by profile";
    historySpan.highlight = false;
  }

  const historyEvaluation = workflow.evaluations?.find((item) => item.name === "history_ready"
    && item.baseline === 0.8
    && item.impact === "中");
  if (historyEvaluation) {
    historyEvaluation.score = 0;
    historyEvaluation.impact = "低";
  }

  const historyLog = workflow.logs?.find((log) => log.source === "history_store"
    && log.message === "history store: safe summary history only");
  if (historyLog) {
    historyLog.level = "INFO";
    historyLog.message = "history store disabled by profile";
  }
}

function redactionSummaryFor(profile) {
  if (profile.type === "agent-run-json") {
    return "trusted pre-sanitized agent-run-json workflow body is reused, then adapter history metadata is applied; safety scan is still required before publishing";
  }
  return "raw artifact body, full local path, source file name, and command output are not copied; mapped annotations/evidence must be safe profile-selected summaries";
}

function schedulerForProfile({ profile, outputPath, historyStorePath, historyDisabled, lastRunAt, nextRunAt }) {
  const configured = profile.workflow?.scheduler ?? {};
  return {
    profileId: profile.id,
    taskName: stringValue(configured.taskName) ?? profile.id,
    trigger: stringValue(configured.trigger) ?? "Windows Task Scheduler / manual run",
    cadence: stringValue(configured.cadence) ?? "profile execution",
    sourceType: profile.type,
    inputMode: stringValue(configured.inputMode) ?? `${profile.type} artifact`,
    adapter: "scheduled-source-profile.v0.1",
    outputTarget: stringValue(configured.outputTarget) ?? toRelative(outputPath),
    historyStore: historyDisabled ? "disabled" : stringValue(configured.historyStore) ?? `enabled: ${toRelative(historyStorePath)}`,
    lastRunAt: stringValue(configured.lastRunAt) ?? stringValue(lastRunAt) ?? new Date().toISOString(),
    nextRunAt: stringValue(configured.nextRunAt) ?? nextRunAt ?? "next scheduled trigger",
    switchHint: stringValue(configured.switchHint) ?? "change only --profile to view another scheduled program",
  };
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label}: object required`);
}

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label}: array required`);
}

function normalizeChecks(checks, source, sourceType) {
  const normalized = checks.map((check, index) => {
    const rawStatus = valueOf(check.status, source, sourceType);
    const mappedStatus = statusFor(rawStatus, check);
    const status = mappedStatus === "skipped" ? "warning" : mappedStatus;
    const annotation = safeSignalText(valueOf(check.annotation, source, sourceType) ?? check.annotationText);
    return {
      id: safeId(check.id ?? `check_${index + 1}`),
      name: stringValue(check.name) ?? `check_${index + 1}`,
      provider: stringValue(check.provider) ?? "scheduled source",
      status,
      durationMs: positiveNumber(valueOf(check.durationMs, source, sourceType)) ?? 1000,
      annotation: annotation ?? (rawStatus == null ? "status mapping returned empty" : valueLabel(rawStatus)),
      evidence: evidenceFor(check, source, sourceType, rawStatus),
    };
  });

  const defaults = [
    ["source_read", "source artifact read", "adapter", "success", "入力artifactを読み取り"],
    ["profile_mapping", "profile mapping", "adapter", "success", "profileに従って信号を抽出"],
    ["history_store", "history store", "adapter", "success", "safe summary history only"],
  ];
  for (const [id, name, provider, status, annotation] of defaults) {
    if (normalized.length >= 4) break;
    normalized.push({ id, name, provider, status, durationMs: 1000, annotation, evidence: [annotation] });
  }
  return normalized;
}

function primaryStatusCheckFor(checks, rawStatus, status, unknown) {
  const statusLabel = safeSignalText(rawStatus) ?? "unknown";
  const annotation = unknown
    ? `run-level status mapping returned ${rawStatus == null ? "empty" : "unknown; raw value omitted"}`
    : `run-level status=${statusLabel}`;
  return {
    id: uniqueCheckId(checks, "current_run_status"),
    name: "current run status",
    provider: "scheduled source",
    status,
    durationMs: 1000,
    annotation,
    evidence: [annotation],
  };
}

function uniqueCheckId(checks, baseId) {
  const ids = new Set(checks.map((check) => check.id));
  let id = baseId;
  let suffix = 2;
  while (ids.has(id)) id = `${baseId}_${suffix++}`;
  return id;
}

function buildSpans(checks, totalMs) {
  const declared = checks.map((check) => positiveNumber(check.durationMs) ?? 1000);
  const sum = declared.reduce((acc, value) => acc + value, 0);
  const scale = sum > totalMs ? totalMs / sum : 1;
  let startMs = 0;
  return checks.map((check, index) => {
    const remaining = Math.max(1, totalMs - startMs);
    const durationMs = index === checks.length - 1
      ? remaining
      : Math.max(1, Math.floor(declared[index] * scale));
    const span = {
      id: check.id,
      name: check.name,
      status: check.status,
      startMs,
      durationMs,
      provider: check.provider,
      retries: 0,
      tokens: 0,
      costUsd: 0,
      highlight: check.status !== "success",
      annotation: check.annotation,
    };
    startMs += durationMs;
    return span;
  });
}

function buildHypotheses(checks, failed, degraded) {
  const problemChecks = checks.filter((check) => check.status !== "success");
  const seeds = problemChecks.length > 0 ? problemChecks : checks.slice(0, 3);
  const rows = seeds.slice(0, 3).map((check, index) => ({
    rank: index + 1,
    title: check.status === "success" ? `${check.name} は正常` : `${check.name} を確認`,
    score: check.status === "error" ? 0.86 : check.status === "warning" ? 0.58 : 0.32,
    tone: check.status === "error" ? "danger" : check.status === "warning" ? "warning" : "success",
    evidence: check.evidence.length > 0 ? check.evidence : [check.annotation ?? check.status],
  }));
  while (rows.length < 3) {
    rows.push({
      rank: rows.length + 1,
      title: failed ? "失敗runの切り分けを継続" : degraded ? "次回runで傾向確認" : "profile差し替え準備済み",
      score: failed ? 0.61 : degraded ? 0.42 : 0.28,
      tone: failed ? "warning" : degraded ? "info" : "success",
      evidence: ["raw artifactはdashboardへコピーしていない", "source profileを変更すれば別プロジェクトへ差し替え可能"],
    });
  }
  return rows;
}

function buildRecommendedAction(profile, failed, degraded) {
  if (profile.recommendedAction) {
    return {
      title: stringValue(profile.recommendedAction.title) ?? "profile設定を確認",
      body: stringValue(profile.recommendedAction.body) ?? "抽出済みの安全な集計値を確認してください。",
      button: stringValue(profile.recommendedAction.button) ?? "抽出結果を確認",
    };
  }
  if (failed) {
    return {
      title: "失敗したcheckだけを確認",
      body: "dashboardには安全な集計値だけを出しています。詳細確認は元プロジェクト側のartifactで行ってください。",
      button: "元runを点検",
    };
  }
  if (degraded) {
    return {
      title: "次回runまで監視",
      body: "warning checkの推移をhistoryで比較し、悪化が続く場合だけ元artifactを確認します。",
      button: "次runを確認",
    };
  }
  return {
    title: "実データ取り込みに利用可能",
    body: "source profileを差し替えるだけで、別の定期実行プロジェクトの最新runを同じdashboard schemaへ変換できます。",
    button: "profileを差し替え",
  };
}

function buildEvaluations(checks, failed, degraded) {
  const rows = checks.slice(0, 5).map((check) => ({
    name: check.name,
    score: check.status === "success" ? 1 : check.status === "warning" ? 0.5 : 0,
    baseline: 0.9,
    impact: check.status === "error" ? "高" : check.status === "warning" ? "中" : "低",
  }));
  const defaults = [
    ["source_readable", 1, 0.95, "高"],
    ["profile_mapping_complete", 1, 0.95, "高"],
    ["raw_payload_not_copied", 1, 0.95, "高"],
    ["current_run_state", failed ? 0 : degraded ? 0.5 : 1, 0.9, failed ? "高" : degraded ? "中" : "低"],
    ["history_ready", 1, 0.8, "中"],
  ];
  for (const [name, score, baseline, impact] of defaults) {
    if (rows.length >= 5) break;
    rows.push({ name, score, baseline, impact });
  }
  return rows;
}

function buildLogs(startedMs, checks, state) {
  const rows = [["INFO", "scheduled-import", `state=${state}`]];
  for (const check of checks.slice(0, 6)) {
    rows.push([
      check.status === "error" ? "ERROR" : check.status === "warning" ? "WARN" : "INFO",
      check.id,
      `${check.name}: ${check.annotation ?? check.status}`,
    ]);
  }
  while (rows.length < 4) rows.push(["INFO", "scheduled-import", "adapter heartbeat"]);
  return rows.map(([level, source, message], index) => ({
    time: new Date(startedMs + index * 1000).toISOString(),
    level,
    source,
    message,
  }));
}

function primaryStatusCandidate(profile, source, sourceType) {
  const specs = [profile.extract?.status, profile.extract?.verdict].filter((spec) => spec != null);
  for (const spec of specs) {
    const value = valueOf(spec, source, sourceType);
    if (value != null) return { spec, value };
  }
  return { spec: specs[0] ?? null, value: null };
}

function summarizeSignals(profile, source, sourceType) {
  const numericSignals = new Set([
    "durationMs",
    "affectedSessions",
    "impactedWorkflows",
    "sloBurn",
    "errorRate",
    "tokens",
    "costUsd",
  ]);
  const statusSignals = new Set(["status", "verdict"]);
  const entries = Object.entries(profile.extract ?? {})
    .filter(([, spec]) => spec && typeof spec === "object")
    .map(([name, spec]) => {
      const value = valueOf(spec, source, sourceType);
      if (statusSignals.has(name)) return { name, value: statusFor(value, spec) };
      if (numericSignals.has(name)) return { name, value: safeSignalValue(value) };
      return null;
    })
    .filter(Boolean)
    .filter((item) => item.value !== null)
    .slice(0, 12);
  return entries;
}

function evidenceFor(check, source, sourceType, rawStatus) {
  const rows = [];
  if (Array.isArray(check.evidence)) {
    for (const item of check.evidence) {
      if (typeof item === "string") rows.push(safeSignalText(item) ?? "unknown");
      else if (item && typeof item === "object") {
        const label = safeSignalText(item.label) ?? "signal";
        const value = safeSignalText(valueOf(item.value, source, sourceType)) ?? "unknown";
        rows.push(safeSignalText(`${label}=${value}`) ?? `${label}=unknown`);
      }
    }
  }
  if (rows.length === 0) rows.push(`status=${valueLabel(rawStatus)}`);
  return rows.slice(0, 4);
}

function parseSource(text, sourceType, inputPath) {
  if (sourceType === "markdown") return { text, scalars: markdownScalars(text) };
  if (sourceType === "json" || sourceType === "agent-run-json") return JSON.parse(text);
  throw new Error(`${inputPath}: unsupported profile.type '${sourceType}'`);
}

function valueOf(spec, source, sourceType) {
  if (spec == null) return null;
  if (typeof spec !== "object" || Array.isArray(spec)) return spec;
  if (Object.prototype.hasOwnProperty.call(spec, "literal")) return spec.literal;
  if (spec.env) return process.env[String(spec.env)] ?? null;
  if (sourceType === "markdown" && spec.key) return markdownValue(source, spec.key, spec.section);
  if (spec.path) return getByPath(source, spec.path);
  return null;
}

function getByPath(source, selector) {
  const normalized = String(selector).replace(/^\$\.?/, "");
  if (!normalized) return source;
  const parts = normalized.split(".").flatMap((part) => {
    const out = [];
    const re = /([^\[\]]+)|\[(\d+)\]/g;
    let match;
    while ((match = re.exec(part))) out.push(match[1] ?? Number(match[2]));
    return out;
  });
  let current = source;
  for (const part of parts) {
    if (current == null) return null;
    current = current[part];
  }
  return current;
}

function markdownValue(source, key, sectionTitle = null) {
  const text = sectionTitle ? markdownSection(source.text, sectionTitle) : source.text;
  const escaped = String(key).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`^-\\s*${escaped}\\s*:\\s*(.+)$`, "im"));
  return match ? cleanMarkdownValue(match[1]) : null;
}

function markdownSection(text, title) {
  const escaped = String(title).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`^##\\s+${escaped}\\s*$([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, "im"));
  return match ? match[1] : "";
}

function markdownScalars(text) {
  const scalars = {};
  for (const match of text.matchAll(/^-\s*([^:]+):\s*(.+)$/gm)) {
    scalars[match[1].trim()] = cleanMarkdownValue(match[2]);
  }
  return scalars;
}

function statusFor(value, check = {}) {
  const normalized = String(value ?? "").trim().toLowerCase();
  const okValues = (check.okValues ?? [true, "true", "ok", "pass", "passed", "success", "healthy", "normal", "正常"]).map((item) => String(item).toLowerCase());
  const warningValues = (check.warningValues ?? ["warn", "warning", "watch", "degraded", "skipped", "stale", "監視", "注意"]).map((item) => String(item).toLowerCase());
  const errorValues = (check.errorValues ?? [false, "false", "fail", "failed", "error", "critical", "ng", "要対応", "要確認"]).map((item) => String(item).toLowerCase());
  if (okValues.includes(normalized)) return "success";
  if (warningValues.includes(normalized)) return "warning";
  if (errorValues.includes(normalized)) return "error";
  if (value === true) return "success";
  if (value === false) return "error";
  return "skipped";
}

function selectProfile(config, requestedProfile) {
  if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("scheduled source config must be an object");
  const profiles = Array.isArray(config.profiles) ? config.profiles : [];
  if (profiles.length === 0) throw new Error("scheduled source config has no profiles");
  const validIds = profiles.map((item) => item.id).filter(Boolean).join(", ");
  let profile;
  if (requestedProfile != null) {
    profile = profiles.find((item) => item.id === requestedProfile);
    if (!profile) throw new Error(`scheduled source profile not found: ${requestedProfile}. Valid profiles: ${validIds}`);
  } else if (config.defaultProfile != null) {
    profile = profiles.find((item) => item.id === config.defaultProfile);
    if (!profile) throw new Error(`defaultProfile not found: ${config.defaultProfile}. Valid profiles: ${validIds}`);
  } else {
    profile = profiles[0];
  }
  if (!profile) throw new Error("scheduled source config has no profiles");
  if (!profile.id || !profile.type || !profile.input) throw new Error("profile requires id, type, and input");
  return profile;
}

function validateProfileId(profileId) {
  if (typeof profileId !== "string") {
    throw new Error(`profile id must be a string safe path segment: ${profileId}`);
  }
  if (!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(profileId)) {
    throw new Error(`profile id must be a safe path segment: ${profileId}`);
  }
  return profileId;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    out[key] = value;
  }
  return out;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function cleanMarkdownValue(value) {
  return String(value ?? "").trim().replace(/^`|`$/g, "").replace(/^\*\*|\*\*$/g, "");
}

function stringValue(value) {
  if (value == null) return null;
  const str = String(value).trim();
  return str ? str : null;
}

function positiveNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function nonNegativeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
}

function durationFromTimestamps(startedMs, finishedValue) {
  const finishedMs = timestamp(finishedValue);
  if (startedMs == null || finishedMs == null || finishedMs <= startedMs) return null;
  return Math.max(1, finishedMs - startedMs);
}

function timestamp(value) {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value > 10_000_000_000 ? value : value * 1000;
  const parsed = Date.parse(String(value).replace(/(\.\d{3})\d+/, "$1"));
  return Number.isFinite(parsed) ? parsed : null;
}

function sumCheckDurations(checks) {
  return checks.reduce((sum, check) => sum + (positiveNumber(check.durationMs) ?? 1000), 0);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeId(value) {
  return String(value ?? "unknown").toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "unknown";
}

function safeSignalValue(value) {
  if (value == null) return null;
  if (typeof value === "number" || typeof value === "boolean") return value;
  const str = String(value).trim();
  if (!str) return null;
  return str.length > 80 ? `${str.slice(0, 77)}...` : str;
}

function safeSignalText(value) {
  const safe = safeSignalValue(value);
  return safe == null ? null : String(safe);
}

function valueLabel(value) {
  const safe = safeSignalValue(value);
  return safe == null ? "unknown" : String(safe);
}

function toRelative(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, "/");
}
