const LANGUAGE_STORAGE_KEY = "awrd-language";
const DEFAULT_LANGUAGE = "ja";

function getInitialLanguage() {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (["ja", "en"].includes(stored)) return stored;
  } catch (_) {
    // Keep the default language when localStorage is unavailable.
  }
  return DEFAULT_LANGUAGE;
}

const state = {
  data: null,
  language: getInitialLanguage(),
  selectedStageId: null,
};

const I18N = {
  ja: {
    documentTitle: "Agent Workflow Reliability Blueprint",
    hero: {
      eyebrow: "公開用Blueprint",
      titleHtml: "<span>AI開発</span><span>Workflow</span><span>設計</span>",
      lead: "AI開発を「agentが動いた」で終わらせず、設計・実行・評価・人による確認・戻し方・改善まで説明できる形にする。",
      languageAria: "言語選択",
      panelAria: "Dashboardの位置づけ",
      panelKicker: "この画面の目的",
      panelBody: "公開しにくい個別taskではなく、AI agentワークフローをどう設計し、どう信頼できる形にしているかを見せる。",
    },
    workflow: {
      aria: "AI開発ワークフロー図",
      eyebrow: "Workflow Blueprint",
      title: "AI開発ワークフロー図と説明",
      note: "各工程を押すと、その工程の役割・説得力のある説明・見せる証拠が切り替わります。",
      output: "この工程の成果物",
      tools: "使うツール",
      why: "説得力を出す説明",
      proof: "見せる証拠",
      step: "Step",
    },
    proof: {
      aria: "説得力を支える説明",
      eyebrow: "説明文",
      title: "ワークフロー図の近くに置く説明文",
    },
    qa: {
      eyebrow: "面接補助",
      title: "面接での答え方",
      lead: "質問一覧は主役ではなく、ワークフロー図を説明するための補助です。必要なときだけ開けるようにしています。",
      count: "{count}問",
    },
    error: {
      eyebrow: "データ読み込み失敗",
      title: "local serverで開いてください",
      body: "file://で直接開くとJSON読み込みが止まる場合があります。npm run serve か python -m http.server 4173 を使ってください。",
    },
  },
  en: {
    documentTitle: "Agent Workflow Reliability Blueprint",
    hero: {
      eyebrow: "Public Blueprint",
      titleHtml: "<span>AI Development</span><span>Workflow</span><span>Reliability</span>",
      lead: "Make AI development explainable across design, execution, eval, HITL, rollback, and improvement instead of stopping at an agent demo.",
      languageAria: "language selector",
      panelAria: "dashboard position statement",
      panelKicker: "What this screen is for",
      panelBody: "This does not expose individual private tasks. It shows how I design and make AI-agent workflows reliable.",
    },
    workflow: {
      aria: "AI development workflow diagram",
      eyebrow: "Workflow Blueprint",
      title: "AI development workflow diagram and explanation",
      note: "Select each stage to switch the role, persuasive explanation, and evidence to show.",
      output: "Output of this stage",
      tools: "Tools used",
      why: "Persuasive explanation",
      proof: "Evidence to show",
      step: "Step",
    },
    proof: {
      aria: "explanations that support credibility",
      eyebrow: "Persuasive Explanation",
      title: "Explanation copy placed near the workflow diagram",
    },
    qa: {
      eyebrow: "Interview Support",
      title: "How to answer in interviews",
      lead: "The Q&A is secondary. It exists only to help explain the workflow diagram when needed.",
      count: "{count} questions",
    },
    error: {
      eyebrow: "Data load failed",
      title: "Run through a local server",
      body: "If you open this page through file://, JSON loading may be blocked. Use npm run serve or python -m http.server 4173.",
    },
  },
};

const els = {
  workflowMap: document.querySelector("#workflowMap"),
  stepDetail: document.querySelector("#stepDetail"),
  proofGrid: document.querySelector("#proofGrid"),
  qaList: document.querySelector("#qaList"),
  qaCount: document.querySelector("#qaCount"),
};

function copy() {
  return I18N[state.language] ?? I18N[DEFAULT_LANGUAGE];
}

function text(value) {
  if (value && typeof value === "object" && ("ja" in value || "en" in value)) {
    return value[state.language] ?? value[DEFAULT_LANGUAGE] ?? "";
  }
  return value ?? "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function interpolate(template, values) {
  return String(template).replaceAll(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

function getPath(source, path) {
  return path.split(".").reduce((value, key) => value?.[key], source);
}

function renderStaticText() {
  const current = copy();
  document.documentElement.lang = state.language;
  document.title = current.documentTitle;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = getPath(current, element.dataset.i18n);
    if (value != null) element.textContent = value;
  });

  document.querySelectorAll("[data-i18n-html]").forEach((element) => {
    const value = getPath(current, element.dataset.i18nHtml);
    if (value != null) element.innerHTML = value;
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    const value = getPath(current, element.dataset.i18nAriaLabel);
    if (value != null) element.setAttribute("aria-label", value);
  });

  document.querySelectorAll(".lang-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.lang === state.language);
  });
}

function currentStage() {
  return state.data.workflowStages.find((stage) => stage.id === state.selectedStageId) ?? state.data.workflowStages[0];
}

function renderWorkflowMap() {
  const stages = state.data.workflowStages;
  els.workflowMap.innerHTML = stages.map((stage, index) => `
    <button class="flow-node ${stage.id === state.selectedStageId ? "is-selected" : ""}" type="button" data-stage-id="${escapeHtml(stage.id)}">
      <span class="flow-node__number">${String(stage.order).padStart(2, "0")}</span>
      <span class="flow-node__body">
        <strong>${escapeHtml(text(stage.title))}</strong>
        <small>${escapeHtml(text(stage.short))}</small>
      </span>
      ${index < stages.length - 1 ? '<span class="flow-node__arrow">→</span>' : ""}
    </button>
  `).join("");

  document.querySelectorAll(".flow-node").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedStageId = button.dataset.stageId;
      render();
    });
  });
}

function renderStepDetail() {
  const stage = currentStage();
  els.stepDetail.innerHTML = `
    <div class="step-detail__top">
      <p class="eyebrow">${escapeHtml(copy().workflow.step)} ${String(stage.order).padStart(2, "0")}</p>
      <h3>${escapeHtml(text(stage.title))}</h3>
      <p>${escapeHtml(text(stage.short))}</p>
    </div>

    <div class="explain-block explain-block--primary">
      <h4>${escapeHtml(copy().workflow.why)}</h4>
      <p>${escapeHtml(text(stage.explain))}</p>
    </div>

    <div class="detail-grid">
      <div class="explain-block">
        <h4>${escapeHtml(copy().workflow.output)}</h4>
        <p>${escapeHtml(text(stage.output))}</p>
      </div>
      <div class="explain-block">
        <h4>${escapeHtml(copy().workflow.proof)}</h4>
        <p>${escapeHtml(text(stage.proof))}</p>
      </div>
    </div>

    <div class="tool-row" aria-label="${escapeHtml(copy().workflow.tools)}">
      ${(stage.tools ?? []).map((tool) => `<span class="tag">${escapeHtml(tool)}</span>`).join("")}
    </div>
  `;
}

function renderProofGrid() {
  els.proofGrid.innerHTML = state.data.proofCards.map((card) => `
    <article class="card proof-card">
      <p class="eyebrow">${escapeHtml(copy().proof.eyebrow)}</p>
      <h3>${escapeHtml(text(card.title))}</h3>
      <p>${escapeHtml(text(card.body))}</p>
    </article>
  `).join("");
}

function renderQa() {
  const items = state.data.qa ?? [];
  els.qaCount.textContent = interpolate(copy().qa.count, { count: items.length });
  els.qaList.innerHTML = items.map((item) => `
    <details>
      <summary>${escapeHtml(text(item.question))}</summary>
      <p>${escapeHtml(text(item.answer))}</p>
    </details>
  `).join("");
}

function render() {
  renderStaticText();
  renderWorkflowMap();
  renderStepDetail();
  renderProofGrid();
  renderQa();
}

function bindEvents() {
  document.querySelectorAll(".lang-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.language = button.dataset.lang;
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, state.language);
      } catch (_) {
        // Language still changes for the current page view.
      }
      render();
    });
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
    state.selectedStageId = state.data.workflowStages[4]?.id ?? state.data.workflowStages[0]?.id;
    bindEvents();
    render();
  } catch (error) {
    renderStaticText();
    document.querySelector("main").innerHTML = `
      <section class="card notice">
        <p class="eyebrow">${escapeHtml(copy().error.eyebrow)}</p>
        <h2>${escapeHtml(copy().error.title)}</h2>
        <p>${escapeHtml(error.message)}</p>
        <p>${escapeHtml(copy().error.body)}</p>
      </section>
    `;
  }
}

init();

