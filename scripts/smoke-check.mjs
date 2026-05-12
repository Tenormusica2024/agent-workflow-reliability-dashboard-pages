import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/(.:\/)/, "$1"));
const requiredFiles = ["index.html", "styles.css", "app.js", "sample-runs.json", "README.md"];
for (const file of requiredFiles) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) throw new Error(`${file} missing`);
  if (fs.statSync(fullPath).size <= 0) throw new Error(`${file} empty`);
}

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const data = fs.readFileSync(path.join(root, "sample-runs.json"), "utf8");
const combined = `${html}\n${app}\n${css}\n${data}`;

for (const needle of [
  "エージェント実行トリアージ",
  "トレースツリー",
  "トレース・ウォーターフォール",
  "原因推定アシスタント",
  "評価（トレース単位）",
  "sample-runs.json",
]) {
  if (!combined.includes(needle)) throw new Error(`${needle} missing`);
}

for (const cssNeedle of ["triage-app", "sidebar", "incident-card", "main-grid", "trace-row", "span-bar", "bottom-grid"]) {
  if (!css.includes(cssNeedle)) throw new Error(`${cssNeedle} CSS missing`);
}

for (const term of ["crm" + ".internal", "payments" + ".internal", "billing" + ".internal", "policy" + ".internal"]) {
  if (combined.includes(term)) throw new Error(`internal-looking term remained: ${term}`);
}

console.log("OK: public dashboard smoke check passed");

