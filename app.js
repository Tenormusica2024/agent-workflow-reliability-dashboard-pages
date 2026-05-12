const DATA_URL = "sample-runs.json";

const state = {
  data: null,
  workflowId: null,
};

const app = document.querySelector("#app");

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
  if (level === "ERROR") return "エラー";
  if (level === "WARN") return "警告";
  return "情報";
}

function impactClass(value) {
  if (value === "高") return "danger";
  if (value === "中") return "warning";
  return "info";
}

function renderShell() {
  const workflow = currentWorkflow();
  app.innerHTML = `
    <aside class="sidebar">
      <div class="brand-mark" aria-label="Agent Reliability"><span></span><span></span><span></span></div>
      <nav class="side-nav" aria-label="主要メニュー">
        ${state.data.navigation.map((item, index) => `
          <button class="side-nav__item ${index === 0 ? "is-active" : ""}" type="button">
            <span class="side-nav__icon">${["◇", "⌁", "▱", "⚙", "◎", "↻", "△"][index] ?? "•"}</span>
            <span>${escapeHtml(item)}</span>
          </button>
        `).join("")}
      </nav>
      <div class="side-nav side-nav--bottom">
        <button class="side-nav__item" type="button"><span class="side-nav__icon">⚙</span><span>設定</span></button>
        <button class="side-nav__item" type="button"><span class="side-nav__icon">?</span><span>ヘルプ</span></button>
        <button class="side-nav__item" type="button"><span class="side-nav__icon">≪</span><span>折りたたむ</span></button>
      </div>
    </aside>

    <main class="dashboard">
      ${renderHeader(workflow)}
      ${renderIncident(workflow)}
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
}

function renderHeader(workflow) {
  return `
    <header class="topbar">
      <div>
        <h1>エージェント実行トリアージ</h1>
        <div class="filter-row" aria-label="表示条件">
          <span class="filter-chip filter-chip--danger-dot">${escapeHtml(workflow.environment)}</span>
          <label class="select-chip">
            <span class="sr-only">ワークフロー</span>
            <select id="workflowSelect">
              ${state.data.workflows.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === workflow.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}
            </select>
          </label>
          <span class="filter-chip filter-chip--warning-dot">${escapeHtml(workflow.viewState)}</span>
          <span class="filter-chip">◷ ${escapeHtml(workflow.window)}</span>
          <span class="filter-chip">＋ フィルター追加</span>
        </div>
      </div>
      <aside class="confidence-card" aria-label="原因推定の信頼度">
        <span>原因推定</span>
        <strong>${workflow.rcaConfidence}%</strong>
      </aside>
    </header>
  `;
}

function renderIncident(workflow) {
  const incident = workflow.incident;
  return `
    <section class="incident-card" aria-label="インシデント概要">
      <div class="incident-alert"><span>!</span></div>
      <div class="incident-title">
        <span class="incident-kicker">インシデント</span>
        <h2>${escapeHtml(incident.title)}</h2>
      </div>
      <span class="severity-pill">${escapeHtml(incident.severity)}</span>
      <div class="metric-block"><span>影響ワークフロー</span><strong>${incident.impactedWorkflows}</strong><a>詳細</a></div>
      <div class="metric-block"><span>影響セッション</span><strong>${escapeHtml(incident.affectedSessions)}</strong><em>${escapeHtml(incident.sessionDelta)}</em></div>
      <div class="metric-block"><span>SLO消費</span><strong>${escapeHtml(incident.sloBurn)}</strong><small>${escapeHtml(incident.sloLevel)}</small></div>
      <div class="metric-block"><span>開始</span><strong>${escapeHtml(incident.started)}</strong></div>
      <div class="metric-block"><span>状態</span><strong class="status-dot">${escapeHtml(incident.status)}</strong></div>
      <button class="outline-button" type="button">詳細を見る ↗</button>
    </section>
  `;
}

function renderTraceTree(workflow) {
  return `
    <article class="panel trace-tree-panel">
      <div class="panel-head">
        <div><h3>トレースツリー</h3><p>Session → Trace → Spans</p></div>
        <div class="search-box">スパン検索 ⌕</div>
      </div>
      <div class="trace-table" role="table" aria-label="トレースツリー">
        <div class="trace-row trace-row--head" role="row">
          <span>名前</span><span>状態</span><span>時間(ms)</span><span>Model / Provider</span><span>再試行</span><span>Tokens / Cost</span>
        </div>
        ${workflow.traceTree.map((row) => `
          <div class="trace-row ${row.selected ? "is-selected" : ""} ${row.highlight ? "is-highlight" : ""}" role="row">
            <span class="trace-name trace-name--level-${row.level}">
              <i>${row.level < 2 ? "⌄" : "▱"}</i>
              <b>${escapeHtml(row.name)}</b>
              ${row.muted ? `<small>${escapeHtml(row.muted)}</small>` : ""}
            </span>
            <span><i class="status status--${escapeHtml(row.status)}">${statusIcon(row.status)}</i></span>
            <span class="duration ${row.status === "warning" || row.status === "error" ? "is-bad" : ""}">${escapeHtml(row.duration)}</span>
            <span>${escapeHtml(row.provider)}</span>
            <span class="retry ${row.retries !== "0" && row.retries !== "—" ? "is-bad" : ""}">${escapeHtml(row.retries)}</span>
            <span>${escapeHtml(row.cost)}</span>
          </div>
        `).join("")}
        <div class="trace-row trace-row--total">
          <span>Total (trace)</span><span></span><span>${escapeHtml(workflow.traceTree[1]?.duration ?? "—")}</span><span></span><span></span><span>${escapeHtml(workflow.traceTree[1]?.cost ?? "—")}</span>
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
        <div><h3>トレース・ウォーターフォール <span class="info-dot">i</span></h3></div>
        <div class="control-pair"><span>表示: Waterfall</span><span>Group: None</span><span>⛶</span><span>⋮</span></div>
      </div>
      <div class="timeline-scale">
        ${waterfall.scale.map((tick) => `<span>${escapeHtml(tick)}</span>`).join("")}
      </div>
      <div class="waterfall-body">
        ${waterfall.spans.map((span) => `
          <div class="span-row">
            <div class="span-label"><i class="legend-dot legend-dot--${escapeHtml(span.status)}"></i>${escapeHtml(span.label)}</div>
            <div class="span-track">
              <div class="span-bar span-bar--${escapeHtml(span.status)}" style="left:${span.start}%;width:${span.width}%">
                <span>${escapeHtml(span.duration)}</span>
              </div>
              ${span.annotation ? `<em class="span-annotation" style="left:${Math.min(span.start + span.width + 1, 82)}%">${escapeHtml(span.annotation)}</em>` : ""}
              ${(span.retries ?? []).map((retry) => `<small class="retry-badge" style="left:${retry.start}%">${escapeHtml(retry.label)} <b>${escapeHtml(retry.duration)}</b></small>`).join("")}
            </div>
          </div>
        `).join("")}
      </div>
      <div class="legend-row">
        <span><i class="legend-dot legend-dot--success"></i>成功</span>
        <span><i class="legend-dot legend-dot--warning"></i>警告</span>
        <span><i class="legend-dot legend-dot--error"></i>エラー</span>
        <span><i class="legend-dot legend-dot--progress"></i>処理中</span>
        <span><i class="legend-dot legend-dot--skipped"></i>スキップ</span>
        <span><i class="dependency-line"></i>依存関係</span>
      </div>
    </article>
  `;
}

function renderRca(workflow) {
  return `
    <article class="panel rca-panel">
      <div class="panel-head">
        <div><h3>原因推定アシスタント <span class="beta">BETA</span> <span class="info-dot">i</span></h3></div>
        <div class="icon-actions">⟳ ⋮</div>
      </div>
      <h4>上位仮説（順位つき）</h4>
      <div class="hypothesis-list">
        ${workflow.hypotheses.map((item) => `
          <section class="hypothesis hypothesis--${escapeHtml(item.tone)}">
            <div class="hypothesis__top"><span>${item.rank}</span><strong>${escapeHtml(item.title)}</strong><b>${item.score.toFixed(2)}</b></div>
            <ul>${item.evidence.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
          </section>
        `).join("")}
      </div>
      <a class="mini-link">すべての仮説を見る</a>
      <div class="recommended-action">
        <span>推奨される次の対応</span>
        <strong>${escapeHtml(workflow.recommendedAction.title)}</strong>
        <p>${escapeHtml(workflow.recommendedAction.body)}</p>
        <button type="button">${escapeHtml(workflow.recommendedAction.button)} ↗</button>
      </div>
      <p class="why-line">なぜ？ 複数セッションで広く影響があり、信頼度が高いため。</p>
    </article>
  `;
}

function renderPayload(workflow) {
  return `
    <article class="panel payload-panel">
      <div class="panel-head panel-head--controls">
        <div><h3>ツール入力（秘匿済み） <span class="info-dot">i</span></h3></div>
        <div class="control-pair"><span>${escapeHtml(workflow.payload.mode)}</span><span>□</span><span>⋮</span></div>
      </div>
      <div class="payload-layout">
        <pre class="code-block"><code>${workflow.payload.code.map((line, index) => `<span><i>${index + 1}</i>${escapeHtml(line)}</span>`).join("")}</code></pre>
        <aside class="redaction-card">
          <strong>秘匿ルール</strong>
          ${workflow.payload.redactionRules.map((rule) => `<span>✓ ${escapeHtml(rule)}</span>`).join("")}
          <button type="button">設定</button>
        </aside>
      </div>
      <p class="panel-footnote">入力値は自動的に秘匿されます。詳細ルールは設定で管理します。</p>
    </article>
  `;
}

function renderEvaluations(workflow) {
  return `
    <article class="panel eval-panel">
      <div class="panel-head panel-head--controls">
        <div><h3>評価（トレース単位） <span class="info-dot">i</span></h3></div>
        <div class="control-pair"><span>比較: 7日基準</span></div>
      </div>
      <div class="eval-table">
        <div class="eval-row eval-row--head"><span>評価項目</span><span>Score</span><span>7日基準</span><span>Delta</span><span>影響</span></div>
        ${workflow.evaluations.map((item) => `
          <div class="eval-row">
            <span>${escapeHtml(item.name)}</span>
            <span>${item.score.toFixed(2)}</span>
            <span>${item.baseline.toFixed(2)}</span>
            <span class="delta"><i style="width:${Math.min(Math.abs(item.delta) * 110, 80)}%"></i>${item.delta.toFixed(2)}</span>
            <span class="impact impact--${impactClass(item.impact)}">${escapeHtml(item.impact)}</span>
          </div>
        `).join("")}
      </div>
      <a class="mini-link">すべての評価を見る ›</a>
    </article>
  `;
}

function renderReplay(workflow) {
  return `
    <article class="panel replay-panel">
      <div class="panel-head"><div><h3>再実行 <span class="info-dot">i</span></h3></div></div>
      <p>このトレースを隔離環境で再実行します。</p>
      <div class="form-grid">
        <label><span>モデル</span><b>${escapeHtml(workflow.replay.model)}</b></label>
        <label><span>Temperature</span><b>${escapeHtml(workflow.replay.temperature)}</b></label>
        <label><span>ツール</span><b>${escapeHtml(workflow.replay.tools)} ✓</b></label>
        <label class="toggle-row"><span>ツール応答を含める</span><i class="toggle is-on"></i></label>
      </div>
      <button class="primary-button" type="button">▷ トレースを再実行</button>
      <button class="secondary-button" type="button">プレイグラウンドで開く ↗</button>
    </article>
  `;
}

function renderLogs(workflow) {
  return `
    <article class="panel logs-panel">
      <div class="panel-head panel-head--controls">
        <div><h3>関連ログとエラー <span class="info-dot">i</span></h3></div>
        <a>Explorerで表示 ↗</a>
      </div>
      <div class="tabs"><span class="is-active">Errors (${workflow.logs.filter((log) => log.level === "ERROR").length})</span><span>Logs (${workflow.logs.length})</span></div>
      <div class="log-table">
        <div class="log-row log-row--head"><span>時刻</span><span>Level</span><span>Source</span><span>Message</span></div>
        ${workflow.logs.map((log) => `
          <div class="log-row">
            <span>${escapeHtml(log.time)}</span>
            <span><i class="log-level log-level--${escapeHtml(log.level.toLowerCase())}">${levelLabel(log.level)}</i></span>
            <span>${escapeHtml(log.source)}</span>
            <span>${escapeHtml(log.message)}</span>
          </div>
        `).join("")}
      </div>
      <a class="mini-link">すべてのログを見る ›</a>
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
          <h1>データを読み込めませんでした</h1>
          <p>${escapeHtml(error.message)}</p>
          <p>ローカル確認では <code>npm run serve</code> を使ってください。</p>
        </article>
      </main>
    `;
  }
}

init();
