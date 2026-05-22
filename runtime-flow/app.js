const DEFAULT_DATA_URL = "sample-runs.json";
const LANGUAGE_STORAGE_KEY = "agent-dashboard-lang";
const DESIGN_ARTBOARD_WIDTH = 1792;
const RESPONSIVE_BREAKPOINT = 900;

const RUNTIME_COMPONENTS = [
  { key: "intent", number: 1, label: "Intent Parser", labelJa: "意図解析", icon: "◎", sourceHints: ["intent", "入力正規化"] },
  { key: "planner", number: 2, label: "Task Planner", labelJa: "計画", icon: "┬", sourceHints: ["planner", "計画"] },
  { key: "retriever", number: 3, label: "Context Retriever", labelJa: "文脈検索", icon: "▤", sourceHints: ["retriever", "検索", "文脈"] },
  { key: "selector", number: 4, label: "Tool Selector", labelJa: "ツール選択", icon: "⚒", sourceHints: ["tool", "crm", "billing", "source", "api"] },
  { key: "executor", number: 5, label: "Sandbox Executor", labelJa: "実行", icon: "□", sourceHints: ["tool_call", "executor", "実行", "lookup", "check"] },
  { key: "validator", number: 6, label: "Result Validator", labelJa: "検証", icon: "◇", sourceHints: ["verifier", "検証", "validator"] },
  { key: "reflection", number: 7, label: "Reflection Loop", labelJa: "再検討", icon: "↻", sourceHints: ["retry", "再試行", "reflection"] },
  { key: "memory", number: 8, label: "Memory Writer", labelJa: "記録", icon: "◉", sourceHints: ["memory", "history", "context"] },
  { key: "composer", number: 9, label: "Final Composer", labelJa: "応答構成", icon: "▣", sourceHints: ["response", "応答", "composer"] },
];

const APP_LABELS = {
  nav: ["概要", "ワークフロー", "トレース検索", "スパン分析", "異常検知", "ログストリーム", "メトリクス", "設定"],
  workflowOnlyNotice: "図はAIエージェント内部ワークフローのみを表示",
};

const state = {
  data: null,
  error: null,
  selectedWorkflowId: null,
  lang: getInitialLanguage(),
};

function getInitialLanguage() {
  const params = new URLSearchParams(window.location.search);
  const queryLang = params.get("lang");
  if (queryLang === "en" || queryLang === "ja") return queryLang;
  return localStorage.getItem(LANGUAGE_STORAGE_KEY) || "ja";
}

function dataUrlFromLocation() {
  const params = new URLSearchParams(window.location.search);
  const candidate = params.get("data") || params.get("dataUrl");
  if (!candidate) return DEFAULT_DATA_URL;
  const trimmed = candidate.trim();
  if (!trimmed) return DEFAULT_DATA_URL;
  try {
    const url = new URL(trimmed, window.location.href);
    if (url.origin !== window.location.origin) return DEFAULT_DATA_URL;
    if (!url.pathname.toLowerCase().endsWith(".json")) return DEFAULT_DATA_URL;
    return url.href;
  } catch (_) {
    return DEFAULT_DATA_URL;
  }
}

async function loadDashboardData() {
  const response = await fetch(dataUrlFromLocation(), { cache: "no-store" });
  if (!response.ok) throw new Error(`data load failed: ${response.status}`);
  return response.json();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function asNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function compactNumber(value) {
  const num = asNumber(value);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(Math.round(num));
}

function currentWorkflow() {
  const workflows = state.data?.workflows || [];
  return workflows.find((workflow) => workflow.id === state.selectedWorkflowId)
    || workflows.find((workflow) => workflow.id === state.data?.defaultWorkflowId)
    || workflows[0];
}

function workflowIdFromLocation(data) {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("workflow") || params.get("profile");
  const workflows = data?.workflows || [];
  if (!requested) return data?.defaultWorkflowId;
  return workflows.find((workflow) => workflow.id === requested || workflow.scheduler?.profileId === requested)?.id
    || data?.defaultWorkflowId;
}

function schedulerFor(workflow) {
  return workflow?.scheduler || {};
}

function schedulerLabel(workflow, key, fallback = "未設定") {
  const scheduler = schedulerFor(workflow);
  return escapeHtml(scheduler[key] || fallback);
}

function compactTime(value, fallback = "未設定") {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (match) return `${match[2]}/${match[3]} ${match[4]}:${match[5]}`;
  return raw;
}

function statusClass(status) {
  const normalized = String(status || "").toLowerCase();
  if (["error", "critical", "danger", "failed"].some((item) => normalized.includes(item))) return "critical";
  if (["warning", "alert", "progress", "recovering"].some((item) => normalized.includes(item))) return "warning";
  if (["skipped", "unknown", "muted"].some((item) => normalized.includes(item))) return "neutral";
  return "healthy";
}

function statusLabel(status) {
  const klass = statusClass(status);
  return { critical: "異常", warning: "注意", neutral: "未評価", healthy: "正常" }[klass];
}

function deriveRuntimeComponents(workflow) {
  const traceRows = workflow.traceTree || [];
  const spans = workflow.waterfall?.spans || [];
  const evaluations = workflow.evaluations || [];
  const incidentText = [workflow.incident?.title, ...(workflow.hypotheses || []).map((item) => item.title)].join(" ").toLowerCase();
  const worstTool = traceRows.find((row) => /tool|api|lookup|check|source|crm|billing/i.test(row.name) && statusClass(row.status) !== "healthy")
    || traceRows.find((row) => statusClass(row.status) === "critical")
    || traceRows.find((row) => statusClass(row.status) === "warning");

  return RUNTIME_COMPONENTS.map((component, index) => {
    const row = findMatchingTraceRow(traceRows, component);
    const span = findMatchingSpan(spans, component, index);
    const statusSource = row?.status || span?.status || "success";
    let klass = statusClass(statusSource);

    if (component.key === "selector" && /tool|api|5xx|timeout|タイムアウト|遅延|呼び出し/i.test(incidentText)) klass = "critical";
    if (component.key === "executor" && /timeout|タイムアウト|遅延/i.test(incidentText)) klass = klass === "healthy" ? "warning" : klass;
    if (component.key === "reflection" && totalRetries(traceRows) > 0) klass = "warning";
    if (component.key === "validator" && evaluations.some((item) => asNumber(item.score) < asNumber(item.baseline) - 0.15)) klass = klass === "healthy" ? "warning" : klass;

    const durationMs = durationToMs(row?.duration || span?.duration) || estimatedDuration(workflow, index);
    const retries = component.key === "reflection" ? totalRetries(traceRows) : asNumber(row?.retries, index === 3 ? 1 : 0);
    const successRate = clamp(99.4 - (klass === "critical" ? 11.2 : klass === "warning" ? 3.4 : 0.7) - retries * 0.6, 82, 99.8);
    const sourceName = row?.name || span?.label || component.label;

    return {
      ...component,
      status: klass,
      statusLabel: statusLabel(klass),
      durationMs,
      retries,
      successRate,
      sourceName,
      highlighted: worstTool && row?.id === worstTool.id,
    };
  });
}

function findMatchingTraceRow(rows, component) {
  const componentRows = rows.filter((row) => !["session", "trace"].includes(String(row.id || "").toLowerCase()));
  return componentRows.find((row) => component.sourceHints.some((hint) => String(row.id || "").toLowerCase().includes(hint.toLowerCase()) || String(row.name || "").toLowerCase().includes(hint.toLowerCase())));
}

function findMatchingSpan(spans, component) {
  return spans.find((span) => component.sourceHints.some((hint) => String(span.id || "").toLowerCase().includes(hint.toLowerCase()) || String(span.label || "").toLowerCase().includes(hint.toLowerCase())));
}

function durationToMs(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const number = asNumber(raw);
  if (/s\b|秒/.test(raw) && !/ms/.test(raw)) return number * 1000;
  return number;
}

function estimatedDuration(workflow, index) {
  const base = asNumber(workflow.trace?.durationMs, 9000) / 18;
  return Math.round(base + index * 47);
}

function totalRetries(rows) {
  return rows.reduce((sum, row) => sum + asNumber(row.retries, 0), 0);
}

function riskScore(workflow, components) {
  const decision = workflow.reliabilityDecision;
  if (decision?.level === "critical") return 72;
  if (decision?.level === "alert") return 84;
  const criticalCount = components.filter((item) => item.status === "critical").length;
  const warningCount = components.filter((item) => item.status === "warning").length;
  return clamp(96 - criticalCount * 14 - warningCount * 5, 55, 99);
}

function buildAnomalyEvents(workflow, components) {
  const logs = workflow.logs || [];
  const primaryComponent = components.find((item) => item.status === "critical") || components.find((item) => item.status === "warning") || components[3];
  const events = logs.slice(0, 5).map((log, index) => ({
    time: log.time,
    level: log.level === "ERROR" ? "異常" : log.level === "WARN" ? "注意" : "情報",
    component: sourceToComponent(log.source, primaryComponent),
    event: log.message,
    impact: log.level === "ERROR" ? "高" : log.level === "WARN" ? "中" : "低",
    duration: index === 0 ? "継続中" : `${12 + index * 3}分前`,
    traceCount: index === 0 ? workflow.incident?.affectedSessions || "1,842" : 217 + index * 104,
    status: index <= 2 ? "継続中" : "抑制済み",
  }));
  if (events.length >= 5) return events;
  return [
    ...events,
    { time: "14:32:11", level: "異常", component: primaryComponent.label, event: `${primaryComponent.label}でHTTP 5xx増加`, impact: "高", duration: "12分34秒", traceCount: "1,842", status: "継続中" },
    { time: "14:26:03", level: "注意", component: "Sandbox Executor", event: "実行時間が閾値を超過", impact: "中", duration: "6分21秒", traceCount: "732", status: "継続中" },
    { time: "14:15:47", level: "注意", component: "Context Retriever", event: "検索結果ゼロ率の上昇", impact: "中", duration: "18分52秒", traceCount: "521", status: "継続中" },
  ].slice(0, 5);
}

function sourceToComponent(source, fallback) {
  const text = String(source || "").toLowerCase();
  if (/search|retriev|vector|source/.test(text)) return "Context Retriever";
  if (/tool|api|crm|billing|customer|policy/.test(text)) return "Tool Selector";
  if (/verif|valid|eval/.test(text)) return "Result Validator";
  if (/planner/.test(text)) return "Task Planner";
  return fallback.label;
}

function buildClusters(workflow) {
  const hypotheses = workflow.hypotheses || [];
  return [
    { name: "HTTP 5xx（外部API）", count: asNumber(workflow.incident?.affectedSessions, 1842), impact: "高", trend: "spark-up" },
    { name: "タイムアウト", count: Math.round(asNumber(workflow.incident?.affectedSessions, 732) * 0.39), impact: "中", trend: "spark-warn" },
    { name: hypotheses[1]?.title || "検索結果なし", count: 521, impact: "中", trend: "spark-warn" },
    { name: "バリデーション失敗", count: 314, impact: "低", trend: "spark-ok" },
    { name: "レート制限（429）", count: 217, impact: "低", trend: "spark-ok" },
  ];
}

function renderApp() {
  const data = state.data;
  const workflow = currentWorkflow();
  if (!data || !workflow) return renderError("表示するワークフローがありません");

  const components = deriveRuntimeComponents(workflow);
  const score = riskScore(workflow, components);
  const critical = components.find((item) => item.status === "critical") || components.find((item) => item.status === "warning") || components[0];
  const events = buildAnomalyEvents(workflow, components);
  const clusters = buildClusters(workflow);

  document.title = "Agent Workflow Reliability Dashboard";
  document.getElementById("app").innerHTML = `
    <div class="dashboard-viewport">
      <div class="dashboard-shell">
        ${renderTopbar(workflow, score)}
        ${renderSidebar(data, workflow)}
        <main class="dashboard-main">
          <div class="dashboard-content">
            <section class="workspace">
              <div class="page-title-row">
                <div>
                  <p class="eyebrow">Agent Runtime Flow</p>
                  <h1>AIエージェント内部構成</h1>
                </div>
                <div class="runtime-note">${APP_LABELS.workflowOnlyNotice}</div>
              </div>
              ${renderSchedulerSwitcher(data, workflow)}
              ${renderSchedulerBridge(workflow)}
              ${renderRuntimeFlow(components)}
              <div class="panel-grid panel-grid--two">
                ${renderAnomalyEvents(events)}
                ${renderErrorClusters(clusters)}
              </div>
              <div class="panel-grid panel-grid--three">
                ${renderLatencyPanel(workflow)}
                ${renderTokenCostPanel(workflow)}
                ${renderComponentHealth(components)}
              </div>
            </section>
            <aside class="insight-rail">
              ${renderAnomalySummary(workflow, score)}
              ${renderFailedSpan(workflow, critical)}
              ${renderRootCause(workflow)}
              ${renderSchedulerRail(workflow)}
              ${renderTechnicalChecks(critical)}
            </aside>
          </div>
        </main>
      </div>
    </div>
  `;

  bindInteractions();
  syncArtboardScale();
}

function syncArtboardScale() {
  const viewport = document.querySelector(".dashboard-viewport");
  const shell = document.querySelector(".dashboard-shell");
  if (!viewport || !shell) return;

  if (window.innerWidth <= RESPONSIVE_BREAKPOINT) {
    viewport.style.removeProperty("--artboard-scale");
    viewport.style.removeProperty("width");
    viewport.style.removeProperty("height");
    return;
  }

  const scale = Math.min(1, window.innerWidth / DESIGN_ARTBOARD_WIDTH);
  viewport.style.setProperty("--artboard-scale", String(scale));
  viewport.style.width = `${Math.round(DESIGN_ARTBOARD_WIDTH * scale)}px`;
  viewport.style.height = `${Math.round(shell.scrollHeight * scale)}px`;
}

function renderSidebar(data, workflow) {
  const navItems = APP_LABELS.nav.map((label, index) => `
    <button class="side-nav__item ${index === 0 ? "is-active" : ""}" type="button">
      <span class="side-nav__icon">${["⌂", "⌘", "⌕", "⌁", "△", "▤", "▧", "⚙"][index]}</span>
      <span>${escapeHtml(label)}</span>
    </button>
  `).join("");

  return `
    <aside class="sidebar" aria-label="main navigation">
      <div class="brand-block">
        <div class="brand-title">Agent Ops</div>
        <div class="brand-subtitle">Reliability</div>
      </div>
      <nav class="side-nav">${navItems}</nav>
      <div class="sidebar-card">
        <span class="small-label">エージェント</span>
        <strong>${escapeHtml(workflow.name)}</strong>
        <span class="status-dot status-dot--healthy"></span><span>稼働中</span>
      </div>
      <div class="sidebar-card sidebar-card--compact">
        <span class="small-label">インスタンス</span>
        <strong>${(data.workflows || []).length * 17} / ${(data.workflows || []).length * 20} 稼働中</strong>
      </div>
      <div class="sidebar-card sidebar-card--compact">
        <span class="small-label">取り込みprofile</span>
        <strong>${schedulerLabel(workflow, "profileId", workflow.id)}</strong>
        <span>${schedulerLabel(workflow, "cadence", "定期実行")}</span>
      </div>
      <button class="settings-button" type="button">⚙ 設定を開く</button>
    </aside>
  `;
}

function renderTopbar(workflow, score) {
  const workflowOptions = (state.data?.workflows || []).map((item) => `
    <option value="${escapeHtml(item.id)}" ${item.id === workflow.id ? "selected" : ""}>${escapeHtml(item.name)}</option>
  `).join("");

  return `
    <header class="topbar">
      <div class="topbar__title">
        <h2>Agent Workflow Reliability Dashboard</h2>
        <p>AIエージェント内部の実行健全性を監視</p>
      </div>
      <div class="topbar__controls">
        <label class="search-box"><span>⌕</span><input aria-label="search" value="検索（コンポーネント / トレースID）"></label>
        <select id="workflowSelect" class="top-select" aria-label="scheduled program select">${workflowOptions}</select>
        <span class="top-pill top-pill--env"><span class="top-pill__label">環境：</span><strong class="top-pill__value">${escapeHtml(workflow.environment)}</strong></span>
        <span class="top-pill top-pill--window"><span class="top-pill__label">時間範囲：</span><strong class="top-pill__value">${escapeHtml(workflow.window)}</strong></span>
        <span class="top-pill top-pill--source"><span class="top-pill__label">入力：</span><strong class="top-pill__value">${schedulerLabel(workflow, "sourceType", "dashboard-json")}</strong></span>
        <span class="system-health ${score < 80 ? "is-risk" : ""}"><span class="dot"></span><span class="system-health__text"><span class="system-health__label">システム健全性</span><strong>${score < 80 ? "要注意" : "良好"}</strong></span></span>
        <button class="icon-button" type="button" aria-label="notification">♢</button>
        <button class="icon-button" type="button" aria-label="help">?</button>
      </div>
    </header>
  `;
}

function renderSchedulerSwitcher(data, workflow) {
  const workflows = data.workflows || [];
  const cards = workflows.map((item) => {
    const scheduler = schedulerFor(item);
    const selected = item.id === workflow.id;
    const health = statusClass(item.reliabilityDecision?.level || item.incident?.status);
    return `
      <button class="program-card ${selected ? "is-selected" : ""}" type="button" data-workflow-id="${escapeHtml(item.id)}">
        <span class="program-card__status program-card__status--${health}">${statusLabel(health)}</span>
        <strong>${escapeHtml(item.name)}</strong>
        <span class="program-card__task">${escapeHtml(scheduler.taskName || scheduler.profileId || item.id)}</span>
        <span class="program-card__meta">最新 ${escapeHtml(compactTime(scheduler.lastRunAt || item.incident?.started, "latest"))}</span>
        <span class="program-card__meta">次回 ${escapeHtml(compactTime(scheduler.nextRunAt, scheduler.cadence || "profile実行時"))}</span>
      </button>
    `;
  }).join("");

  return `
    <section class="card scheduler-switcher" aria-label="scheduled program switcher">
      <div class="switcher-heading">
        <div>
          <h3>定期実行プログラム切替</h3>
          <p>Task Scheduler のprofileを差し替えるだけで別runを表示</p>
        </div>
        <div class="switcher-count"><strong>${workflows.length}</strong><span>programs</span></div>
      </div>
      <div class="program-card-list">${cards}</div>
    </section>
  `;
}

function renderSchedulerBridge(workflow) {
  const scheduler = schedulerFor(workflow);
  const steps = [
    ["1", "Task Scheduler", scheduler.taskName || "scheduled task"],
    ["2", "Run Artifact", scheduler.inputMode || scheduler.sourceType || "json / markdown"],
    ["3", "Profile Adapter", scheduler.profileId || workflow.id],
    ["4", "Dashboard JSON", scheduler.outputTarget || "sample-runs.json"],
  ];

  return `
    <section class="card scheduler-bridge">
      <div class="bridge-copy">
        <span class="small-label">実行データ接続準備</span>
        <h3>実タスクスケジューラへ移せる取り込みフロー</h3>
        <p>定期実行ごとに出力されるhealth artifactをprofileで正規化し、同じUI schemaへ変換します。</p>
      </div>
      <div class="bridge-steps">
        ${steps.map(([number, title, meta]) => `
          <div class="bridge-step">
            <span>${number}</span>
            <strong>${escapeHtml(title)}</strong>
            <em>${escapeHtml(meta)}</em>
          </div>
        `).join("")}
      </div>
      <dl class="bridge-meta">
        <div><dt>trigger</dt><dd>${escapeHtml(scheduler.trigger || scheduler.cadence || "manual / scheduled")}</dd></div>
        <div><dt>history</dt><dd>${escapeHtml(scheduler.historyStore || "safe summary")}</dd></div>
        <div><dt>adapter</dt><dd>${escapeHtml(scheduler.adapter || "scheduled-source-profile")}</dd></div>
      </dl>
    </section>
  `;
}

function renderRuntimeFlow(components) {
  return `
    <section class="card runtime-card">
      <div class="card-header card-header--plain">
        <div>
          <h3>Agent Runtime Flow</h3>
          <p>AI内部の依存関係・リトライ・遅延・失敗だけを監視</p>
        </div>
        <div class="legend">
          <span><i class="legend-dot healthy"></i>正常</span>
          <span><i class="legend-dot warning"></i>注意</span>
          <span><i class="legend-dot critical"></i>異常</span>
          <span><i class="legend-line"></i>正常フロー</span>
          <span><i class="legend-line legend-line--dash"></i>リトライ / 代替パス</span>
        </div>
      </div>
      <div class="flow-map" aria-label="AI agent internal runtime flow">
        ${renderFlowSvg()}
        ${components.map(renderRuntimeNode).join("")}
      </div>
    </section>
  `;
}

function renderFlowSvg() {
  return `
    <svg class="flow-lines" viewBox="0 0 1120 450" aria-hidden="true" focusable="false">
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L9,3 z" fill="#1d67d8" fill-opacity="0.9"></path>
        </marker>
      </defs>
      <path d="M102 130 H260 H428 H596 H764 H922" class="flow-path" marker-end="url(#arrow)"></path>
      <path d="M928 145 C982 145 1012 177 1012 230" class="flow-path flow-path--dash" marker-end="url(#arrow)"></path>
      <path d="M1006 318 H780 C744 318 744 292 744 276 C744 252 725 244 696 244 H602 H480" class="flow-path" marker-end="url(#arrow)"></path>
      <path d="M390 236 C392 204 438 196 484 196 H566 C602 196 624 174 626 150" class="flow-path flow-path--dash" marker-end="url(#arrow)"></path>
      <path d="M604 238 C604 210 660 198 710 198 H748 C776 198 794 176 796 150" class="flow-path flow-path--dash" marker-end="url(#arrow)"></path>
    </svg>
  `;
}

function renderRuntimeNode(component) {
  return `
    <article class="runtime-node runtime-node--${component.key} runtime-node--${component.status} ${component.highlighted ? "is-highlighted" : ""}">
      <div class="node-badge">${component.number}</div>
      <div class="node-title">${escapeHtml(component.label)}</div>
      <div class="node-icon" aria-hidden="true">${escapeHtml(component.icon)}</div>
      <div class="node-metric ${component.status === "critical" ? "is-critical" : ""}">${component.durationMs >= 1000 ? `${(component.durationMs / 1000).toFixed(2)}s` : `${Math.round(component.durationMs)}ms`}</div>
      <div class="node-sub"><span class="status-dot status-dot--${component.status}"></span>成功率 ${component.successRate.toFixed(1)}%</div>
      <div class="node-sub">再試行 ${component.retries}</div>
    </article>
  `;
}

function renderAnomalyEvents(events) {
  return `
    <section class="card data-panel data-panel--wide">
      <div class="panel-title panel-title--navy"><span>△</span><h3>異常イベント</h3><a href="#">すべて表示</a></div>
      <table class="data-table anomaly-table">
        <thead><tr><th>発生時刻</th><th>レベル</th><th>コンポーネント</th><th>イベント</th><th>影響</th><th>継続時間</th><th>トレース数</th><th>ステータス</th></tr></thead>
        <tbody>${events.map((event) => `
          <tr>
            <td data-label="発生時刻">${escapeHtml(event.time)}</td>
            <td data-label="レベル"><span class="severity severity--${event.level === "異常" ? "critical" : event.level === "注意" ? "warning" : "info"}">${escapeHtml(event.level)}</span></td>
            <td data-label="コンポーネント">${escapeHtml(event.component)}</td>
            <td data-label="イベント">${escapeHtml(event.event)}</td>
            <td data-label="影響">${escapeHtml(event.impact)}</td>
            <td data-label="継続時間">${escapeHtml(event.duration)}</td>
            <td data-label="トレース数">${escapeHtml(event.traceCount)}</td>
            <td data-label="ステータス"><span class="state-pill ${event.status === "継続中" ? "state-pill--live" : ""}">${escapeHtml(event.status)}</span></td>
          </tr>
        `).join("")}</tbody>
      </table>
    </section>
  `;
}

function renderErrorClusters(clusters) {
  return `
    <section class="card data-panel">
      <div class="panel-title panel-title--navy"><span>☷</span><h3>エラークラスタ</h3><a href="#">詳細</a></div>
      <table class="data-table cluster-table">
        <thead><tr><th>クラスタ</th><th>件数</th><th>影響</th><th>トレンド</th></tr></thead>
        <tbody>${clusters.map((cluster) => `
          <tr>
            <td data-label="クラスタ">${escapeHtml(cluster.name)}</td>
            <td data-label="件数">${compactNumber(cluster.count)}</td>
            <td data-label="影響"><span class="impact impact--${cluster.impact === "高" ? "high" : cluster.impact === "中" ? "medium" : "low"}">${escapeHtml(cluster.impact)}</span></td>
            <td data-label="トレンド">${renderSpark(cluster.trend)}</td>
          </tr>
        `).join("")}</tbody>
      </table>
      <a class="table-link" href="#">すべてのクラスタを表示</a>
    </section>
  `;
}

function renderLatencyPanel(workflow) {
  const history = workflow.history || [];
  return `
    <section class="card metric-panel">
      <div class="card-subheader"><h3>レイテンシ（P50 / P95 / P99）</h3><a href="#">詳細</a></div>
      <svg class="line-chart" viewBox="0 0 320 140" aria-label="latency trend">
        <g class="chart-grid"><line x1="20" y1="110" x2="300" y2="110"/><line x1="20" y1="72" x2="300" y2="72"/><line x1="20" y1="34" x2="300" y2="34"/></g>
        <path class="chart-line chart-line--p99" d="M20 94 C55 72 78 98 102 84 S150 68 172 54 S225 72 245 42 S284 54 300 25"/>
        <path class="chart-line chart-line--p95" d="M20 104 C55 92 78 108 102 98 S150 88 172 78 S225 90 245 66 S284 74 300 52"/>
        <path class="chart-line chart-line--p50" d="M20 116 C55 110 78 119 102 112 S150 105 172 102 S225 105 245 98 S284 96 300 86"/>
      </svg>
      <div class="chart-legend"><span class="p99">P99</span><span class="p95">P95</span><span class="p50">P50</span><strong>${escapeHtml(history[0]?.time || "latest")}</strong></div>
    </section>
  `;
}

function renderTokenCostPanel(workflow) {
  const tokens = asNumber(workflow.trace?.tokens, 45670000);
  const cost = asNumber(workflow.trace?.costUsd, 128.34);
  return `
    <section class="card metric-panel cost-panel">
      <div class="card-subheader"><h3>トークンコスト</h3><a href="#">詳細</a></div>
      <div class="cost-layout">
        <div>
          <span class="small-label">合計トークン数</span>
          <strong>${compactNumber(tokens * 3600)}</strong><em>+12.6%</em>
          <span class="small-label">総コスト（USD）</span>
          <strong>$${Math.max(cost * 1440, 128.34).toFixed(2)}</strong><em>+9.8%</em>
        </div>
        <div class="donut" aria-label="token cost ratio"></div>
      </div>
    </section>
  `;
}

function renderComponentHealth(components) {
  return `
    <section class="card metric-panel health-bars">
      <div class="card-subheader"><h3>コンポーネント健全性</h3><a href="#">詳細</a></div>
      ${components.map((item) => `
        <div class="health-row">
          <span>${escapeHtml(item.label)}</span>
          <div class="bar"><i class="bar-fill bar-fill--${item.status}" style="width:${item.successRate}%"></i></div>
          <strong>${item.successRate.toFixed(1)}%</strong>
        </div>
      `).join("")}
    </section>
  `;
}

function renderAnomalySummary(workflow, score) {
  return `
    <section class="card rail-card rail-card--summary">
      <div class="rail-title"><h3>異常検知サマリー <span class="info-dot">i</span></h3><a href="#">詳細</a></div>
      <div class="summary-grid">
        <div class="summary-tile summary-tile--score"><span>影響スコア</span><strong class="risk-number">${score}</strong><em>/100</em><b>${score < 80 ? "高リスク" : "監視中"}</b></div>
        <div class="summary-tile"><span>異常スパン</span><strong>${workflow.incident?.impactedWorkflows || 27}</strong></div>
        <div class="summary-tile"><span>影響トレース数</span><strong>${escapeHtml(workflow.incident?.affectedSessions || "1,842")}</strong></div>
        <div class="summary-tile"><span>エラー率</span><strong>${(asNumber(workflow.history?.[0]?.errorRate, 5.84)).toFixed(2)}%</strong><em class="down">+2.21pt</em></div>
        <div class="summary-tile"><span>タイムアウト率</span><strong>1.21%</strong><em>↓ 0.35pt</em></div>
      </div>
    </section>
  `;
}

function renderFailedSpan(workflow, component) {
  return `
    <section class="card rail-card failed-span">
      <div class="rail-title"><h3>失敗スパン</h3><a href="#">詳細</a></div>
      <div class="failed-box">
        <span class="severity severity--critical">異常</span>
        <strong>${escapeHtml(component.label)}でHTTP 5xx増加</strong>
        <dl>
          <dt>スパンID</dt><dd>spn_${component.key}_7f3a2b9e1c44a2d1</dd>
          <dt>コンポーネント</dt><dd>${escapeHtml(component.label)}</dd>
          <dt>開始時刻</dt><dd>${escapeHtml(workflow.incident?.started || "14:32:11")}</dd>
          <dt>時間</dt><dd>${component.durationMs >= 1000 ? `${(component.durationMs / 1000).toFixed(2)}s` : `${Math.round(component.durationMs)}ms`}（P95）</dd>
          <dt>エラー率</dt><dd>${(100 - component.successRate).toFixed(1)}%</dd>
          <dt>主なエラー</dt><dd>${escapeHtml(workflow.logs?.find((log) => log.level === "ERROR")?.message || "HTTP 503 Service Unavailable")}</dd>
        </dl>
        <a href="#">トレースを確認</a>
      </div>
    </section>
  `;
}

function renderRootCause(workflow) {
  const items = (workflow.hypotheses || []).slice(0, 3);
  return `
    <section class="card rail-card">
      <div class="rail-title"><h3>根本原因候補 <span class="ai-badge">AI</span></h3><a href="#">詳細</a></div>
      <ol class="root-list">
        ${items.map((item) => `<li><span>${item.rank}</span><strong>${escapeHtml(item.title)}</strong><em>確信度 ${(item.score * 100).toFixed(0)}%</em></li>`).join("")}
      </ol>
    </section>
  `;
}

function renderSchedulerRail(workflow) {
  const scheduler = schedulerFor(workflow);
  return `
    <section class="card rail-card scheduler-rail">
      <div class="rail-title"><h3>Scheduler 接続情報</h3><a href="#">詳細</a></div>
      <dl>
        <div><dt>profile</dt><dd>${escapeHtml(scheduler.profileId || workflow.id)}</dd></div>
        <div><dt>task</dt><dd>${escapeHtml(scheduler.taskName || "未接続")}</dd></div>
        <div><dt>source</dt><dd>${escapeHtml(scheduler.sourceType || "dashboard-json")}</dd></div>
        <div><dt>latest</dt><dd>${escapeHtml(compactTime(scheduler.lastRunAt || workflow.incident?.started, "latest"))}</dd></div>
        <div><dt>next</dt><dd>${escapeHtml(compactTime(scheduler.nextRunAt, scheduler.cadence || "profile実行時"))}</dd></div>
      </dl>
    </section>
  `;
}

function renderTechnicalChecks(component) {
  const checks = [
    `${component.label}の外部API可用性を確認`,
    "関連サービスのエラーレートを確認",
    "直近のデプロイ差分を確認",
    "Feature Flag / 設定変更を確認",
    "ネットワークレイテンシを確認",
  ];
  return `
    <section class="card rail-card">
      <div class="rail-title"><h3>技術確認項目</h3><a href="#">詳細</a></div>
      <ul class="check-list">
        ${checks.map((check) => `<li><span>✓</span>${escapeHtml(check)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderSpark(kind) {
  const klass = kind.includes("up") ? "spark--red" : kind.includes("warn") ? "spark--amber" : "spark--green";
  return `<svg class="spark ${klass}" viewBox="0 0 92 22" aria-hidden="true"><polyline points="2,16 12,12 22,15 32,8 42,13 52,10 62,14 72,7 90,5"/></svg>`;
}

function bindInteractions() {
  document.getElementById("workflowSelect")?.addEventListener("change", (event) => {
    selectWorkflow(event.target.value);
  });
  document.querySelectorAll("[data-workflow-id]").forEach((button) => {
    button.addEventListener("click", () => selectWorkflow(button.dataset.workflowId));
  });
}

function selectWorkflow(workflowId) {
  if (!workflowId || workflowId === state.selectedWorkflowId) return;
  state.selectedWorkflowId = workflowId;
  const url = new URL(window.location.href);
  url.searchParams.set("workflow", workflowId);
  window.history.replaceState(null, "", url);
  renderApp();
}

window.addEventListener("resize", syncArtboardScale);

function renderError(message) {
  document.getElementById("app").innerHTML = `
    <div class="dashboard-error">
      <div class="card error-card">
        <h1>Dashboard load failed</h1>
        <p>${escapeHtml(message)}</p>
      </div>
    </div>
  `;
}

async function init() {
  try {
    state.data = await loadDashboardData();
    state.selectedWorkflowId = workflowIdFromLocation(state.data);
    renderApp();
  } catch (error) {
    state.error = error;
    console.error(error);
    renderError("sample-runs.json を読み込めませんでした。ローカルサーバー経由で開いてください。");
  }
}

init();
