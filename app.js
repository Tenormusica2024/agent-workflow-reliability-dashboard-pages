const state = {
  data: null,
  selectedId: null,
  mode: "portfolio",
  search: "",
  status: "all",
  runMode: "all",
};

const formatPercent = (value) => `${Math.round(value * 100)}%`;
const formatScore = (value) => value.toFixed(2);
const yen = (value) => `¥${Number(value).toLocaleString("ja-JP")}`;

const els = {
  metrics: document.querySelector("#metrics"),
  runList: document.querySelector("#runList"),
  runDetail: document.querySelector("#runDetail"),
  visibleCount: document.querySelector("#visibleCount"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  modeFilter: document.querySelector("#modeFilter"),
  failureTaxonomy: document.querySelector("#failureTaxonomy"),
  interviewPrompts: document.querySelector("#interviewPrompts"),
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusClass(status) {
  return `status-pill status-${status}`;
}

function statusLabel(status) {
  return ({ success: "success", warning: "warning", failed: "failed" }[status] ?? status);
}

function allRunText(run) {
  return [
    run.id,
    run.workflowName,
    run.mode,
    run.trigger,
    run.status,
    run.summary,
    run.goal,
    run.agentStack?.join(" "),
    run.models?.join(" "),
    run.failure?.category,
    run.hitl?.status,
    run.plan?.join(" "),
    run.toolCalls?.map((t) => `${t.tool} ${t.purpose} ${t.result}`).join(" "),
  ].join(" ").toLowerCase();
}

function filteredRuns() {
  const q = state.search.trim().toLowerCase();
  return state.data.workflows.filter((run) => {
    if (state.status !== "all" && run.status !== state.status) return false;
    if (state.runMode !== "all" && run.mode !== state.runMode) return false;
    if (q && !allRunText(run).includes(q)) return false;
    return true;
  });
}

function calculateMetrics(runs) {
  const total = runs.length;
  const success = runs.filter((run) => run.status === "success").length;
  const warning = runs.filter((run) => run.status === "warning").length;
  const failed = runs.filter((run) => run.status === "failed").length;
  const hitlPending = runs.filter((run) => run.hitl?.status === "pending").length;
  const avgEval = total ? runs.reduce((sum, run) => sum + (run.metrics?.evalScore ?? 0), 0) / total : 0;
  const totalCost = runs.reduce((sum, run) => sum + (run.metrics?.costJpyApprox ?? 0), 0);
  return { total, success, warning, failed, hitlPending, avgEval, totalCost };
}

function renderMetrics() {
  const runs = filteredRuns();
  const m = calculateMetrics(runs);
  const cards = [
    ["Runs", m.total, "filtered agent workflow runs"],
    ["Success", m.total ? formatPercent(m.success / m.total) : "0%", `${m.success} passed`],
    ["Warnings", m.warning, "needs attention but shipped"],
    ["Failures", m.failed, "safe-stop or failed runs"],
    ["Eval Avg", formatScore(m.avgEval), "mean workflow score"],
    ["Cost", yen(m.totalCost), "sample estimated spend"],
  ];
  els.metrics.innerHTML = cards.map(([label, value, note]) => `
    <article class="metric-card">
      <p class="metric-label">${escapeHtml(label)}</p>
      <p class="metric-value">${escapeHtml(value)}</p>
      <p class="metric-note">${escapeHtml(note)}</p>
    </article>
  `).join("");
}

function renderRunList() {
  const runs = filteredRuns();
  els.visibleCount.textContent = `${runs.length} runs`;
  if (!runs.some((run) => run.id === state.selectedId)) {
    state.selectedId = runs[0]?.id ?? null;
  }
  els.runList.innerHTML = runs.map((run) => `
    <button class="run-item ${run.id === state.selectedId ? "is-selected" : ""}" data-run-id="${escapeHtml(run.id)}">
      <div class="run-item__top">
        <span class="${statusClass(run.status)}">${escapeHtml(statusLabel(run.status))}</span>
        <span class="tag">${escapeHtml(run.mode)}</span>
      </div>
      <h3>${escapeHtml(run.workflowName)}</h3>
      <p>${escapeHtml(run.summary)}</p>
      <div class="run-item__meta">
        <span>eval ${formatScore(run.metrics.evalScore)}</span>
        <span>${run.durationMinutes} min</span>
        <span>${yen(run.metrics.costJpyApprox)}</span>
      </div>
    </button>
  `).join("") || `<div class="empty-state"><p>No runs match the current filters.</p></div>`;

  document.querySelectorAll(".run-item").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.runId;
      render();
    });
  });
}

function listItems(items) {
  return `<ul>${(items ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderCriteria(criteria = []) {
  return `<div class="criteria-list">${criteria.map((item) => `
    <div class="criterion">
      <strong>${escapeHtml(item.name)}</strong> · ${formatScore(item.score)}
      <div class="score-bar"><span style="width:${Math.max(0, Math.min(100, item.score * 100))}%"></span></div>
      <p>${escapeHtml(item.note)}</p>
    </div>
  `).join("")}</div>`;
}

function renderToolCalls(toolCalls = []) {
  return `<div class="tool-list">${toolCalls.map((call) => `
    <div class="tool-call">
      <strong>${escapeHtml(call.tool)}</strong>
      <p>${escapeHtml(call.purpose)}</p>
      <span class="tag">${escapeHtml(call.result)}</span>
      <span class="tag">risk: ${escapeHtml(call.risk)}</span>
    </div>
  `).join("")}</div>`;
}

function renderInterviewNotes(notes = []) {
  return notes.map((note) => `
    <details open>
      <summary>${escapeHtml(note.question)}</summary>
      <p>${escapeHtml(note.answer)}</p>
    </details>
  `).join("");
}

function renderRunDetail() {
  const run = state.data.workflows.find((item) => item.id === state.selectedId);
  if (!run) {
    els.runDetail.innerHTML = `
      <p class="eyebrow">Run Detail</p>
      <h2>Select a run</h2>
      <p>表示対象のrunがありません。</p>
    `;
    return;
  }

  els.runDetail.classList.remove("empty-state");
  els.runDetail.innerHTML = `
    <div class="detail-header">
      <div class="detail-title-row">
        <div>
          <p class="eyebrow">${escapeHtml(run.id)}</p>
          <h2>${escapeHtml(run.workflowName)}</h2>
        </div>
        <span class="${statusClass(run.status)}">${escapeHtml(statusLabel(run.status))}</span>
      </div>
      <p class="detail-summary">${escapeHtml(run.summary)}</p>
      <div class="tag-row">
        ${run.agentStack.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
      </div>
    </div>

    <div class="detail-columns">
      <div>
        <section class="info-block">
          <h3>Goal</h3>
          <p>${escapeHtml(run.goal)}</p>
        </section>
        <section class="info-block">
          <h3>Plan</h3>
          ${listItems(run.plan)}
        </section>
        <section class="info-block">
          <h3>Tool calls</h3>
          ${renderToolCalls(run.toolCalls)}
        </section>
        <section class="info-block interview-only">
          <h3>Interview notes</h3>
          ${renderInterviewNotes(run.interviewNotes)}
        </section>
      </div>

      <div>
        <section class="info-block">
          <h3>Evaluation</h3>
          <p><strong>Result:</strong> ${escapeHtml(run.evaluation.result)}</p>
          ${renderCriteria(run.evaluation.criteria)}
        </section>
        <section class="info-block">
          <h3>HITL policy</h3>
          <p><strong>Status:</strong> ${escapeHtml(run.hitl.status)}</p>
          <p>${escapeHtml(run.hitl.reason)}</p>
        </section>
        <section class="info-block ${run.failure.severity === "high" ? "notice" : ""}">
          <h3>Failure handling</h3>
          <p><strong>${escapeHtml(run.failure.category)}</strong> · severity: ${escapeHtml(run.failure.severity)}</p>
          <p>${escapeHtml(run.failure.rootCause)}</p>
          <p><strong>Recovery:</strong> ${escapeHtml(run.failure.recovery)}</p>
        </section>
        <section class="info-block">
          <h3>Rollback</h3>
          <p>${escapeHtml(run.rollback.condition)}</p>
          <code>${escapeHtml(run.rollback.command)}</code>
        </section>
        <section class="info-block interview-only">
          <h3>Why this proves reliability</h3>
          <details open>
            <summary>What should an interviewer notice?</summary>
            <p>このrunは、agent作業をログ・評価・HITL・rollback・handoverへ分解しており、単なる自動化ではなく運用可能性を説明する材料になります。</p>
          </details>
        </section>
      </div>
    </div>
  `;
}

function renderTaxonomy() {
  els.failureTaxonomy.innerHTML = state.data.failureTaxonomy.map((item) => `
    <article class="taxonomy-item">
      <h3>${escapeHtml(item.label)}</h3>
      <p>${escapeHtml(item.description)}</p>
      <details>
        <summary>Retry policy</summary>
        <p>${escapeHtml(item.retryPolicy)}</p>
      </details>
    </article>
  `).join("");
}

function renderPrompts() {
  els.interviewPrompts.innerHTML = state.data.interviewPrompts.map((prompt, index) => `
    <article class="prompt-item">
      <h3>Q${index + 1}</h3>
      <p>${escapeHtml(prompt)}</p>
    </article>
  `).join("");
}

function populateModeFilter() {
  const modes = [...new Set(state.data.workflows.map((run) => run.mode))].sort();
  els.modeFilter.innerHTML = `<option value="all">All</option>${modes.map((mode) => `<option value="${escapeHtml(mode)}">${escapeHtml(mode)}</option>`).join("")}`;
}

function render() {
  document.body.dataset.mode = state.mode;
  document.querySelectorAll(".mode-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === state.mode);
  });
  renderMetrics();
  renderRunList();
  renderRunDetail();
}

function bindEvents() {
  document.querySelectorAll(".mode-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      render();
    });
  });
  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    render();
  });
  els.statusFilter.addEventListener("change", (event) => {
    state.status = event.target.value;
    render();
  });
  els.modeFilter.addEventListener("change", (event) => {
    state.runMode = event.target.value;
    render();
  });
}

async function loadData() {
  const response = await fetch("sample-runs.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load sample-runs.json: ${response.status}`);
  return response.json();
}

async function init() {
  try {
    state.data = await loadData();
    state.selectedId = state.data.workflows[0]?.id ?? null;
    populateModeFilter();
    renderTaxonomy();
    renderPrompts();
    bindEvents();
    render();
  } catch (error) {
    document.querySelector("main").innerHTML = `
      <section class="card notice">
        <p class="eyebrow">Data load failed</p>
        <h2>Run through a local server</h2>
        <p>${escapeHtml(error.message)}</p>
        <p>ローカルで直接 file:// として開いた場合はJSON読み込みがブロックされることがあります。<code>npm run serve</code> か <code>python -m http.server 4173</code> で開いてください。</p>
      </section>
    `;
  }
}

init();
