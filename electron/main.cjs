const { spawn } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const { copyFileSync, cpSync, existsSync, mkdirSync } = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const { app, BrowserWindow, dialog, Menu, session } = require("electron");
const {
  childHasExited,
  createRotatingLogger,
  createSingleFlight,
  formatError,
  requestLocal,
  stopChildProcess,
  waitForServer,
} = require("./runtime.cjs");

const DESKTOP_COOKIE_NAME = "gamehall_session";
const SCHEDULE_INTERVAL_MS = 60_000;
const schedulerToken = randomBytes(32).toString("hex");
const sessionToken = randomBytes(32).toString("hex");

app.setName("GameHall");
app.enableSandbox();

let mainWindow = null;
let serverProcess = null;
let serverReady = false;
let appOrigin = null;
let desktopSession = null;
let announcementTimer = null;
let maintenanceTimer = null;
const scheduledAbortControllers = new Set();
let isQuitting = false;
let shutdownComplete = false;
let fatalServerFailureHandled = false;
let fatalWindowFailureHandled = false;
let windowRecoveryTimer = null;
let windowRecoveryAttempts = 0;
let unresponsiveDialogOpen = false;
let appLog = () => undefined;
let serverLog = () => undefined;

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
}

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close(() => {
        if (port) resolve(port);
        else reject(new Error("Could not allocate a local port."));
      });
    });
  });
}

function initializeLogging() {
  const logDirectory = path.join(app.getPath("userData"), "logs");
  appLog = createRotatingLogger(path.join(logDirectory, "gamehall.log"));
  serverLog = createRotatingLogger(path.join(logDirectory, "server.log"));
  appLog(`GameHall ${app.getVersion()} starting (packaged=${app.isPackaged}).`);
}

function describeServerExit(code, signal) {
  if (signal) return `The local server was terminated by signal ${signal}.`;
  return `The local server exited with code ${code ?? "unknown"}.`;
}

function handleFatalServerFailure(error) {
  if (fatalServerFailureHandled || isQuitting) return;
  fatalServerFailureHandled = true;
  appLog(`Fatal local-server failure: ${formatError(error)}`);
  dialog.showErrorBox(
    "GameHall stopped",
    "The local application server stopped unexpectedly. Diagnostic logs were saved in GameHall's user-data folder. GameHall will now close.",
  );
  app.quit();
}

function attachServerLogging(child) {
  child.stdout?.on("data", (chunk) => serverLog(`[stdout] ${chunk.toString("utf8")}`));
  child.stderr?.on("data", (chunk) => serverLog(`[stderr] ${chunk.toString("utf8")}`));
}

function attachServerLifecycle(child) {
  child.on("error", (error) => {
    appLog(`Local-server process error: ${formatError(error)}`);
    if (serverReady) handleFatalServerFailure(error);
  });

  child.once("exit", (code, signal) => {
    const message = describeServerExit(code, signal);
    appLog(message);
    if (serverProcess === child) serverProcess = null;
    if (serverReady) handleFatalServerFailure(new Error(message));
  });
}

function waitForStartupOrProcessFailure(child, healthUrl) {
  let processErrorHandler;
  let processExitHandler;
  const processFailure = new Promise((_, reject) => {
    processErrorHandler = (error) => reject(error);
    processExitHandler = (code, signal) => reject(new Error(describeServerExit(code, signal)));
    child.once("error", processErrorHandler);
    child.once("exit", processExitHandler);
  });

  const readiness = waitForServer(healthUrl, {
    headers: { "X-GameHall-Session": sessionToken },
  });

  return Promise.race([readiness, processFailure]).finally(() => {
    child.removeListener("error", processErrorHandler);
    child.removeListener("exit", processExitHandler);
  });
}

function migrateLegacyData(databasePath, userData) {
  const legacyDirectory = path.join(app.getPath("appData"), "CritTable");
  const legacyDatabase = path.join(legacyDirectory, "crittable.db");
  if (existsSync(databasePath) || !existsSync(legacyDatabase)) return;

  mkdirSync(userData, { recursive: true });
  for (const suffix of ["", "-wal", "-shm"]) {
    const source = `${legacyDatabase}${suffix}`;
    if (existsSync(source)) copyFileSync(source, `${databasePath}${suffix}`);
  }

  const legacyBackups = path.join(legacyDirectory, "backups");
  const newBackups = path.join(userData, "backups");
  if (existsSync(legacyBackups) && !existsSync(newBackups)) {
    cpSync(legacyBackups, newBackups, { recursive: true });
  }
  appLog("Migrated legacy CritTable data into the GameHall user-data directory.");
}

async function startPackagedServer() {
  const serverRoot = path.join(process.resourcesPath, "app-server");
  const runtimePath = path.join(process.resourcesPath, "runtime", "node.exe");
  const serverEntry = path.join(serverRoot, "server.js");
  if (!existsSync(runtimePath)) throw new Error("The bundled Node.js runtime is missing.");
  if (!existsSync(serverEntry)) throw new Error("The bundled GameHall server is missing.");

  const userData = app.getPath("userData");
  const databasePath = path.join(userData, "gamehall.db");
  migrateLegacyData(databasePath, userData);
  let lastError = new Error("The local server could not start.");

  // There is necessarily a short gap between releasing the probe socket and
  // Next.js binding it. Retry on a new port if another process wins that race.
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const port = await getAvailablePort();
    const expectedHost = `127.0.0.1:${port}`;
    const child = spawn(runtimePath, [serverEntry], {
      cwd: serverRoot,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        NODE_ENV: "production",
        HOSTNAME: "127.0.0.1",
        PORT: String(port),
        GAMEHALL_DB_PATH: databasePath,
        GAMEHALL_DESKTOP_MODE: "1",
        GAMEHALL_ALLOWED_HOST: expectedHost,
        GAMEHALL_SESSION_TOKEN: sessionToken,
        CRON_SECRET: schedulerToken,
        NODE_PATH: path.join(serverRoot, "server_modules"),
      },
    });

    serverProcess = child;
    attachServerLogging(child);
    attachServerLifecycle(child);
    const origin = `http://${expectedHost}`;

    try {
      await waitForStartupOrProcessFailure(child, `${origin}/api/health`);
      if (childHasExited(child)) throw new Error(describeServerExit(child.exitCode, child.signalCode));
      serverReady = true;
      appLog(`Local server is ready on ${expectedHost}.`);
      return origin;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      appLog(`Local-server startup attempt ${attempt} failed: ${formatError(lastError)}`);
      await stopChildProcess(child, { timeoutMs: 1_000 });
      if (serverProcess === child) serverProcess = null;
    }
  }

  throw lastError;
}

async function configureSession(url) {
  desktopSession = session.fromPartition(`gamehall-${process.pid}`);
  desktopSession.setPermissionCheckHandler(() => false);
  desktopSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));

  if (app.isPackaged) {
    await desktopSession.cookies.set({
      url,
      name: DESKTOP_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      sameSite: "strict",
      path: "/",
    });
  }
}

function stopScheduler() {
  if (announcementTimer) {
    clearInterval(announcementTimer);
    announcementTimer = null;
  }
  if (maintenanceTimer) {
    clearInterval(maintenanceTimer);
    maintenanceTimer = null;
  }
  for (const controller of scheduledAbortControllers) controller.abort();
  scheduledAbortControllers.clear();
}

function createScheduledRequest(origin, pathname) {
  return createSingleFlight(async () => {
    const controller = new AbortController();
    scheduledAbortControllers.add(controller);
    try {
      await requestLocal(new URL(pathname, origin), {
        method: "POST",
        headers: { Authorization: `Bearer ${schedulerToken}` },
        timeoutMs: 10_000,
        signal: controller.signal,
      });
    } catch (error) {
      if (!controller.signal.aborted) appLog(`Scheduled request ${pathname} failed: ${formatError(error)}`);
    } finally {
      scheduledAbortControllers.delete(controller);
    }
  });
}

function startScheduler(origin) {
  const sendAnnouncements = createScheduledRequest(origin, "/api/cron/send-announcements");
  const runMaintenance = createScheduledRequest(origin, "/api/cron/maintenance");
  void sendAnnouncements();
  void runMaintenance();
  announcementTimer = setInterval(() => void sendAnnouncements(), SCHEDULE_INTERVAL_MS);
  announcementTimer.unref();
  maintenanceTimer = setInterval(() => void runMaintenance(), 60 * 60_000);
  maintenanceTimer.unref();
}

function recoverWindow(reason, delayMs = 250) {
  if (isQuitting || !mainWindow || mainWindow.isDestroyed() || !appOrigin) return;
  if (windowRecoveryTimer) return;

  windowRecoveryAttempts += 1;
  appLog(`Renderer recovery ${windowRecoveryAttempts}: ${reason}`);
  if (windowRecoveryAttempts > 3) {
    if (fatalWindowFailureHandled) return;
    fatalWindowFailureHandled = true;
    void dialog.showMessageBox({
      type: "error",
      title: "GameHall could not recover",
      message: "The application window repeatedly stopped responding.",
      detail: "You can restart GameHall now. Diagnostic logs were saved in the GameHall user-data folder.",
      buttons: ["Restart GameHall", "Quit"],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    }).then(({ response }) => {
      if (response === 0) app.relaunch();
      app.quit();
    });
    return;
  }

  windowRecoveryTimer = setTimeout(() => {
    windowRecoveryTimer = null;
    if (!mainWindow || mainWindow.isDestroyed() || isQuitting) return;
    void mainWindow.loadURL(appOrigin).catch((error) => {
      appLog(`Renderer reload failed: ${formatError(error)}`);
    });
  }, delayMs);
  windowRecoveryTimer.unref?.();
}

function createMainWindow(url) {
  appOrigin = new URL(url).origin;
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    backgroundColor: "#071a14",
    icon: app.isPackaged ? path.join(process.resourcesPath, "icon.png") : path.join(__dirname, "..", "build", "icon.png"),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      session: desktopSession,
    },
  });
  mainWindow = window;

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  const guardNavigation = (event, destination) => {
    try {
      if (new URL(destination).origin !== appOrigin) event.preventDefault();
    } catch {
      event.preventDefault();
    }
  };
  window.webContents.on("will-navigate", guardNavigation);
  window.webContents.on("will-redirect", guardNavigation);
  window.webContents.on("did-finish-load", () => {
    windowRecoveryAttempts = 0;
    fatalWindowFailureHandled = false;
  });
  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedUrl, isMainFrame) => {
    if (!isMainFrame || errorCode === -3 || isQuitting) return;
    recoverWindow(`main-frame load failed (${errorCode}: ${errorDescription}) for ${validatedUrl}`);
  });
  window.webContents.on("render-process-gone", (_event, details) => {
    if (isQuitting || details.reason === "clean-exit") return;
    recoverWindow(`renderer process exited (${details.reason}, code ${details.exitCode})`, 100);
  });
  window.on("unresponsive", () => {
    if (unresponsiveDialogOpen) return;
    unresponsiveDialogOpen = true;
    appLog("The main window became unresponsive.");
    void dialog.showMessageBox(window, {
      type: "warning",
      title: "GameHall is not responding",
      message: "The GameHall window stopped responding.",
      detail: "Reloading restores the interface without deleting your local data.",
      buttons: ["Reload window", "Keep waiting"],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    }).then(({ response }) => {
      if (response === 0) recoverWindow("user requested reload after an unresponsive renderer", 0);
    }).finally(() => {
      unresponsiveDialogOpen = false;
    });
  });
  window.on("responsive", () => appLog("The main window became responsive again."));
  window.once("ready-to-show", () => window.show());
  window.on("closed", () => {
    if (mainWindow === window) mainWindow = null;
  });

  void window.loadURL(url).catch((error) => appLog(`Initial window load failed: ${formatError(error)}`));
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  initializeLogging();

  try {
    const url = app.isPackaged
      ? await startPackagedServer()
      : process.env.GAMEHALL_DESKTOP_URL ?? "http://127.0.0.1:3000";
    await configureSession(url);
    createMainWindow(url);
    if (app.isPackaged) startScheduler(url);
  } catch (error) {
    appLog(`Startup failed: ${formatError(error)}`);
    dialog.showErrorBox(
      "GameHall could not start",
      error instanceof Error ? error.message : "An unknown startup error occurred.",
    );
    app.quit();
  }
});

app.on("activate", () => {
  if (!mainWindow && appOrigin) createMainWindow(appOrigin);
});

app.on("before-quit", (event) => {
  isQuitting = true;
  stopScheduler();
  if (windowRecoveryTimer) {
    clearTimeout(windowRecoveryTimer);
    windowRecoveryTimer = null;
  }

  const child = serverProcess;
  if (shutdownComplete || childHasExited(child)) return;

  event.preventDefault();
  serverReady = false;
  void stopChildProcess(child).then(() => {
    if (serverProcess === child) serverProcess = null;
    shutdownComplete = true;
    appLog("GameHall shutdown completed.");
    app.quit();
  });
});

app.on("window-all-closed", () => app.quit());
