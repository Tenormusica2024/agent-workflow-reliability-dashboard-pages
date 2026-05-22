import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const tmpDir = path.join(root, "tmp");
const dataPath = path.join(root, "runtime-flow", "sample-runs.json");
fs.mkdirSync(tmpDir, { recursive: true });
const smokeRunDir = fs.mkdtempSync(path.join(tmpDir, "runtime-flow-browser-"));
const screenshotPath = path.join(smokeRunDir, "screenshot.png");
let data;

function assert(condition, message) {
  if (!condition) throw new Error(`runtime-flow browser smoke: ${message}`);
}

function assertIncludes(haystack, needle, label) {
  assert(haystack.includes(needle), `${label} missing: ${needle}`);
}

function assertNotIncludes(haystack, needle, label) {
  assert(!haystack.toLowerCase().includes(needle.toLowerCase()), `${label} must not include: ${needle}`);
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
  }[ext] || "application/octet-stream";
}

function safeFilePath(urlPath) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(urlPath.split("?")[0]);
  } catch (_) {
    return null;
  }
  const relativePath = decodedPath.replace(/^\/+/, "") || "index.html";
  const candidate = path.resolve(root, relativePath.endsWith("/") ? path.join(relativePath, "index.html") : relativePath);
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) return null;
  return candidate;
}

function createStaticServer() {
  return http.createServer((req, res) => {
    const requestedPath = safeFilePath(req.url || "/");
    if (!requestedPath || !fs.existsSync(requestedPath) || !fs.statSync(requestedPath).isFile()) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("not found");
      return;
    }
    res.writeHead(200, {
      "content-type": contentType(requestedPath),
      "cache-control": "no-store",
    });
    fs.createReadStream(requestedPath).pipe(res);
  });
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server.address().port;
}

function executableExists(candidate) {
  try {
    fs.accessSync(candidate, fs.constants.X_OK);
    return true;
  } catch (_) {
    return fs.existsSync(candidate);
  }
}

function commandCandidates(command) {
  const pathEnv = process.env.PATH || "";
  const extensions = process.platform === "win32"
    ? (process.env.PATHEXT || ".EXE;.CMD;.BAT").split(";")
    : [""];
  const matches = [];
  for (const dir of pathEnv.split(path.delimiter)) {
    if (!dir) continue;
    for (const ext of extensions) {
      matches.push(path.join(dir, `${command}${ext.toLowerCase()}`));
      matches.push(path.join(dir, `${command}${ext.toUpperCase()}`));
    }
  }
  return matches;
}

function findBrowser() {
  const envCandidates = [process.env.CHROME_BIN, process.env.BROWSER_BIN].filter(Boolean);
  const platformCandidates = process.platform === "win32" ? [
    path.join(process.env.PROGRAMFILES || "", "Google", "Chrome", "Application", "chrome.exe"),
    path.join(process.env["PROGRAMFILES(X86)"] || "", "Google", "Chrome", "Application", "chrome.exe"),
    path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe"),
    path.join(process.env.PROGRAMFILES || "", "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(process.env["PROGRAMFILES(X86)"] || "", "Microsoft", "Edge", "Application", "msedge.exe"),
  ] : process.platform === "darwin" ? [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ] : [
    ...commandCandidates("google-chrome"),
    ...commandCandidates("google-chrome-stable"),
    ...commandCandidates("chromium"),
    ...commandCandidates("chromium-browser"),
    ...commandCandidates("microsoft-edge"),
    ...commandCandidates("microsoft-edge-stable"),
  ];
  return [...envCandidates, ...platformCandidates].find((candidate) => candidate && executableExists(candidate));
}

function runBrowser(browserPath, args, timeoutMs = 30_000) {
  return new Promise((resolve, reject) => {
    const child = spawn(browserPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`browser timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`browser exited with ${code}\n${stderr}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function baseBrowserArgs(url) {
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--disable-extensions",
    "--hide-scrollbars",
    "--no-default-browser-check",
    "--no-first-run",
    `--user-data-dir=${path.join(smokeRunDir, "chrome-profile")}`,
    "--window-size=1792,1500",
    "--force-device-scale-factor=1",
    "--virtual-time-budget=6000",
  ];
  if (process.platform !== "win32") args.push("--no-sandbox");
  args.push(url);
  return args;
}

async function dumpDom(browserPath, url) {
  const args = baseBrowserArgs(url);
  args.splice(args.length - 1, 0, "--dump-dom");
  const { stdout } = await runBrowser(browserPath, args);
  return stdout;
}

async function captureScreenshot(browserPath, url) {
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.rmSync(screenshotPath, { force: true });
  const args = baseBrowserArgs(url);
  args.splice(args.length - 1, 0, `--screenshot=${screenshotPath}`);
  await runBrowser(browserPath, args);
  const stat = fs.statSync(screenshotPath);
  assert(stat.size > 10_000, `screenshot too small: ${stat.size} bytes`);
  return stat.size;
}

function assertNoRenderError(dom, label) {
  for (const needle of [
    "data load failed",
    "Error response",
    "not found",
    "データ読み込みエラー",
    "表示するワークフローがありません",
  ]) {
    assertNotIncludes(dom, needle, label);
  }
}

function classTokenCount(dom, token) {
  return [...dom.matchAll(/class="([^"]*)"/g)]
    .filter(([, classes]) => classes.split(/\s+/).includes(token))
    .length;
}

function hasClassTokens(dom, tokens) {
  return [...dom.matchAll(/class="([^"]*)"/g)]
    .some(([, classes]) => {
      const classSet = new Set(classes.split(/\s+/));
      return tokens.every((token) => classSet.has(token));
    });
}

function tagWithAttribute(dom, tagName, attributeName, attributeValue) {
  const tagPattern = new RegExp(`<${tagName}\\b[^>]*>`, "g");
  const attrPattern = new RegExp(`${attributeName}="${attributeValue}"`);
  return [...dom.matchAll(tagPattern)]
    .map(([tag]) => tag)
    .find((tag) => attrPattern.test(tag));
}

function tagHasClassTokens(tag, tokens) {
  const match = tag?.match(/class="([^"]*)"/);
  if (!match) return false;
  const classSet = new Set(match[1].split(/\s+/));
  return tokens.every((token) => classSet.has(token));
}

function assertSelectedWorkflow(dom, workflowId, expectedTexts = []) {
  const selectedCard = tagWithAttribute(dom, "button", "data-workflow-id", workflowId);
  const selectedOption = tagWithAttribute(dom, "option", "value", workflowId);
  assert(tagHasClassTokens(selectedCard, ["program-card", "is-selected"]), `selected program card missing for ${workflowId}`);
  assert(selectedOption?.includes("selected"), `selected workflow option missing for ${workflowId}`);
  for (const text of expectedTexts) {
    assertIncludes(dom, text, `selected workflow ${workflowId}`);
  }
}

function assertDefaultRuntimeFlow(dom) {
  assertNoRenderError(dom, "default runtime-flow DOM");
  assert(data.workflows.length >= 5, "runtime-flow browser smoke expects at least 5 workflows");
  const programCardCount = classTokenCount(dom, "program-card");
  assert(programCardCount === data.workflows.length, `program-card count ${programCardCount} did not match workflows ${data.workflows.length}`);
  assertIncludes(dom, `<strong>${data.workflows.length}</strong>`, "default runtime-flow DOM");
  for (const needle of [
    "Agent Workflow Reliability Dashboard",
    "AIエージェント内部構成",
    "定期実行プログラム切替",
    "programs",
    "実タスクスケジューラへ移せる取り込みフロー",
    "Agent Runtime Flow",
    "Scheduler 接続情報",
    "program-card",
    "flow-map",
    "scheduler-bridge",
    "scheduler-rail",
    "runtime-card",
    "public-support-routing-health",
    "public-knowledge-curation-health",
    "public-transaction-check-health",
    "public-ops-report-health",
    "public-quality-review-health",
  ]) {
    assertIncludes(dom, needle, "default runtime-flow DOM");
  }
}

function assertProfileRuntimeFlow(dom) {
  assertNoRenderError(dom, "profile-selected runtime-flow DOM");
  assert(hasClassTokens(dom, ["program-card", "is-selected"]), "profile-selected runtime-flow DOM missing selected program card");
  assertSelectedWorkflow(dom, "quality-review-agent", ["品質確認AI", "quality-review-30m", "public-quality-review-health"]);
  for (const needle of [
    "Scheduler 接続情報",
  ]) {
    assertIncludes(dom, needle, "profile-selected runtime-flow DOM");
  }
}

let server;
try {
  data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const browserPath = findBrowser();
  assert(browserPath, `Chrome/Chromium/Edge executable not found on ${os.platform()}`);

  server = createStaticServer();
  const port = await listen(server);
  const baseUrl = `http://127.0.0.1:${port}/runtime-flow/`;
  const defaultUrl = `${baseUrl}?smoke=runtime-flow-browser`;
  const profileUrl = `${baseUrl}?profile=quality-review-30m&smoke=runtime-flow-browser`;
  const workflowAliasUrl = `${baseUrl}?workflow=quality-review-agent&smoke=runtime-flow-browser`;
  const profileAsWorkflowIdUrl = `${baseUrl}?profile=quality-review-agent&smoke=runtime-flow-browser`;
  const mixedFallbackUrl = `${baseUrl}?profile=missing-profile&workflow=quality-review-agent&smoke=runtime-flow-browser`;
  const defaultDom = await dumpDom(browserPath, defaultUrl);
  assertDefaultRuntimeFlow(defaultDom);
  const profileDom = await dumpDom(browserPath, profileUrl);
  assertProfileRuntimeFlow(profileDom);
  const workflowAliasDom = await dumpDom(browserPath, workflowAliasUrl);
  assertProfileRuntimeFlow(workflowAliasDom);
  const profileAsWorkflowIdDom = await dumpDom(browserPath, profileAsWorkflowIdUrl);
  assertProfileRuntimeFlow(profileAsWorkflowIdDom);
  const mixedFallbackDom = await dumpDom(browserPath, mixedFallbackUrl);
  assertProfileRuntimeFlow(mixedFallbackDom);
  const screenshotSize = await captureScreenshot(browserPath, defaultUrl);
  console.log(`OK: runtime-flow browser smoke passed (${path.basename(browserPath)}, screenshot ${screenshotSize} bytes)`);
} finally {
  if (server?.listening) {
    await new Promise((resolve) => server.close(resolve));
  }
  try {
    fs.rmSync(smokeRunDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  } catch (error) {
    console.warn(`WARN: cleanup failed for ${smokeRunDir}: ${error.message}`);
  }
}
