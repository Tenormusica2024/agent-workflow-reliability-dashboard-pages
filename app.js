const DATA_URL = "sample-runs.json";
const LANGUAGE_STORAGE_KEY = "awrd-language";
const DEFAULT_LANGUAGE = "ja";

const UI = {
  ja: {
    documentTitle: "エージェント実行トリアージ",
    appTitle: "エージェント実行トリアージ",
    navAria: "主要メニュー",
    settings: "設定",
    help: "ヘルプ",
    collapse: "折りたたむ",
    filtersAria: "表示条件",
    workflowLabel: "ワークフロー",
    addFilter: "フィルター追加",
    confidenceLabel: "原因推定",
    incidentAria: "インシデント概要",
    incident: "インシデント",
    impactedWorkflows: "影響ワークフロー",
    affectedSessions: "影響セッション",
    sloBurn: "SLO消費",
    started: "開始",
    status: "状態",
    details: "詳細",
    viewDetails: "詳細を見る",
    historyTitle: "実行履歴・過去run比較",
    historySubtitle: "直近4回 / 7日基準との差分",
    historyLatest: "最新run",
    historyPrevious: "前回比",
    historySlo: "SLO消費",
    historyDuration: "p95時間",
    historyAffected: "影響",
    historyErrorRate: "エラー率",
    historyRecovered: "改善",
    historyWorse: "悪化",
    historyStable: "横ばい",
    traceTree: "トレースツリー",
    tracePath: "Session → Trace → Spans",
    searchSpans: "スパン検索",
    name: "名前",
    state: "状態",
    durationMs: "時間(ms)",
    provider: "Model / Provider",
    retries: "再試行",
    tokensCost: "Tokens / Cost",
    totalTrace: "Total (trace)",
    waterfall: "トレース・ウォーターフォール",
    viewWaterfall: "表示: Waterfall",
    groupNone: "Group: None",
    success: "成功",
    warning: "警告",
    error: "エラー",
    inProgress: "処理中",
    skipped: "スキップ",
    dependency: "依存関係",
    rcaAssistant: "原因推定アシスタント",
    beta: "BETA",
    topHypotheses: "上位仮説（順位つき）",
    viewAllHypotheses: "すべての仮説を見る",
    recommendedNextAction: "推奨される次の対応",
    why: "なぜ？ 複数セッションで広く影響があり、信頼度が高いため。",
    payload: "ツール入力（秘匿済み）",
    redactionRules: "秘匿ルール",
    configure: "設定",
    payloadFootnote: "入力値は自動的に秘匿されます。詳細ルールは設定で管理します。",
    evaluations: "評価（トレース単位）",
    compare7d: "比較: 7日基準",
    evaluator: "評価項目",
    score: "Score",
    baseline7d: "7日基準",
    delta: "Delta",
    impact: "影響",
    viewAllEvaluations: "すべての評価を見る",
    replay: "再実行",
    replayBody: "このトレースを隔離環境で再実行します。",
    model: "モデル",
    tools: "ツール",
    includeToolResponses: "ツール応答を含める",
    replayTrace: "トレースを再実行",
    openPlayground: "プレイグラウンドで開く",
    logsTitle: "関連ログとエラー",
    viewExplorer: "Explorerで表示",
    errors: "Errors",
    logs: "Logs",
    time: "時刻",
    level: "Level",
    source: "Source",
    message: "Message",
    viewAllLogs: "すべてのログを見る",
    loadErrorTitle: "データを読み込めませんでした",
    loadErrorHelp: "ローカル確認では npm run serve を使ってください。",
    languageAria: "言語切り替え",
    ja: "日本語",
    en: "English",
  },
  en: {
    documentTitle: "Agent Trace Triage Console",
    appTitle: "Agent Trace Triage Console",
    navAria: "main navigation",
    settings: "Settings",
    help: "Help",
    collapse: "Collapse",
    filtersAria: "display filters",
    workflowLabel: "Workflow",
    addFilter: "Add filter",
    confidenceLabel: "RCA confidence",
    incidentAria: "incident summary",
    incident: "Incident",
    impactedWorkflows: "Impacted workflows",
    affectedSessions: "Affected sessions",
    sloBurn: "SLO burn",
    started: "Started",
    status: "Status",
    details: "View",
    viewDetails: "View incident",
    historyTitle: "Run History & Comparison",
    historySubtitle: "Last 4 runs / 7d baseline delta",
    historyLatest: "Latest run",
    historyPrevious: "vs previous",
    historySlo: "SLO burn",
    historyDuration: "p95 duration",
    historyAffected: "Affected",
    historyErrorRate: "Error rate",
    historyRecovered: "Recovered",
    historyWorse: "Worse",
    historyStable: "Stable",
    traceTree: "Trace Tree",
    tracePath: "Session → Trace → Spans",
    searchSpans: "Search spans",
    name: "Name",
    state: "Status",
    durationMs: "Dur (ms)",
    provider: "Model / Provider",
    retries: "Retries",
    tokensCost: "Tokens / Cost",
    totalTrace: "Total (trace)",
    waterfall: "Trace Waterfall",
    viewWaterfall: "View: Waterfall",
    groupNone: "Group: None",
    success: "Success",
    warning: "Warning",
    error: "Error",
    inProgress: "In Progress",
    skipped: "Skipped",
    dependency: "Dependency",
    rcaAssistant: "Root Cause Assistant",
    beta: "BETA",
    topHypotheses: "Top hypotheses (ranked)",
    viewAllHypotheses: "View all hypotheses",
    recommendedNextAction: "Recommended next action",
    why: "Why? High confidence and broad impact across sessions.",
    payload: "Tool Call Payload (Redacted)",
    redactionRules: "Redaction rules",
    configure: "Configure",
    payloadFootnote: "Payload is automatically redacted. Configure rules in settings.",
    evaluations: "Evaluations (Trace Level)",
    compare7d: "Compare: 7d baseline",
    evaluator: "Evaluator",
    score: "Score",
    baseline7d: "7d baseline",
    delta: "Delta",
    impact: "Impact",
    viewAllEvaluations: "View all evaluations",
    replay: "Replay",
    replayBody: "This will replay the trace in a sandbox environment.",
    model: "Model",
    tools: "Tools",
    includeToolResponses: "Include tool responses",
    replayTrace: "Replay Trace",
    openPlayground: "Open in Playground",
    logsTitle: "Linked Logs & Errors",
    viewExplorer: "View in Explorer",
    errors: "Errors",
    logs: "Logs",
    time: "Time",
    level: "Level",
    source: "Source",
    message: "Message",
    viewAllLogs: "View all logs",
    loadErrorTitle: "Failed to load data",
    loadErrorHelp: "For local verification, run npm run serve.",
    languageAria: "language switcher",
    ja: "日本語",
    en: "English",
  },
};

const TRANSLATIONS = {
  en: {
    "トリアージ": "Triage",
    "ライブ実行": "Live Traces",
    "スパン分析": "Span Explorer",
    "ツール呼び出し": "Tool Calls",
    "評価": "Evaluations",
    "再実行": "Replay",
    "アラート": "Alerts",
    "本番": "Production",
    "失敗 + 劣化": "Failed + Degraded",
    "劣化": "Degraded",
    "失敗": "Failed",
    "直近6時間": "Last 6h",
    "今日 13:42": "Today 13:42",
    "今日 11:08": "Today 11:08",
    "今日 09:16": "Today 09:16",
    "45分前": "45m ago",
    "2時間前": "2h ago",
    "4時間前": "4h ago",
    "7日基準": "7d baseline",
    "対応中": "Ongoing",
    "監視中": "Monitoring",
    "高": "High",
    "中": "Medium",
    "低": "Low",
    "サポート対応AI": "Support Agent",
    "情報整理AI": "Research Agent",
    "手続き確認AI": "Operations Agent",
    "顧客サポートAI": "Customer Support Agent",
    "調査支援AI": "Research Agent",
    "請求確認AI": "Billing Agent",
    "ツール応答遅延により検証処理が再試行": "Tool timeout spike causing verifier retries",
    "検索文脈の鮮度低下により回答検証が保留": "Stale retrieval context causing verifier hold",
    "決済ツールの接続失敗により人による確認へ送信": "Tool connection failure routed to human review",
    "セッション": "Session",
    "実行トレース": "Trace",
    "計画作成": "planner",
    "文脈検索": "retriever",
    "検証": "verifier",
    "応答生成": "response",
    "全体": "session",
    "人による確認へ送信": "human_review_queue",
    "下流APIの遅延 / タイムアウト": "Downstream API latency / timeout",
    "ツール応答の必須項目不足": "Missing required field in tool response",
    "検索文脈の関連度低下": "Context relevance drop",
    "検索インデックスの更新遅延": "Search index refresh delay",
    "検索クエリの制約不足": "Search query constraints too loose",
    "外部ソース確認の遅延": "Source-check latency",
    "決済APIの接続失敗": "Status API connection failure",
    "確認キューの処理容量不足": "Review queue capacity pressure",
    "入力情報の不足": "Insufficient input information",
    "customer-records-api p95 latency 12.4s（通常比 6.1x）": "customer-records-api p95 latency 12.4s (6.1x baseline)",
    "customer-records-api p95 latency 12.4s（通常比 6.1x）": "customer-records-api p95 latency 12.4s (6.1x baseline)",
    "該当スパンで 15.4% の実行がタイムアウト": "15.4% of traces timed out at this span",
    "policy_check が required_status を返していない": "policy_check did not return required_status",
    "policy_check が account_status を返していない": "policy_check did not return the required status field",
    "検証の再試行が欠落項目と相関": "Verifier retries correlate with missing field",
    "検索スコア p50 0.28（通常比 0.34x）": "Retriever score p50 0.28 (0.34x baseline)",
    "古い文脈が検証前に残存": "Stale context detected before verifier",
    "直近24時間の文書が検索上位に出ない": "Recent documents do not appear in top results",
    "再検索後の関連度改善が小さい": "Rerun retrieval shows limited relevance recovery",
    "対象期間フィルタが未指定": "Time-window filter is not specified",
    "古い文書が検証直前まで残る": "Stale documents remain before verification",
    "source_check p95 が通常比 1.8x": "source_check p95 is 1.8x baseline",
    "全体遅延への寄与は限定的": "Contribution to total latency is limited",
    "status-check-api で 502/504 が増加": "status-check-api shows increased 502/504 responses",
    "3回の再試行後も復旧せず": "Still failed after three retries",
    "高リスク案件の滞留が増加": "High-risk queue backlog is increasing",
    "担当者割当まで平均 8.2分": "Average assignment delay is 8.2 minutes",
    "必須項目は揃っている": "Required fields are present",
    "影響は限定的": "Impact appears limited",
    "customer-records-api の遅延を調査": "Investigate customer-records-api latency",
    "customer-records-api の遅延を調査": "Investigate customer-records-api latency",
    "13:30〜14:00 のタイムアウト増加に絞り、APIヘルスとエンドポイント飽和を確認。": "Focus on timeout growth from 13:30-14:00. Check API health and endpoint saturation.",
    "手順書を開く": "Open runbook",
    "検索インデックスの鮮度を確認": "Check search index freshness",
    "直近更新分の取り込み時刻と検索上位のソース日付を照合する。": "Compare recent ingestion timestamps with source dates in top results.",
    "確認手順": "Open checklist",
    "status-check-api の接続状態を確認": "Check status-check-api connectivity",
    "決済APIのステータス、直近デプロイ、地域別エラー率を照合する。": "Compare API status, recent deploys, and regional error rates.",
    "障害対応手順": "Incident runbook",
    "個人情報": "PII",
    "単体テスト": "Unit tests",
    "根拠の明確さ": "Faithfulness",
    "文脈関連度": "Context Relevance",
    "目標達成": "Goal Success",
    "正確性": "Correctness",
    "応答関連度": "Response Relevance",
    "有用性": "Helpfulness",
    "ツールエラーにより再試行": "Retry triggered due to tool error",
    "文脈関連度が低い (0.23)": "Low context relevance (0.23)",
    "10.0s で接続タイムアウト": "Connection timeout after 10.0s",
    "計画を生成 (2 tool calls)": "Plan generated (2 tool calls)",
    "セッション開始": "Session started",
    "検索上位の文書鮮度が低い": "Top search results are stale",
    "外部ソース確認完了": "Source check completed",
    "根拠の鮮度確認を要求": "Freshness verification requested",
    "人による確認へ送信": "Sent to human review",
    "接続失敗、再試行上限到達": "Connection failed; retry limit reached",
    "請求情報を取得": "Account information retrieved",
    "再検索": "Retry retrieval",
    "関連度低下": "Relevance drop",
    "鮮度確認": "Freshness check",
    "古い文脈を検出": "Stale context detected",
    "接続失敗": "Connection failed",
    "人へ送信": "Sent to human",
    "再試行 1": "Retry 1",
    "再試行 2": "Retry 2",
    "全ツール (2)": "All tools (2)",
    "全ツール (3)": "All tools (3)",
  },
};

function getInitialLanguage() {
  try {
    const queryLang = new URLSearchParams(window.location.search).get("lang");
    if (["ja", "en"].includes(queryLang)) return queryLang;
  } catch (_) {
    // Keep the default when URL parsing is unavailable.
  }
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (["ja", "en"].includes(stored)) return stored;
  } catch (_) {
    // Keep default when storage is not available.
  }
  return DEFAULT_LANGUAGE;
}

const state = {
  data: null,
  workflowId: null,
  language: getInitialLanguage(),
};

const app = document.querySelector("#app");

function ui(key) {
  return UI[state.language]?.[key] ?? UI[DEFAULT_LANGUAGE][key] ?? key;
}

function text(value) {
  if (value && typeof value === "object" && ("ja" in value || "en" in value)) {
    return value[state.language] ?? value[DEFAULT_LANGUAGE] ?? "";
  }
  const raw = String(value ?? "");
  if (state.language === DEFAULT_LANGUAGE) return raw;
  return TRANSLATIONS[state.language]?.[raw] ?? raw;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function currentWorkflow() {
  return state.data.workflows.find((workflow) => workflow.id === state.workflowId) ?? state.data.workflows[0];
}

function statusIcon(status) {
  const icons = {
    success: "✓",
    warning: "△",
    error: "×",
    progress: "■",
    skipped: "—",
    info: "i",
  };
  return icons[status] ?? "•";
}

function levelLabel(level) {
  if (state.language === "en") return level;
  if (level === "ERROR") return "エラー";
  if (level === "WARN") return "警告";
  return "情報";
}

function impactClass(value) {
  if (value === "高") return "danger";
  if (value === "中") return "warning";
  return "info";
}

function numericValue(value) {
  if (typeof value === "number") return value;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function compactNumber(value) {
  return Math.round(numericValue(value)).toLocaleString("en-US");
}

function signedDelta(current, previous, suffix = "") {
  const delta = numericValue(current) - numericValue(previous);
  const sign = delta > 0 ? "+" : "";
  return `${sign}${Number(delta.toFixed(1))}${suffix}`;
}

function historyDirection(current, previous, lowerIsBetter = true) {
  const delta = numericValue(current) - numericValue(previous);
  if (Math.abs(delta) < 0.05) return "stable";
  const worse = lowerIsBetter ? delta > 0 : delta < 0;
  return worse ? "worse" : "recovered";
}

function directionLabel(direction) {
  if (direction === "worse") return ui("historyWorse");
  if (direction === "recovered") return ui("historyRecovered");
  return ui("historyStable");
}

function historyFor(workflow) {
  if (Array.isArray(workflow.history) && workflow.history.length >= 2) return workflow.history;
  const affected = numericValue(workflow.incident.affectedSessions);
  const slo = numericValue(workflow.incident.sloBurn);
  const durationMs = numericValue(workflow.traceTree?.[1]?.duration);
  const errorCount = workflow.logs.filter((log) => log.level === "ERROR").length;
  const errorRate = Math.max(0.4, Number(((errorCount / Math.max(workflow.logs.length, 1)) * 8).toFixed(1)));
  return [
    { label: ui("historyLatest"), time: text(workflow.incident.started), affectedSessions: affected, sloBurn: slo, durationMs, errorRate, status: text(workflow.incident.status) },
    { label: "45分前", time: "45分前", affectedSessions: Math.round(affected * 0.78), sloBurn: Math.max(0.4, Number((slo * 0.72).toFixed(1))), durationMs: Math.round(durationMs * 0.82), errorRate: Math.max(0.2, Number((errorRate * 0.72).toFixed(1))), status: text(workflow.incident.status) },
    { label: "2時間前", time: "2時間前", affectedSessions: Math.round(affected * 0.52), sloBurn: Math.max(0.3, Number((slo * 0.46).toFixed(1))), durationMs: Math.round(durationMs * 0.58), errorRate: Math.max(0.1, Number((errorRate * 0.48).toFixed(1))), status: ui("historyStable") },
    { label: "7日基準", time: "7日基準", affectedSessions: Math.round(affected * 0.31), sloBurn: Math.max(0.2, Number((slo * 0.34).toFixed(1))), durationMs: Math.round(durationMs * 0.42), errorRate: Math.max(0.1, Number((errorRate * 0.35).toFixed(1))), status: "baseline" },
  ];
}

function renderShell() {
  const workflow = currentWorkflow();
  document.documentElement.lang = state.language;
  document.title = ui("documentTitle");
  app.innerHTML = `
    <aside class="sidebar">
      <div class="brand-mark" aria-label="Agent Reliability"><span></span><span></span><span></span></div>
      <nav class="side-nav" aria-label="${escapeHtml(ui("navAria"))}">
        ${state.data.navigation.map((item, index) => `
          <button class="side-nav__item ${index === 0 ? "is-active" : ""}" type="button">
            <span class="side-nav__icon">${["◇", "⌁", "▱", "⚙", "◎", "↻", "△"][index] ?? "•"}</span>
            <span>${escapeHtml(text(item))}</span>
          </button>
        `).join("")}
      </nav>
      <div class="side-nav side-nav--bottom">
        <button class="side-nav__item" type="button"><span class="side-nav__icon">⚙</span><span>${escapeHtml(ui("settings"))}</span></button>
        <button class="side-nav__item" type="button"><span class="side-nav__icon">?</span><span>${escapeHtml(ui("help"))}</span></button>
        <button class="side-nav__item" type="button"><span class="side-nav__icon">≪</span><span>${escapeHtml(ui("collapse"))}</span></button>
      </div>
    </aside>

    <main class="dashboard">
      ${renderHeader(workflow)}
      ${renderIncident(workflow)}
      ${renderHistory(workflow)}
      <section class="main-grid">
        ${renderTraceTree(workflow)}
        ${renderWaterfall(workflow)}
        ${renderRca(workflow)}
      </section>
      <section class="bottom-grid">
        ${renderPayload(workflow)}
        ${renderEvaluations(workflow)}
        ${renderReplay(workflow)}
        ${renderLogs(workflow)}
      </section>
    </main>
  `;

  document.querySelector("#workflowSelect")?.addEventListener("change", (event) => {
    state.workflowId = event.target.value;
    renderShell();
  });

  document.querySelectorAll(".lang-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.language = button.dataset.lang;
      try { localStorage.setItem(LANGUAGE_STORAGE_KEY, state.language); } catch (_) {}
      renderShell();
    });
  });
}

function renderHeader(workflow) {
  return `
    <header class="topbar">
      <div>
        <h1>${escapeHtml(ui("appTitle"))}</h1>
        <div class="filter-row" aria-label="${escapeHtml(ui("filtersAria"))}">
          <span class="filter-chip filter-chip--danger-dot">${escapeHtml(text(workflow.environment))}</span>
          <label class="select-chip">
            <span class="sr-only">${escapeHtml(ui("workflowLabel"))}</span>
            <select id="workflowSelect">
              ${state.data.workflows.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === workflow.id ? "selected" : ""}>${escapeHtml(text(item.name))}</option>`).join("")}
            </select>
          </label>
          <span class="filter-chip filter-chip--warning-dot">${escapeHtml(text(workflow.viewState))}</span>
          <span class="filter-chip">◷ ${escapeHtml(text(workflow.window))}</span>
          <span class="filter-chip">＋ ${escapeHtml(ui("addFilter"))}</span>
        </div>
      </div>
      <div class="top-actions">
        <div class="language-switch" aria-label="${escapeHtml(ui("languageAria"))}">
          <button class="lang-button ${state.language === "ja" ? "is-active" : ""}" type="button" data-lang="ja">${escapeHtml(ui("ja"))}</button>
          <button class="lang-button ${state.language === "en" ? "is-active" : ""}" type="button" data-lang="en">${escapeHtml(ui("en"))}</button>
        </div>
        <aside class="confidence-card" aria-label="${escapeHtml(ui("confidenceLabel"))}">
          <span>${escapeHtml(ui("confidenceLabel"))}</span>
          <strong>${workflow.rcaConfidence}%</strong>
        </aside>
      </div>
    </header>
  `;
}

function renderHistory(workflow) {
  const history = historyFor(workflow);
  const latest = history[0];
  const previous = history[1] ?? history[0];
  const baseline = history[history.length - 1] ?? previous;
  const direction = historyDirection(latest.sloBurn, previous.sloBurn, true);
  const sparkMax = Math.max(...history.map((item) => numericValue(item.affectedSessions)), 1);
  const latestSlo = numericValue(latest.sloBurn);
  const latestDuration = numericValue(latest.durationMs);
  const latestAffected = numericValue(latest.affectedSessions);
  const latestErrorRate = numericValue(latest.errorRate);
  return `
    <section class="panel history-panel" aria-label="${escapeHtml(ui("historyTitle"))}">
      <div class="history-head">
        <div>
          <h3>${escapeHtml(ui("historyTitle"))}</h3>
          <p>${escapeHtml(ui("historySubtitle"))}</p>
        </div>
        <span class="history-state history-state--${direction}">${escapeHtml(directionLabel(direction))}</span>
      </div>
      <div class="history-metrics">
        <div class="history-metric"><span>${escapeHtml(ui("historySlo"))}</span><strong>${latestSlo.toFixed(1)}x</strong><em>${escapeHtml(signedDelta(latestSlo, previous.sloBurn, "x"))}</em></div>
        <div class="history-metric"><span>${escapeHtml(ui("historyDuration"))}</span><strong>${compactNumber(latestDuration)}ms</strong><em>${escapeHtml(signedDelta(latestDuration, baseline.durationMs, "ms"))}</em></div>
        <div class="history-metric"><span>${escapeHtml(ui("historyAffected"))}</span><strong>${compactNumber(latestAffected)}</strong><em>${escapeHtml(signedDelta(latestAffected, previous.affectedSessions))}</em></div>
        <div class="history-metric"><span>${escapeHtml(ui("historyErrorRate"))}</span><strong>${latestErrorRate.toFixed(1)}%</strong><em>${escapeHtml(signedDelta(latestErrorRate, baseline.errorRate, "%"))}</em></div>
      </div>
      <div class="history-spark" aria-label="${escapeHtml(ui("historyPrevious"))}">
        ${history.map((item, index) => `
          <div class="history-run ${index === 0 ? "is-current" : ""}">
            <span>${escapeHtml(text(item.time ?? item.label))}</span>
            <i style="height:${Math.max(14, Math.round((numericValue(item.affectedSessions) / sparkMax) * 54))}px"></i>
            <b>${compactNumber(item.affectedSessions)}</b>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderIncident(workflow) {
  const incident = workflow.incident;
  return `
    <section class="incident-card" aria-label="${escapeHtml(ui("incidentAria"))}">
      <div class="incident-alert"><span>!</span></div>
      <div class="incident-title">
        <span class="incident-kicker">${escapeHtml(ui("incident"))}</span>
        <h2>${escapeHtml(text(incident.title))}</h2>
      </div>
      <span class="severity-pill">${escapeHtml(incident.severity)}</span>
      <div class="metric-block"><span>${escapeHtml(ui("impactedWorkflows"))}</span><strong>${incident.impactedWorkflows}</strong><a>${escapeHtml(ui("details"))}</a></div>
      <div class="metric-block"><span>${escapeHtml(ui("affectedSessions"))}</span><strong>${escapeHtml(incident.affectedSessions)}</strong><em>${escapeHtml(incident.sessionDelta)}</em></div>
      <div class="metric-block"><span>${escapeHtml(ui("sloBurn"))}</span><strong>${escapeHtml(incident.sloBurn)}</strong><small>${escapeHtml(text(incident.sloLevel))}</small></div>
      <div class="metric-block"><span>${escapeHtml(ui("started"))}</span><strong>${escapeHtml(text(incident.started))}</strong></div>
      <div class="metric-block"><span>${escapeHtml(ui("status"))}</span><strong class="status-dot">${escapeHtml(text(incident.status))}</strong></div>
      <button class="outline-button" type="button">${escapeHtml(ui("viewDetails"))} ↗</button>
    </section>
  `;
}

function renderTraceTree(workflow) {
  return `
    <article class="panel trace-tree-panel">
      <div class="panel-head">
        <div><h3>${escapeHtml(ui("traceTree"))}</h3><p>${escapeHtml(ui("tracePath"))}</p></div>
        <div class="search-box">${escapeHtml(ui("searchSpans"))} ⌕</div>
      </div>
      <div class="trace-table" role="table" aria-label="${escapeHtml(ui("traceTree"))}">
        <div class="trace-row trace-row--head" role="row">
          <span>${escapeHtml(ui("name"))}</span><span>${escapeHtml(ui("state"))}</span><span>${escapeHtml(ui("durationMs"))}</span><span>${escapeHtml(ui("provider"))}</span><span>${escapeHtml(ui("retries"))}</span><span>${escapeHtml(ui("tokensCost"))}</span>
        </div>
        ${workflow.traceTree.map((row) => `
          <div class="trace-row ${row.selected ? "is-selected" : ""} ${row.highlight ? "is-highlight" : ""}" role="row">
            <span class="trace-name trace-name--level-${row.level}">
              <i>${row.level < 2 ? "⌄" : "▱"}</i>
              <b>${escapeHtml(text(row.name))}</b>
              ${row.muted ? `<small>${escapeHtml(row.muted)}</small>` : ""}
            </span>
            <span><i class="status status--${escapeHtml(row.status)}">${statusIcon(row.status)}</i></span>
            <span class="duration ${row.status === "warning" || row.status === "error" ? "is-bad" : ""}">${escapeHtml(row.duration)}</span>
            <span>${escapeHtml(text(row.provider))}</span>
            <span class="retry ${row.retries !== "0" && row.retries !== "—" ? "is-bad" : ""}">${escapeHtml(row.retries)}</span>
            <span>${escapeHtml(row.cost)}</span>
          </div>
        `).join("")}
        <div class="trace-row trace-row--total">
          <span>${escapeHtml(ui("totalTrace"))}</span><span></span><span>${escapeHtml(workflow.traceTree[1]?.duration ?? "—")}</span><span></span><span></span><span>${escapeHtml(workflow.traceTree[1]?.cost ?? "—")}</span>
        </div>
      </div>
    </article>
  `;
}

function renderWaterfall(workflow) {
  const waterfall = workflow.waterfall;
  return `
    <article class="panel waterfall-panel">
      <div class="panel-head panel-head--controls">
        <div><h3>${escapeHtml(ui("waterfall"))} <span class="info-dot">i</span></h3></div>
        <div class="control-pair"><span>${escapeHtml(ui("viewWaterfall"))}</span><span>${escapeHtml(ui("groupNone"))}</span><span>⛶</span><span>⋮</span></div>
      </div>
      <div class="timeline-scale">
        ${waterfall.scale.map((tick) => `<span>${escapeHtml(tick)}</span>`).join("")}
      </div>
      <div class="waterfall-body">
        ${waterfall.spans.map((span) => `
          <div class="span-row">
            <div class="span-label"><i class="legend-dot legend-dot--${escapeHtml(span.status)}"></i>${escapeHtml(text(span.label))}</div>
            <div class="span-track">
              <div class="span-bar span-bar--${escapeHtml(span.status)}" style="left:${span.start}%;width:${span.width}%">
                <span>${escapeHtml(span.duration)}</span>
              </div>
              ${span.annotation ? `<em class="span-annotation" style="left:${Math.min(span.start + span.width + 1, 82)}%">${escapeHtml(text(span.annotation))}</em>` : ""}
              ${(span.retries ?? []).map((retry) => `<small class="retry-badge" style="left:${retry.start}%">${escapeHtml(text(retry.label))} <b>${escapeHtml(retry.duration)}</b></small>`).join("")}
            </div>
          </div>
        `).join("")}
      </div>
      <div class="legend-row">
        <span><i class="legend-dot legend-dot--success"></i>${escapeHtml(ui("success"))}</span>
        <span><i class="legend-dot legend-dot--warning"></i>${escapeHtml(ui("warning"))}</span>
        <span><i class="legend-dot legend-dot--error"></i>${escapeHtml(ui("error"))}</span>
        <span><i class="legend-dot legend-dot--progress"></i>${escapeHtml(ui("inProgress"))}</span>
        <span><i class="legend-dot legend-dot--skipped"></i>${escapeHtml(ui("skipped"))}</span>
        <span><i class="dependency-line"></i>${escapeHtml(ui("dependency"))}</span>
      </div>
    </article>
  `;
}

function renderRca(workflow) {
  return `
    <article class="panel rca-panel">
      <div class="panel-head">
        <div><h3>${escapeHtml(ui("rcaAssistant"))} <span class="beta">${escapeHtml(ui("beta"))}</span> <span class="info-dot">i</span></h3></div>
        <div class="icon-actions">⟳ ⋮</div>
      </div>
      <h4>${escapeHtml(ui("topHypotheses"))}</h4>
      <div class="hypothesis-list">
        ${workflow.hypotheses.map((item) => `
          <section class="hypothesis hypothesis--${escapeHtml(item.tone)}">
            <div class="hypothesis__top"><span>${item.rank}</span><strong>${escapeHtml(text(item.title))}</strong><b>${item.score.toFixed(2)}</b></div>
            <ul>${item.evidence.map((line) => `<li>${escapeHtml(text(line))}</li>`).join("")}</ul>
          </section>
        `).join("")}
      </div>
      <a class="mini-link">${escapeHtml(ui("viewAllHypotheses"))}</a>
      <div class="recommended-action">
        <span>${escapeHtml(ui("recommendedNextAction"))}</span>
        <strong>${escapeHtml(text(workflow.recommendedAction.title))}</strong>
        <p>${escapeHtml(text(workflow.recommendedAction.body))}</p>
        <button type="button">${escapeHtml(text(workflow.recommendedAction.button))} ↗</button>
      </div>
      <p class="why-line">${escapeHtml(ui("why"))}</p>
    </article>
  `;
}

function renderPayload(workflow) {
  return `
    <article class="panel payload-panel">
      <div class="panel-head panel-head--controls">
        <div><h3>${escapeHtml(ui("payload"))} <span class="info-dot">i</span></h3></div>
        <div class="control-pair"><span>${escapeHtml(workflow.payload.mode)}</span><span>□</span><span>⋮</span></div>
      </div>
      <div class="payload-layout">
        <pre class="code-block"><code>${workflow.payload.code.map((line, index) => `<span><i>${index + 1}</i>${escapeHtml(line)}</span>`).join("")}</code></pre>
        <aside class="redaction-card">
          <strong>${escapeHtml(ui("redactionRules"))}</strong>
          ${workflow.payload.redactionRules.map((rule) => `<span>✓ ${escapeHtml(text(rule))}</span>`).join("")}
          <button type="button">${escapeHtml(ui("configure"))}</button>
        </aside>
      </div>
      <p class="panel-footnote">${escapeHtml(ui("payloadFootnote"))}</p>
    </article>
  `;
}

function renderEvaluations(workflow) {
  return `
    <article class="panel eval-panel">
      <div class="panel-head panel-head--controls">
        <div><h3>${escapeHtml(ui("evaluations"))} <span class="info-dot">i</span></h3></div>
        <div class="control-pair"><span>${escapeHtml(ui("compare7d"))}</span></div>
      </div>
      <div class="eval-table">
        <div class="eval-row eval-row--head"><span>${escapeHtml(ui("evaluator"))}</span><span>${escapeHtml(ui("score"))}</span><span>${escapeHtml(ui("baseline7d"))}</span><span>${escapeHtml(ui("delta"))}</span><span>${escapeHtml(ui("impact"))}</span></div>
        ${workflow.evaluations.map((item) => `
          <div class="eval-row">
            <span>${escapeHtml(text(item.name))}</span>
            <span>${item.score.toFixed(2)}</span>
            <span>${item.baseline.toFixed(2)}</span>
            <span class="delta"><i style="width:${Math.min(Math.abs(item.delta) * 110, 80)}%"></i>${item.delta.toFixed(2)}</span>
            <span class="impact impact--${impactClass(item.impact)}">${escapeHtml(text(item.impact))}</span>
          </div>
        `).join("")}
      </div>
      <a class="mini-link">${escapeHtml(ui("viewAllEvaluations"))} ›</a>
    </article>
  `;
}

function renderReplay(workflow) {
  return `
    <article class="panel replay-panel">
      <div class="panel-head"><div><h3>${escapeHtml(ui("replay"))} <span class="info-dot">i</span></h3></div></div>
      <p>${escapeHtml(ui("replayBody"))}</p>
      <div class="form-grid">
        <label><span>${escapeHtml(ui("model"))}</span><b>${escapeHtml(workflow.replay.model)}</b></label>
        <label><span>Temperature</span><b>${escapeHtml(workflow.replay.temperature)}</b></label>
        <label><span>${escapeHtml(ui("tools"))}</span><b>${escapeHtml(text(workflow.replay.tools))} ✓</b></label>
        <label class="toggle-row"><span>${escapeHtml(ui("includeToolResponses"))}</span><i class="toggle is-on"></i></label>
      </div>
      <button class="primary-button" type="button">▷ ${escapeHtml(ui("replayTrace"))}</button>
      <button class="secondary-button" type="button">${escapeHtml(ui("openPlayground"))} ↗</button>
    </article>
  `;
}

function renderLogs(workflow) {
  return `
    <article class="panel logs-panel">
      <div class="panel-head panel-head--controls">
        <div><h3>${escapeHtml(ui("logsTitle"))} <span class="info-dot">i</span></h3></div>
        <a>${escapeHtml(ui("viewExplorer"))} ↗</a>
      </div>
      <div class="tabs"><span class="is-active">${escapeHtml(ui("errors"))} (${workflow.logs.filter((log) => log.level === "ERROR").length})</span><span>${escapeHtml(ui("logs"))} (${workflow.logs.length})</span></div>
      <div class="log-table">
        <div class="log-row log-row--head"><span>${escapeHtml(ui("time"))}</span><span>${escapeHtml(ui("level"))}</span><span>${escapeHtml(ui("source"))}</span><span>${escapeHtml(ui("message"))}</span></div>
        ${workflow.logs.map((log) => `
          <div class="log-row">
            <span>${escapeHtml(log.time)}</span>
            <span><i class="log-level log-level--${escapeHtml(log.level.toLowerCase())}">${escapeHtml(levelLabel(log.level))}</i></span>
            <span>${escapeHtml(text(log.source))}</span>
            <span>${escapeHtml(text(log.message))}</span>
          </div>
        `).join("")}
      </div>
      <a class="mini-link">${escapeHtml(ui("viewAllLogs"))} ›</a>
    </article>
  `;
}

async function init() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`データ読み込みに失敗しました: ${response.status}`);
    state.data = await response.json();
    state.workflowId = state.data.defaultWorkflowId ?? state.data.workflows?.[0]?.id;
    if (!state.workflowId) throw new Error("ワークフロー定義がありません");
    renderShell();
  } catch (error) {
    app.innerHTML = `
      <main class="dashboard dashboard--error">
        <article class="panel error-panel">
          <h1>${escapeHtml(ui("loadErrorTitle"))}</h1>
          <p>${escapeHtml(error.message)}</p>
          <p>${escapeHtml(ui("loadErrorHelp"))}</p>
        </article>
      </main>
    `;
  }
}

init();
