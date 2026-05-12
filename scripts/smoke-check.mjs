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
const data = JSON.parse(fs.readFileSync(path.join(root, "sample-runs.json"), "utf8"));
const combined = `${html}\n${app}\n${css}\n${JSON.stringify(data)}`;

for (const needle of [
  "エージェント実行トリアージ",
  "トレースツリー",
  "トレース・ウォーターフォール",
  "原因推定アシスタント",
  "ツール入力（秘匿済み）",
  "評価（トレース単位）",
  "関連ログとエラー",
  "workflowSelect",
  "sample-runs.json",
]) {
  if (!combined.includes(needle)) throw new Error(`${needle} missing`);
}

for (const cssNeedle of [
  "triage-app",
  "sidebar",
  "incident-card",
  "main-grid",
  "trace-row",
  "span-bar",
  "hypothesis",
  "bottom-grid",
  "@media",
]) {
  if (!css.includes(cssNeedle)) throw new Error(`${cssNeedle} CSS missing`);
}

if (!Array.isArray(data.workflows) || data.workflows.length < 2) {
  throw new Error("multi-workflow sample data missing");
}

for (const banned of ["AI求人市場調査", "salary band", "年" + "収", "client" + " name", "employer" + " private", "pass" + "word"]) {
  if (combined.toLowerCase().includes(banned.toLowerCase())) throw new Error(`public-facing banned term remained: ${banned}`);
}

console.log("OK: trace triage dashboard smoke check passed");
