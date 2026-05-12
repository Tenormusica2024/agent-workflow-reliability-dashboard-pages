const LANGUAGE_STORAGE_KEY = "awrd-language";
const DEFAULT_LANGUAGE = "ja";

function getInitialLanguage() {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (["ja", "en"].includes(stored)) return stored;
  } catch (_) {
    // Fall back to Japanese when storage is unavailable.
  }
  return DEFAULT_LANGUAGE;
}

const state = {
  data: null,
  selectedId: null,
  viewMode: "portfolio",
  language: getInitialLanguage(),
  search: "",
  status: "all",
  runMode: "all",
};

const I18N = {
  ja: {
    documentTitle: "Agent Workflow Reliability Dashboard",
    hero: {
      eyebrow: "公開可能なMVP",
      lead: "Trace、評価、HITL、rollback、引き継ぎまで見える、運用可能なAI agent workflowのDashboard。",
      modeAria: "表示モード選択",
      portfolioMode: "Portfolio Mode",
      interviewMode: "Interview Mode",
      languageAria: "言語選択",
      panelAria: "Dashboardの位置づけ",
      panelKicker: "このDashboardで示すこと",
      panelBody: "AI agentを「動くデモ」で終わらせず、評価・監視・承認・引き継ぎまで含めて運用可能にする力を示す。",
    },
    filters: {
      search: "検索",
      searchPlaceholder: "workflow、tool、failure、HITL...",
      status: "状態",
      mode: "種別",
    },
    sections: {
      metricsAria: "信頼性指標",
      filtersAria: "絞り込み",
      timelineAria: "Run履歴",
      detailAria: "Run詳細",
      runTimeline: "Run履歴",
      agentRuns: "Agent run一覧",
      runDetail: "Run詳細",
      selectRun: "Runを選択",
      selectRunBody: "左のRun履歴からRunを選ぶと、goal、plan、tool calls、eval、HITL、rollback、面接説明メモを確認できます。",
      failureTaxonomy: "失敗分類",
      failureModes: "失敗モード",
      interviewMode: "Interview Mode",
      interviewQuestions: "説明力を補完する質問",
    },
    metrics: [
      ["Runs", "絞り込み後のAI agent workflow run"],
      ["成功率", "{count}件成功"],
      ["警告", "注意が必要だが完了したrun"],
      ["失敗", "safe-stopまたは失敗したrun"],
      ["eval平均", "workflow scoreの平均"],
      ["Cost", "サンプル推定コスト"],
    ],
    labels: {
      visibleCount: "{count}件",
      noRuns: "現在の条件に一致するRunはありません。",
      goal: "Goal",
      plan: "Plan",
      toolCalls: "Tool calls",
      interviewNotes: "面接説明メモ",
      evaluation: "評価",
      result: "結果",
      hitlPolicy: "HITL方針",
      status: "状態",
      failureHandling: "失敗時の扱い",
      severity: "重要度",
      recovery: "復旧方法",
      rollback: "Rollback",
      whyReliability: "なぜ信頼性を示せるか",
      interviewerNotice: "面接官に見てほしいポイント",
      interviewerNoticeBody: "このrunは、agent作業をログ・評価・HITL・rollback・handoverへ分解しており、単なる自動化ではなく運用可能性を説明する材料になります。",
      retryPolicy: "Retry方針",
      risk: "risk",
      eval: "eval",
      minutes: "{count}分",
      dataLoadFailed: "データ読み込み失敗",
      localServer: "local serverで開いてください",
      fileBlocked: "ローカルで直接 file:// として開いた場合はJSON読み込みがブロックされることがあります。npm run serve か python -m http.server 4173 で開いてください。",
    },
    status: { all: "すべて", success: "成功", warning: "警告", failed: "失敗" },
    modes: {
      all: "すべて",
      "research-to-artifact": "調査から成果物化",
      "implementation-verification": "実装・検証",
      "knowledge-ops": "Knowledge Ops",
    },
    risk: { low: "低", medium: "中", high: "高" },
    severity: { low: "低", medium: "中", high: "高" },
    results: { pass: "合格", warning: "警告", fail_safe: "safe-stop" },
    hitlStatus: { not_required: "不要", approved_by_policy: "方針上承認済み", pending: "保留中" },
    runs: {
      "run-20260512-jobdb-001": {
        workflowName: "AI求人市場調査DB更新",
        trigger: "GitHub Issue経由のリモートタスク",
        summary: "privateなAI agent求人調査DBを17行から31行へ拡張し、ranking artifactを再生成して、リモートのGitHub Issueへ結果を報告しました。",
        goal: "日本国内のAI agent / FDE寄り求人をsource付きの構造化DBにし、面接準備とportfolio優先度判断に使えるranking artifactへ変換する。",
        plan: [
          "現在のrepo状態と既存artifactを確認する",
          "公開求人ページをsearchし、通常検索で見つけにくい候補はgrok4cxへ回す",
          "年収帯と要求事項カテゴリを正規化する",
          "JSON、CSV、SQLite、HTML、Markdown artifactを再生成する",
          "件数を検証し、GitHub Issueへ報告する",
        ],
        toolCalls: [
          { purpose: "追加の公開求人を見つける", result: "追加候補を発見" },
          { purpose: "通常検索で見つけにくい公開求人を確認する", result: "4件の候補を取得" },
          { purpose: "data artifactを再生成する", result: "31件の求人を検証" },
          { purpose: "private repo更新をcommit / pushする", result: "push済み" },
        ],
        evaluation: {
          result: "合格",
          criteria: [
            { name: "source追跡性", note: "追加行はすべてURLとsource statusの注意書きを持つ。" },
            { name: "artifact再生成", note: "JSON、CSV、SQLite、HTML、Markdown出力を再生成した。" },
            { name: "portfolio安全性", note: "repoはprivate。将来の公開版には追加の匿名化が必要。" },
          ],
        },
        failure: {
          category: "なし",
          rootCause: "blocking failureはなし。一部source pageはagent掲載のため、年収情報の注意書きを残した。",
          recovery: "DB内でsource_status_estimateとcaveatを見える状態に保つ。",
        },
        hitl: {
          status: "不要",
          reason: "外部公開はなく、credential操作もなく、出力はprivate GitHub contextに留まったため。",
        },
        rollback: {
          condition: "sourceが古い、または年収情報が不整合だと判明した場合は、該当行だけ戻してartifactを再生成する。",
        },
        interviewNotes: [
          {
            question: "AI research workflowをどう信頼できる形にしていますか？",
            answer: "調査を再現可能なdata pipelineとして扱います。source capture、正規化、artifact再生成、検証、caveat表示、最終handover reportまでを一連の流れにし、単なる検索ではなく後からreviewできる成果物にします。",
          },
          {
            question: "なぜHITLは不要でしたか？",
            answer: "このtaskではsensitive dataを外部公開していません。private repoを更新し、private Issueへ報告しただけです。同じartifactを公開する場合は、source freshnessとprivacy sanitizationのHITL reviewが必要です。",
          },
        ],
      },
      "run-20260512-ui-002": {
        workflowName: "Portfolio UI更新と検証",
        trigger: "GitHub Issue経由のリモート依頼",
        summary: "portfolio visualを生成し、READMEとportfolio copyを更新し、testとdeployment確認を行いました。細かいUI文字をimage generationに任せるのは不向きなため、状態はwarningにしています。",
        goal: "project visualを差し替え、portfolio cardの理解しやすさを上げつつ、creditと公開安全性を維持する。",
        plan: [
          "source assetと利用条件を確認する",
          "新しいvisual assetを生成する",
          "READMEのcreditとportfolio cardを更新する",
          "testを実行し、live deploymentを確認する",
          "GitHub Issueへ報告する",
        ],
        toolCalls: [
          { purpose: "visual assetを作成する", result: "asset生成済み" },
          { purpose: "code変更を検証する", result: "合格" },
          { purpose: "deploymentを確認する", result: "合格" },
        ],
        evaluation: {
          result: "警告",
          criteria: [
            { name: "visual clarity", note: "hero imageには使えるが、詳細なDashboard UIには向かない。" },
            { name: "公開安全性", note: "creditと公式linkを追加した。" },
            { name: "deployment", note: "CIとPages deployが成功した。" },
          ],
        },
        failure: {
          category: "visualの文字密度",
          rootCause: "生成画像は高密度で正確なDashboard文字を安定して表現できない。",
          recovery: "高密度な情報はHTML/CSSへ戻し、imagegenはheroやthumbnail用途に限定する。",
        },
        hitl: {
          status: "方針上承認済み",
          reason: "公開向けvisualとcreditにはsource / credit handlingが必要だったため。",
        },
        rollback: {
          condition: "公開visualが誤解を招く、またはcreditが不十分な場合は、portfolio imageとcard copyをrevertする。",
        },
        interviewNotes: [
          {
            question: "AI workflow dashboardでimage generationをどこに使いますか？",
            answer: "高密度な運用UIには使いません。生成画像はportfolio thumbnailや概念的なhero visualに使い、正確な文字、filter、説明はHTMLに置きます。その方が読みやすく、検索でき、保守しやすいからです。",
          },
        ],
      },
      "run-20260512-llmwiki-003": {
        workflowName: "LLMWIKI metadata正規化レーン",
        trigger: "定期またはbatchのknowledge maintenance",
        summary: "生成metadataが許可schemaとcurrent-source boundaryからずれる危険があったため、metadata正規化batchを停止しました。",
        goal: "durableなcurrent-source構造を壊さず、生成summaryを手動管理factへ混ぜずに、markdown metadataを正規化する。",
        plan: [
          "metadata review checklistを読む",
          "小さなbatchで正規化候補を実行する",
          "許可tagとdoc_kindを検証する",
          "ownershipまたはschema boundary違反があればbatchをrejectする",
        ],
        toolCalls: [
          { purpose: "frontmatter schemaを確認する", result: "validation失敗" },
          { purpose: "危険なwriteがないことを確認する", result: "clean" },
        ],
        evaluation: {
          result: "safe-stop",
          criteria: [
            { name: "schema準拠", note: "一部fieldが許可値と一致しなかった。" },
            { name: "source-of-truth boundary", note: "生成summaryがcurrent factを重複させる危険があった。" },
            { name: "safe stop", note: "直接上書きは行われなかった。" },
          ],
        },
        failure: {
          category: "schema boundary risk",
          rootCause: "生成batchがfield-level ownershipとcurrent / historical boundaryを十分に守っていなかった。",
          recovery: "batchをrejectし、promptを締め直し、schema exampleを追加してから再実行する。",
        },
        hitl: {
          status: "保留中",
          reason: "current-source metadataの更新は、将来のroutingとuser-context判断に影響するため。",
        },
        rollback: {
          condition: "もしfileが変更されていた場合は、再実行前にgitから復元する。",
        },
        interviewNotes: [
          {
            question: "knowledge baseを壊す可能性があるAI automationをどう扱いますか？",
            answer: "source-of-truth更新は高risk操作として扱います。agentはmetadataを提案できますが、schema validationとHITL gateでpromote可否を決めます。durable knowledgeを壊すくらいなら、safe stopは成功です。",
          },
        ],
      },
    },
    failureTaxonomy: {
      tool_error: {
        label: "Tool error",
        description: "agentが呼んだtoolが失敗、timeout、または不完全な出力を返した状態。",
        retryPolicy: "operationがidempotentでinputが変わらない場合だけretryする。",
      },
      missing_context: {
        label: "Context不足",
        description: "安全な判断に必要なsource file、policy、user constraint、repo状態が不足している状態。",
        retryPolicy: "自動retryしない。contextを取得するか、clarificationを求める。",
      },
      schema_boundary_risk: {
        label: "Schema / source boundary risk",
        description: "生成内容がschema、field ownership、current-source boundaryに違反する可能性がある状態。",
        retryPolicy: "write前にrejectするかHITLへ回す。",
      },
      visual_text_density: {
        label: "Visualの文字密度",
        description: "生成visual artifactでは、高密度または正確なUI文字を安定して表現できない状態。",
        retryPolicy: "高密度な情報はHTML、SVG、Markdownへ戻す。",
      },
      unsafe_operation: {
        label: "危険操作",
        description: "公開、削除、上書き、private data露出、credential影響が発生しそうな状態。",
        retryPolicy: "停止し、明示的な承認を必須にする。",
      },
    },
    interviewPrompts: [
      "AI workflowを自律実行してよいか、HITLが必要かをどう判断しますか？",
      "成功/失敗以外に、agent workflowを評価するmetricsは何ですか？",
      "AI生成codeやmetadataがrepoを壊さないように、どう防ぎますか？",
      "AI agent workflowを非engineerにも説明可能にするには何を見せますか？",
      "demo agentと運用可能なagent systemの違いは何ですか？",
    ],
  },
  en: {
    documentTitle: "Agent Workflow Reliability Dashboard",
    hero: {
      eyebrow: "Portfolio-safe MVP",
      lead: "Trace, evaluation, HITL, rollback, and handover for operable AI-agent workflows.",
      modeAria: "display mode selector",
      portfolioMode: "Portfolio Mode",
      interviewMode: "Interview Mode",
      languageAria: "language selector",
      panelAria: "dashboard position statement",
      panelKicker: "What this proves",
      panelBody: "AI agents should not stop at a moving demo. This shows the ability to make them operable through evaluation, monitoring, approval, and handover.",
    },
    filters: {
      search: "Search",
      searchPlaceholder: "workflow, tool, failure, HITL...",
      status: "Status",
      mode: "Mode",
    },
    sections: {
      metricsAria: "reliability metrics",
      filtersAria: "filters",
      timelineAria: "run timeline",
      detailAria: "run detail",
      runTimeline: "Run Timeline",
      agentRuns: "Agent runs",
      runDetail: "Run Detail",
      selectRun: "Select a run",
      selectRunBody: "Select a run from the timeline to inspect goal, plan, tool calls, eval, HITL, rollback, and interview notes.",
      failureTaxonomy: "Failure Taxonomy",
      failureModes: "Failure modes",
      interviewMode: "Interview Mode",
      interviewQuestions: "Questions that support explanation skill",
    },
    metrics: [
      ["Runs", "filtered agent workflow runs"],
      ["Success", "{count} passed"],
      ["Warnings", "needs attention but shipped"],
      ["Failures", "safe-stop or failed runs"],
      ["Eval Avg", "mean workflow score"],
      ["Cost", "sample estimated spend"],
    ],
    labels: {
      visibleCount: "{count} runs",
      noRuns: "No runs match the current filters.",
      goal: "Goal",
      plan: "Plan",
      toolCalls: "Tool calls",
      interviewNotes: "Interview notes",
      evaluation: "Evaluation",
      result: "Result",
      hitlPolicy: "HITL policy",
      status: "Status",
      failureHandling: "Failure handling",
      severity: "severity",
      recovery: "Recovery",
      rollback: "Rollback",
      whyReliability: "Why this proves reliability",
      interviewerNotice: "What should an interviewer notice?",
      interviewerNoticeBody: "This run decomposes agent work into logging, evaluation, HITL, rollback, and handover. It is evidence of operability, not just automation.",
      retryPolicy: "Retry policy",
      risk: "risk",
      eval: "eval",
      minutes: "{count} min",
      dataLoadFailed: "Data load failed",
      localServer: "Run through a local server",
      fileBlocked: "If you open this page directly through file://, JSON loading may be blocked. Use npm run serve or python -m http.server 4173.",
    },
    status: { all: "All", success: "Success", warning: "Warning", failed: "Failed" },
    modes: { all: "All" },
    risk: { low: "low", medium: "medium", high: "high" },
    severity: { low: "low", medium: "medium", high: "high" },
    results: { pass: "pass", warning: "warning", fail_safe: "fail_safe" },
    hitlStatus: { not_required: "not_required", approved_by_policy: "approved_by_policy", pending: "pending" },
    runs: {},
    failureTaxonomy: {},
    interviewPrompts: null,
  },
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

function copy() {
  return I18N[state.language] ?? I18N[DEFAULT_LANGUAGE];
}

function getPath(source, path) {
  return path.split(".").reduce((value, key) => value?.[key], source);
}

function interpolate(template, values) {
  return String(template).replaceAll(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

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
  return copy().status[status] ?? status;
}

function modeLabel(mode) {
  return copy().modes[mode] ?? mode;
}

function riskLabel(risk) {
  return copy().risk[risk] ?? risk;
}

function severityLabel(severity) {
  return copy().severity[severity] ?? severity;
}

function resultLabel(result) {
  return copy().results[result] ?? result;
}

function hitlStatusLabel(status) {
  return copy().hitlStatus[status] ?? status;
}

function minutesLabel(value) {
  return interpolate(copy().labels.minutes, { count: value });
}

function tRun(run) {
  return copy().runs?.[run.id] ?? {};
}

function localizedToolCalls(run) {
  const localized = tRun(run).toolCalls ?? [];
  return (run.toolCalls ?? []).map((call, index) => ({
    ...call,
    purpose: localized[index]?.purpose ?? call.purpose,
    result: localized[index]?.result ?? call.result,
  }));
}

function localizedCriteria(run) {
  const localized = tRun(run).evaluation?.criteria ?? [];
  return (run.evaluation?.criteria ?? []).map((item, index) => ({
    ...item,
    name: localized[index]?.name ?? item.name,
    note: localized[index]?.note ?? item.note,
  }));
}

function localizedInterviewNotes(run) {
  const localized = tRun(run).interviewNotes ?? [];
  return (run.interviewNotes ?? []).map((note, index) => ({
    question: localized[index]?.question ?? note.question,
    answer: localized[index]?.answer ?? note.answer,
  }));
}

function localizedRun(run) {
  const localized = tRun(run);
  return {
    ...run,
    workflowName: localized.workflowName ?? run.workflowName,
    trigger: localized.trigger ?? run.trigger,
    summary: localized.summary ?? run.summary,
    goal: localized.goal ?? run.goal,
    plan: localized.plan ?? run.plan,
    toolCalls: localizedToolCalls(run),
    evaluation: {
      ...run.evaluation,
      result: localized.evaluation?.result ?? resultLabel(run.evaluation?.result),
      criteria: localizedCriteria(run),
    },
    failure: {
      ...run.failure,
      category: localized.failure?.category ?? run.failure?.category,
      rootCause: localized.failure?.rootCause ?? run.failure?.rootCause,
      recovery: localized.failure?.recovery ?? run.failure?.recovery,
    },
    hitl: {
      ...run.hitl,
      status: localized.hitl?.status ?? hitlStatusLabel(run.hitl?.status),
      reason: localized.hitl?.reason ?? run.hitl?.reason,
    },
    rollback: {
      ...run.rollback,
      condition: localized.rollback?.condition ?? run.rollback?.condition,
    },
    interviewNotes: localizedInterviewNotes(run),
  };
}

function localizedTaxonomy(item) {
  const localized = copy().failureTaxonomy?.[item.id] ?? {};
  return {
    ...item,
    label: localized.label ?? item.label,
    description: localized.description ?? item.description,
    retryPolicy: localized.retryPolicy ?? item.retryPolicy,
  };
}

function localizedPrompts() {
  return copy().interviewPrompts ?? state.data.interviewPrompts;
}

function allRunText(run) {
  const localized = localizedRun(run);
  return [
    run.id,
    run.workflowName,
    localized.workflowName,
    run.mode,
    modeLabel(run.mode),
    run.trigger,
    localized.trigger,
    run.status,
    statusLabel(run.status),
    run.summary,
    localized.summary,
    run.goal,
    localized.goal,
    run.agentStack?.join(" "),
    run.models?.join(" "),
    run.failure?.category,
    localized.failure?.category,
    run.hitl?.status,
    localized.hitl?.status,
    run.plan?.join(" "),
    localized.plan?.join(" "),
    run.toolCalls?.map((tool) => `${tool.tool} ${tool.purpose} ${tool.result}`).join(" "),
    localized.toolCalls?.map((tool) => `${tool.tool} ${tool.purpose} ${tool.result}`).join(" "),
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

function renderStaticText() {
  const current = copy();
  document.documentElement.lang = state.language;
  document.title = current.documentTitle;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = getPath(current, element.dataset.i18n);
    if (value != null) element.textContent = value;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const value = getPath(current, element.dataset.i18nPlaceholder);
    if (value != null) element.setAttribute("placeholder", value);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    const value = getPath(current, element.dataset.i18nAriaLabel);
    if (value != null) element.setAttribute("aria-label", value);
  });
}

function populateStatusFilter() {
  const selected = state.status;
  els.statusFilter.innerHTML = ["all", "success", "warning", "failed"].map((status) => (
    `<option value="${escapeHtml(status)}">${escapeHtml(statusLabel(status))}</option>`
  )).join("");
  els.statusFilter.value = selected;
}

function populateModeFilter() {
  const selected = state.runMode;
  const modes = [...new Set(state.data.workflows.map((run) => run.mode))].sort();
  els.modeFilter.innerHTML = `<option value="all">${escapeHtml(modeLabel("all"))}</option>${modes.map((mode) => `<option value="${escapeHtml(mode)}">${escapeHtml(modeLabel(mode))}</option>`).join("")}`;
  els.modeFilter.value = selected;
}

function renderMetrics() {
  const runs = filteredRuns();
  const m = calculateMetrics(runs);
  const metricCopy = copy().metrics;
  const cards = [
    [metricCopy[0][0], m.total, metricCopy[0][1]],
    [metricCopy[1][0], m.total ? formatPercent(m.success / m.total) : "0%", interpolate(metricCopy[1][1], { count: m.success })],
    [metricCopy[2][0], m.warning, metricCopy[2][1]],
    [metricCopy[3][0], m.failed, metricCopy[3][1]],
    [metricCopy[4][0], formatScore(m.avgEval), metricCopy[4][1]],
    [metricCopy[5][0], yen(m.totalCost), metricCopy[5][1]],
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
  els.visibleCount.textContent = interpolate(copy().labels.visibleCount, { count: runs.length });
  if (!runs.some((run) => run.id === state.selectedId)) {
    state.selectedId = runs[0]?.id ?? null;
  }
  els.runList.innerHTML = runs.map((run) => {
    const localized = localizedRun(run);
    return `
      <button class="run-item ${run.id === state.selectedId ? "is-selected" : ""}" data-run-id="${escapeHtml(run.id)}">
        <div class="run-item__top">
          <span class="${statusClass(run.status)}">${escapeHtml(statusLabel(run.status))}</span>
          <span class="tag">${escapeHtml(modeLabel(run.mode))}</span>
        </div>
        <h3>${escapeHtml(localized.workflowName)}</h3>
        <p>${escapeHtml(localized.summary)}</p>
        <div class="run-item__meta">
          <span>${escapeHtml(copy().labels.eval)} ${formatScore(run.metrics.evalScore)}</span>
          <span>${escapeHtml(minutesLabel(run.durationMinutes))}</span>
          <span>${yen(run.metrics.costJpyApprox)}</span>
        </div>
      </button>
    `;
  }).join("") || `<div class="empty-state"><p>${escapeHtml(copy().labels.noRuns)}</p></div>`;

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
      <span class="tag">${escapeHtml(copy().labels.risk)}: ${escapeHtml(riskLabel(call.risk))}</span>
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
      <p class="eyebrow">${escapeHtml(copy().sections.runDetail)}</p>
      <h2>${escapeHtml(copy().sections.selectRun)}</h2>
      <p>${escapeHtml(copy().sections.selectRunBody)}</p>
    `;
    return;
  }

  const localized = localizedRun(run);
  els.runDetail.classList.remove("empty-state");
  els.runDetail.innerHTML = `
    <div class="detail-header">
      <div class="detail-title-row">
        <div>
          <p class="eyebrow">${escapeHtml(run.id)}</p>
          <h2>${escapeHtml(localized.workflowName)}</h2>
        </div>
        <span class="${statusClass(run.status)}">${escapeHtml(statusLabel(run.status))}</span>
      </div>
      <p class="detail-summary">${escapeHtml(localized.summary)}</p>
      <div class="tag-row">
        ${run.agentStack.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
      </div>
    </div>

    <div class="detail-columns">
      <div>
        <section class="info-block">
          <h3>${escapeHtml(copy().labels.goal)}</h3>
          <p>${escapeHtml(localized.goal)}</p>
        </section>
        <section class="info-block">
          <h3>${escapeHtml(copy().labels.plan)}</h3>
          ${listItems(localized.plan)}
        </section>
        <section class="info-block">
          <h3>${escapeHtml(copy().labels.toolCalls)}</h3>
          ${renderToolCalls(localized.toolCalls)}
        </section>
        <section class="info-block interview-only">
          <h3>${escapeHtml(copy().labels.interviewNotes)}</h3>
          ${renderInterviewNotes(localized.interviewNotes)}
        </section>
      </div>

      <div>
        <section class="info-block">
          <h3>${escapeHtml(copy().labels.evaluation)}</h3>
          <p><strong>${escapeHtml(copy().labels.result)}:</strong> ${escapeHtml(localized.evaluation.result)}</p>
          ${renderCriteria(localized.evaluation.criteria)}
        </section>
        <section class="info-block">
          <h3>${escapeHtml(copy().labels.hitlPolicy)}</h3>
          <p><strong>${escapeHtml(copy().labels.status)}:</strong> ${escapeHtml(localized.hitl.status)}</p>
          <p>${escapeHtml(localized.hitl.reason)}</p>
        </section>
        <section class="info-block ${run.failure.severity === "high" ? "notice" : ""}">
          <h3>${escapeHtml(copy().labels.failureHandling)}</h3>
          <p><strong>${escapeHtml(localized.failure.category)}</strong> · ${escapeHtml(copy().labels.severity)}: ${escapeHtml(severityLabel(run.failure.severity))}</p>
          <p>${escapeHtml(localized.failure.rootCause)}</p>
          <p><strong>${escapeHtml(copy().labels.recovery)}:</strong> ${escapeHtml(localized.failure.recovery)}</p>
        </section>
        <section class="info-block">
          <h3>${escapeHtml(copy().labels.rollback)}</h3>
          <p>${escapeHtml(localized.rollback.condition)}</p>
          <code>${escapeHtml(run.rollback.command)}</code>
        </section>
        <section class="info-block interview-only">
          <h3>${escapeHtml(copy().labels.whyReliability)}</h3>
          <details open>
            <summary>${escapeHtml(copy().labels.interviewerNotice)}</summary>
            <p>${escapeHtml(copy().labels.interviewerNoticeBody)}</p>
          </details>
        </section>
      </div>
    </div>
  `;
}

function renderTaxonomy() {
  els.failureTaxonomy.innerHTML = state.data.failureTaxonomy.map((item) => {
    const localized = localizedTaxonomy(item);
    return `
      <article class="taxonomy-item">
        <h3>${escapeHtml(localized.label)}</h3>
        <p>${escapeHtml(localized.description)}</p>
        <details>
          <summary>${escapeHtml(copy().labels.retryPolicy)}</summary>
          <p>${escapeHtml(localized.retryPolicy)}</p>
        </details>
      </article>
    `;
  }).join("");
}

function renderPrompts() {
  els.interviewPrompts.innerHTML = localizedPrompts().map((prompt, index) => `
    <article class="prompt-item">
      <h3>Q${index + 1}</h3>
      <p>${escapeHtml(prompt)}</p>
    </article>
  `).join("");
}

function render() {
  document.body.dataset.mode = state.viewMode;
  document.body.dataset.lang = state.language;
  document.querySelectorAll(".mode-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === state.viewMode);
  });
  document.querySelectorAll(".lang-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.lang === state.language);
  });
  renderMetrics();
  renderRunList();
  renderRunDetail();
}

function rerenderLanguage() {
  renderStaticText();
  populateStatusFilter();
  populateModeFilter();
  renderTaxonomy();
  renderPrompts();
  render();
}

function bindEvents() {
  document.querySelectorAll(".mode-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.viewMode = button.dataset.mode;
      render();
    });
  });
  document.querySelectorAll(".lang-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.language = button.dataset.lang;
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, state.language);
      } catch (_) {
        // Language still changes for the current session.
      }
      rerenderLanguage();
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
    renderStaticText();
    populateStatusFilter();
    populateModeFilter();
    renderTaxonomy();
    renderPrompts();
    bindEvents();
    render();
  } catch (error) {
    renderStaticText();
    document.querySelector("main").innerHTML = `
      <section class="card notice">
        <p class="eyebrow">${escapeHtml(copy().labels.dataLoadFailed)}</p>
        <h2>${escapeHtml(copy().labels.localServer)}</h2>
        <p>${escapeHtml(error.message)}</p>
        <p>${escapeHtml(copy().labels.fileBlocked)}</p>
      </section>
    `;
  }
}

init();
