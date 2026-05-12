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
  "AI開発workflow図",
  "evalをgateにする",
  "workflowの中にevalを入れる意味",
  "公開しにくい個別task",
  "language-switch",
]) {
  if (!combined.includes(needle)) throw new Error(`${needle} missing`);
}

for (const needle of ["workflow-layout", "workflow-map", "flow-node", "step-detail", "@media"]) {
  if (!css.includes(needle)) throw new Error(`${needle} CSS missing`);
}

for (const banned of ["AI求人市場調査", "job-market research", "年収", "salary band"]) {
  if (combined.includes(banned)) throw new Error(`public-facing banned term remained: ${banned}`);
}

console.log("OK: workflow blueprint smoke check passed");
