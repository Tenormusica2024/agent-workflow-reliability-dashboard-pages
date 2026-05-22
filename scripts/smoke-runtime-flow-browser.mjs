import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const root = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/(.:\/)/, "$1"));
const tmpDir = path.join(root, "tmp");
const screenshotPath = path.join(tmpDir, "runtime-flow-browser-smoke.png");

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
    "--hide-scrollbars",
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

function assertDefaultRuntimeFlow(dom) {
  assertNoRenderError(dom, "default runtime-flow DOM");
  for (const needle of [
    "Agent Workflow Reliability Dashboard",
    "AIエージェント内部構成",
    "定期実行プログラム切替",
    "5",
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
  for (const needle of [
    "品質確認AI",
    "quality-review-30m",
    "public-quality-review-health",
    "Scheduler 接続情報",
    "program-card is-selected",
  ]) {
    assertIncludes(dom, needle, "profile-selected runtime-flow DOM");
  }
}

const browserPath = findBrowser();
assert(browserPath, `Chrome/Chromium/Edge executable not found on ${os.platform()}`);

const server = createStaticServer();
const port = await listen(server);
const baseUrl = `http://127.0.0.1:${port}/runtime-flow/`;

try {
  const defaultUrl = `${baseUrl}?smoke=runtime-flow-browser`;
  const profileUrl = `${baseUrl}?profile=quality-review-30m&smoke=runtime-flow-browser`;
  const defaultDom = await dumpDom(browserPath, defaultUrl);
  assertDefaultRuntimeFlow(defaultDom);
  const profileDom = await dumpDom(browserPath, profileUrl);
  assertProfileRuntimeFlow(profileDom);
  const screenshotSize = await captureScreenshot(browserPath, defaultUrl);
  console.log(`OK: runtime-flow browser smoke passed (${path.basename(browserPath)}, screenshot ${screenshotSize} bytes)`);
} finally {
  await new Promise((resolve) => server.close(resolve));
}
