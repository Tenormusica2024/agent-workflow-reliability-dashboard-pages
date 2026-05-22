import fs from "node:fs";
import path from "node:path";

const HISTORY_SCHEMA_VERSION = "scheduled-run-history.v0.1";

export function attachRunHistory({ workflow, storePath, limit = 20, disabled = false }) {
  if (disabled) {
    return {
      enabled: false,
      recordCount: 0,
      attached: false,
    };
  }

  const maxRecords = normalizeLimit(limit);
  const record = historyRecordFromWorkflow(workflow);
  const store = loadStore(storePath, workflow.id);
  const records = upsertRecord(store.records, record)
    .slice(0, maxRecords);

  writeStore(storePath, {
    schemaVersion: HISTORY_SCHEMA_VERSION,
    workflowId: workflow.id,
    updatedAt: new Date().toISOString(),
    records,
  });

  const history = recordsToHistory(records);
  if (history.length >= 2) workflow.history = history;

  return {
    enabled: true,
    recordCount: records.length,
    attached: history.length >= 2,
  };
}

function historyRecordFromWorkflow(workflow) {
  const started = String(workflow.incident?.started ?? new Date().toISOString());
  const runId = String(workflow.trace?.traceId ?? `${workflow.id}_${started}`);
  const logs = Array.isArray(workflow.logs) ? workflow.logs : [];
  const errorCount = logs.filter((log) => String(log.level).toUpperCase() === "ERROR").length;
  const payloadErrorRate = nonNegativeNumberOrNull(workflow.payload?.latest_error_rate);
  const errorRate = payloadErrorRate ?? (logs.length > 0 ? Number(((errorCount / logs.length) * 8).toFixed(1)) : 0);

  return {
    runId,
    time: started,
    affectedSessions: nonNegativeNumber(workflow.incident?.affectedSessions),
    sloBurn: nonNegativeNumber(workflow.incident?.sloBurn),
    durationMs: Math.max(1, nonNegativeNumber(workflow.trace?.durationMs)),
    errorRate,
    status: String(workflow.incident?.status ?? "unknown"),
  };
}

function loadStore(storePath, workflowId) {
  if (!fs.existsSync(storePath)) {
    return {
      schemaVersion: HISTORY_SCHEMA_VERSION,
      workflowId,
      records: [],
    };
  }
  const data = JSON.parse(fs.readFileSync(storePath, "utf8").replace(/^\uFEFF/, ""));
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`${storePath}: scheduled run history store must be an object`);
  }
  if (data.workflowId && data.workflowId !== workflowId) {
    throw new Error(`${storePath}: workflowId mismatch (${data.workflowId} !== ${workflowId})`);
  }
  return {
    schemaVersion: data.schemaVersion ?? HISTORY_SCHEMA_VERSION,
    workflowId,
    records: Array.isArray(data.records) ? data.records.map(normalizeRecord).filter(Boolean) : [],
  };
}

function upsertRecord(records, record) {
  const byId = new Map();
  for (const item of records) byId.set(item.runId, item);
  byId.set(record.runId, record);
  return Array.from(byId.values())
    .sort((a, b) => timestamp(b.time) - timestamp(a.time));
}

function recordsToHistory(records) {
  return records.map((record, index) => ({
    label: index === 0 ? "最新run" : `run-${index}`,
    time: record.time,
    affectedSessions: record.affectedSessions,
    sloBurn: record.sloBurn,
    durationMs: record.durationMs,
    errorRate: record.errorRate,
    status: record.status,
  }));
}

function writeStore(storePath, store) {
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  const tmpPath = `${storePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  fs.renameSync(tmpPath, storePath);
}

function normalizeRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  const runId = String(record.runId ?? "").trim();
  const time = String(record.time ?? "").trim();
  if (!runId || !time) return null;
  return {
    runId,
    time,
    affectedSessions: nonNegativeNumber(record.affectedSessions),
    sloBurn: nonNegativeNumber(record.sloBurn),
    durationMs: Math.max(1, nonNegativeNumber(record.durationMs)),
    errorRate: nonNegativeNumber(record.errorRate),
    status: String(record.status ?? "unknown"),
  };
}

function nonNegativeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
}

function nonNegativeNumberOrNull(value) {
  if (value == null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

function normalizeLimit(value) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 2) return 20;
  return Math.min(numeric, 200);
}

function timestamp(value) {
  const parsed = Date.parse(String(value ?? "").replace(/(\.\d{3})\d+/, "$1"));
  return Number.isFinite(parsed) ? parsed : 0;
}
