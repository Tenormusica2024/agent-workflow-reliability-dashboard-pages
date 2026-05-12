import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/(.:\/)/, "$1"));
const requiredFiles = ["index.html", "styles.css", "app.js", "sample-runs.json", "README.md"];
for (const file of requiredFiles) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) throw new Error(`${file} missing`);
  const stat = fs.statSync(fullPath);
  if (stat.size <= 0) throw new Error(`${file} empty`);
}

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const data = fs.readFileSync(path.join(root, "sample-runs.json"), "utf8");
const parsedData = JSON.parse(data);
const combined = `${html}\n${app}\n${css}\n${data}`;

for (const needle of [
  "AI Development",
  "Workflow",
  "Reliability",
  "data-lang=\"ja\"",
  "data-lang=\"en\"",
  "workflowMap",
  "stepDetail",
  "sample-runs.json",
]) {
  if (!combined.includes(needle)) throw new Error(`${needle} not referenced`);
}

for (const needle of [
  "AI開発ワークフロー図",
  "評価基準で次工程を判断する",
  "ワークフローに評価を組み込む意味",
  "公開しにくい個別タスク",
  "language-switch",
]) {
  if (!combined.includes(needle)) throw new Error(`${needle} missing`);
}

for (const needle of ["workflow-layout", "workflow-map", "flow-node", "step-detail", "@media"]) {
  if (!css.includes(needle)) throw new Error(`${needle} CSS missing`);
}

for (const banned of [
  "AI求人市場調査",
  "job-market research",
  "年収",
  "salary band",
  "contextを地図化",
  "evalをgate",
  "gateにする",
  "releaseとhandover",
  "公開safe",
  "tool実行",
  "個別task",
  "test結果",
  "Dashboardの位置づけ",
]) {
  if (combined.includes(banned)) throw new Error(`public-facing banned term remained: ${banned}`);
}

const japaneseText = [];
for (const stage of parsedData.workflowStages ?? []) {
  for (const key of ["title", "short", "output", "explain", "proof"]) {
    if (stage[key]?.ja) japaneseText.push(stage[key].ja);
  }
  for (const tool of stage.tools ?? []) {
    if (tool?.ja) japaneseText.push(tool.ja);
  }
}
for (const card of parsedData.proofCards ?? []) {
  if (card.title?.ja) japaneseText.push(card.title.ja);
  if (card.body?.ja) japaneseText.push(card.body.ja);
}
for (const item of parsedData.qa ?? []) {
  if (item.question?.ja) japaneseText.push(item.question.ja);
  if (item.answer?.ja) japaneseText.push(item.answer.ja);
}

const jaJoined = japaneseText.join("\n");
for (const banned of [
  "Failure Taxonomy",
  "failure taxonomy",
  "Blueprint",
  "Interview Support",
  "Persuasive Explanation",
  "HITL",
  "eval",
  "rollback",
  "trace",
  "rubric",
  "credential",
  "source-of-truth",
  "black box",
  "agent plan",
  "context",
  "repo",
  "docs",
  "commit",
  "risk",
  "field",
  "task brief",
]) {
  if (jaJoined.includes(banned)) throw new Error(`Japanese UI jargon remained: ${banned}`);
}

console.log("OK: workflow blueprint smoke check passed");

