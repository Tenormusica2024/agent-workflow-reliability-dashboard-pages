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

for (const needle of ["Portfolio Mode", "Interview Mode", "Run Timeline", "sample-runs.json"]) {
  if (!html.includes(needle) && !app.includes(needle)) throw new Error(`${needle} not referenced`);
}
for (const needle of ["dashboard-grid", "metrics-grid", "@media"]) {
  if (!css.includes(needle)) throw new Error(`${needle} CSS missing`);
}

console.log("OK: static dashboard smoke check passed");
