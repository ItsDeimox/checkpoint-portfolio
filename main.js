const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const fsp = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");

const MANAGED_DIR = "portfolio";
const MARKER_FILE = ".portfolio-editor.json";
const WORKFLOW_FILE = path.join(".github", "workflows", "portfolio-pages.yml");
const TEMPLATE_FILES = ["index.html", "styles.css", "site.js", "content.json"];

let mainWindow;
let previewWindow;
let previewServer;
let currentRepository;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 680,
    backgroundColor: "#08111f",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  mainWindow.loadFile("editor.html");
}

function parseRepositoryUrl(value) {
  const input = String(value || "").trim().replace(/\/$/, "");
  let owner;
  let repo;
  const sshMatch = input.match(/^git@github\.com:([\w.-]+)\/([\w.-]+?)(?:\.git)?$/i);

  if (sshMatch) {
    [, owner, repo] = sshMatch;
  } else {
    let parsed;
    try {
      parsed = new URL(input);
    } catch {
      throw new Error("Cole uma URL valida de repositorio do GitHub.");
    }
    if (parsed.protocol !== "https:" || parsed.hostname.toLowerCase() !== "github.com") {
      throw new Error("Por seguranca, somente URLs HTTPS do github.com sao aceitas.");
    }
    const parts = parsed.pathname.replace(/^\/+|\/+$/g, "").split("/");
    if (parts.length !== 2) {
      throw new Error("Use a URL principal do repositorio, como https://github.com/usuario/projeto.");
    }
    [owner, repo] = parts;
    repo = repo.replace(/\.git$/i, "");
  }

  if (!owner || !repo || !/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) {
    throw new Error("A URL do repositorio nao foi reconhecida.");
  }

  return {
    owner,
    repo,
    cloneUrl: input.startsWith("git@") ? input : `https://github.com/${owner}/${repo}.git`,
    webUrl: `https://github.com/${owner}/${repo}`,
    settingsUrl: `https://github.com/${owner}/${repo}/settings/pages`,
    siteUrl: repo.toLowerCase() === `${owner.toLowerCase()}.github.io`
      ? `https://${owner}.github.io/`
      : `https://${owner}.github.io/${repo}/`
  };
}

function run(command, args, cwd, allowedExitCodes = [0]) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      windowsHide: true,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" }
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (allowedExitCodes.includes(code)) {
        resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() });
      } else {
        reject(new Error(stderr.trim() || stdout.trim() || `${command} terminou com codigo ${code}.`));
      }
    });
  });
}

async function exists(target) {
  try {
    await fsp.access(target);
    return true;
  } catch {
    return false;
  }
}

async function directoryHasFiles(target) {
  if (!(await exists(target))) return false;
  return (await fsp.readdir(target)).length > 0;
}

async function getBranch(repoPath) {
  const result = await run("git", ["branch", "--show-current"], repoPath);
  return result.stdout || "main";
}

function workflowFor(branch) {
  return `name: Publicar portfolio\n\n` +
    `on:\n` +
    `  push:\n` +
    `    branches: [${JSON.stringify(branch)}]\n` +
    `    paths:\n` +
    `      - "portfolio/**"\n` +
    `      - ".github/workflows/portfolio-pages.yml"\n` +
    `  workflow_dispatch:\n\n` +
    `permissions:\n` +
    `  contents: read\n` +
    `  pages: write\n` +
    `  id-token: write\n\n` +
    `concurrency:\n` +
    `  group: pages\n` +
    `  cancel-in-progress: false\n\n` +
    `jobs:\n` +
    `  deploy:\n` +
    `    environment:\n` +
    `      name: github-pages\n` +
    `      url: \${{ steps.deployment.outputs.page_url }}\n` +
    `    runs-on: ubuntu-latest\n` +
    `    steps:\n` +
    `      - uses: actions/checkout@v4\n` +
    `      - uses: actions/configure-pages@v5\n` +
    `      - uses: actions/upload-pages-artifact@v4\n` +
    `        with:\n` +
    `          path: portfolio\n` +
    `      - name: Publicar no GitHub Pages\n` +
    `        id: deployment\n` +
    `        uses: actions/deploy-pages@v4\n`;
}

async function scaffoldPortfolio(repoPath) {
  const marker = path.join(repoPath, MARKER_FILE);
  const sitePath = path.join(repoPath, MANAGED_DIR);
  const isManaged = await exists(marker);

  if (!isManaged && await directoryHasFiles(sitePath)) {
    throw new Error(`A pasta ${MANAGED_DIR} ja existe e nao foi criada por este app. Use um repositorio dedicado ou renomeie essa pasta.`);
  }

  if (!isManaged) {
    await fsp.mkdir(sitePath, { recursive: true });
    for (const filename of TEMPLATE_FILES) {
      await fsp.copyFile(path.join(__dirname, filename), path.join(sitePath, filename));
    }
    await fsp.writeFile(path.join(sitePath, ".nojekyll"), "", "utf8");
    await fsp.writeFile(marker, JSON.stringify({ schema: 1, managedDirectory: MANAGED_DIR }, null, 2) + "\n", "utf8");
  }

  const workflowPath = path.join(repoPath, WORKFLOW_FILE);
  if (!(await exists(workflowPath))) {
    await fsp.mkdir(path.dirname(workflowPath), { recursive: true });
    await fsp.writeFile(workflowPath, workflowFor(await getBranch(repoPath)), "utf8");
  }
}

async function connectRepository(repositoryUrl) {
  const info = parseRepositoryUrl(repositoryUrl);
  const repositoriesRoot = path.join(app.getPath("userData"), "repositories");
  const repoPath = path.join(repositoriesRoot, `${info.owner}--${info.repo}`);
  await fsp.mkdir(repositoriesRoot, { recursive: true });

  if (await exists(path.join(repoPath, ".git"))) {
    const remote = await run("git", ["remote", "get-url", "origin"], repoPath);
    const remoteInfo = parseRepositoryUrl(remote.stdout);
    if (remoteInfo.owner.toLowerCase() !== info.owner.toLowerCase() || remoteInfo.repo.toLowerCase() !== info.repo.toLowerCase()) {
      throw new Error("A pasta local esta ligada a outro repositorio.");
    }
    const status = await run("git", ["status", "--porcelain"], repoPath);
    if (!status.stdout) await run("git", ["pull", "--ff-only"], repoPath, [0, 1]);
  } else {
    await run("git", ["clone", info.cloneUrl, repoPath], repositoriesRoot);
  }

  await scaffoldPortfolio(repoPath);
  currentRepository = { ...info, path: repoPath };
  const raw = await fsp.readFile(path.join(repoPath, MANAGED_DIR, "content.json"), "utf8");
  return { repository: publicRepository(), content: JSON.parse(raw) };
}

function requireRepository() {
  if (!currentRepository) throw new Error("Conecte um repositorio primeiro.");
  return currentRepository;
}

function publicRepository() {
  const repo = requireRepository();
  return {
    owner: repo.owner,
    name: repo.repo,
    webUrl: repo.webUrl,
    settingsUrl: repo.settingsUrl,
    siteUrl: repo.siteUrl
  };
}

async function cleanUnusedAssets(content) {
  const repo = requireRepository();
  const assetsPath = path.join(repo.path, MANAGED_DIR, "assets");
  if (!(await exists(assetsPath))) return;
  const used = new Set();
  for (const project of content.projects || []) {
    for (const media of project.media || []) {
      if (typeof media.src === "string" && media.src.startsWith("./assets/")) used.add(path.basename(media.src));
    }
  }
  for (const filename of await fsp.readdir(assetsPath)) {
    if (!used.has(filename)) await fsp.rm(path.join(assetsPath, filename));
  }
}

async function saveContent(content) {
  const repo = requireRepository();
  if (!content || typeof content !== "object" || !content.profile || !Array.isArray(content.projects)) {
    throw new Error("O conteudo do portfolio esta invalido.");
  }
  const contentPath = path.join(repo.path, MANAGED_DIR, "content.json");
  const temporaryPath = `${contentPath}.tmp`;
  await fsp.writeFile(temporaryPath, JSON.stringify(content, null, 2) + "\n", "utf8");
  await fsp.rename(temporaryPath, contentPath);
  await cleanUnusedAssets(content);
  return { saved: true };
}

async function importMedia() {
  const repo = requireRepository();
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Selecionar imagens, GIFs ou videos",
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "Midia", extensions: ["png", "jpg", "jpeg", "webp", "gif", "mp4", "webm", "mov"] }]
  });
  if (result.canceled) return [];

  const assetsPath = path.join(repo.path, MANAGED_DIR, "assets");
  await fsp.mkdir(assetsPath, { recursive: true });
  const imported = [];
  for (const sourcePath of result.filePaths) {
    const extension = path.extname(sourcePath).toLowerCase();
    const base = path.basename(sourcePath, extension).replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "media";
    const filename = `${base}-${crypto.randomBytes(4).toString("hex")}${extension}`;
    await fsp.copyFile(sourcePath, path.join(assetsPath, filename));
    imported.push({
      type: [".mp4", ".webm", ".mov"].includes(extension) ? "video" : "image",
      src: `./assets/${filename}`,
      alt: path.basename(sourcePath)
    });
  }
  return imported;
}

function contentType(filename) {
  const types = {
    ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
    ".gif": "image/gif", ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime"
  };
  return types[path.extname(filename).toLowerCase()] || "application/octet-stream";
}

async function openPreview() {
  const repo = requireRepository();
  const root = path.resolve(repo.path, MANAGED_DIR);
  if (previewServer) previewServer.close();
  previewServer = http.createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
      const requested = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
      const target = path.resolve(root, requested);
      if (target !== root && !target.startsWith(root + path.sep)) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const data = await fsp.readFile(target);
      response.writeHead(200, { "Content-Type": contentType(target), "Cache-Control": "no-store" });
      response.end(data);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
  await new Promise((resolve) => previewServer.listen(0, "127.0.0.1", resolve));
  const { port } = previewServer.address();
  if (previewWindow && !previewWindow.isDestroyed()) previewWindow.close();
  previewWindow = new BrowserWindow({ width: 1200, height: 800, backgroundColor: "#08111f" });
  await previewWindow.loadURL(`http://127.0.0.1:${port}/`);
  return { opened: true };
}

async function configurePages() {
  const repo = requireRepository();
  try {
    await run("gh", ["auth", "status"], repo.path);
    const current = await run("gh", ["api", `repos/${repo.owner}/${repo.repo}/pages`], repo.path, [0, 1]);
    const method = current.code === 0 ? "PUT" : "POST";
    await run("gh", ["api", "--method", method, `repos/${repo.owner}/${repo.repo}/pages`, "-f", "build_type=workflow"], repo.path);
    return { automatic: true, siteUrl: repo.siteUrl };
  } catch {
    await shell.openExternal(repo.settingsUrl);
    return { automatic: false, settingsUrl: repo.settingsUrl };
  }
}

async function publish(message) {
  const repo = requireRepository();
  await run("git", ["add", "--", MANAGED_DIR, WORKFLOW_FILE, MARKER_FILE], repo.path);
  const staged = await run("git", ["diff", "--cached", "--quiet"], repo.path, [0, 1]);
  if (staged.code === 1) {
    const commitMessage = String(message || "Atualiza portfolio").trim().slice(0, 120) || "Atualiza portfolio";
    await run("git", ["commit", "-m", commitMessage], repo.path);
  }
  const branch = await getBranch(repo.path);
  await run("git", ["push", "-u", "origin", branch], repo.path);
  const pages = await configurePages();
  return { published: true, hadChanges: staged.code === 1, pages, repository: publicRepository() };
}

ipcMain.handle("repository:connect", (_event, url) => connectRepository(url));
ipcMain.handle("portfolio:save", (_event, content) => saveContent(content));
ipcMain.handle("portfolio:import-media", () => importMedia());
ipcMain.handle("portfolio:preview", () => openPreview());
ipcMain.handle("repository:publish", (_event, message) => publish(message));
ipcMain.handle("repository:open", () => shell.openExternal(requireRepository().webUrl));
ipcMain.handle("repository:configure-pages", () => configurePages());

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (previewServer) previewServer.close();
});
