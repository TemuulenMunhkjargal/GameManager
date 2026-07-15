const { spawn } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const { copyFileSync, cpSync, existsSync, mkdirSync } = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { app, BrowserWindow, dialog, Menu, session } = require("electron");

app.setName("GameHall");
app.enableSandbox();

let mainWindow = null;
let serverProcess = null;
let appOrigin = null;
let announcementTimer = null;
const schedulerToken = randomBytes(24).toString("hex");

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) {
      return;
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

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
        if (port) {
          resolve(port);
        } else {
          reject(new Error("Could not allocate a local port."));
        }
      });
    });
  });
}

function waitForServer(url, attempts = 80) {
  return new Promise((resolve, reject) => {
    let remaining = attempts;

    const check = () => {
      const request = http.get(url, (response) => {
        response.resume();

        if (response.statusCode && response.statusCode < 500) {
          resolve();
          return;
        }

        retry();
      });

      request.setTimeout(1000, () => request.destroy());
      request.on("error", retry);
    };

    const retry = () => {
      remaining -= 1;

      if (remaining <= 0) {
        reject(new Error("GameHall's local server did not start in time."));
        return;
      }

      setTimeout(check, 250);
    };

    check();
  });
}

async function startPackagedServer() {
  const port = await getAvailablePort();
  const serverRoot = path.join(process.resourcesPath, "app-server");
  const runtimePath = path.join(process.resourcesPath, "runtime", "node.exe");
  const serverEntry = path.join(serverRoot, "server.js");
  const userData = app.getPath("userData");
  const databasePath = path.join(userData, "gamehall.db");
  const legacyDirectory = path.join(app.getPath("appData"), "CritTable");
  const legacyDatabase = path.join(legacyDirectory, "crittable.db");
  if (!existsSync(databasePath) && existsSync(legacyDatabase)) {
    mkdirSync(userData, { recursive: true });
    for (const suffix of ["", "-wal", "-shm"]) {
      const source = `${legacyDatabase}${suffix}`;
      if (existsSync(source)) copyFileSync(source, `${databasePath}${suffix}`);
    }
    const legacyBackups = path.join(legacyDirectory, "backups");
    const newBackups = path.join(userData, "backups");
    if (existsSync(legacyBackups) && !existsSync(newBackups)) cpSync(legacyBackups, newBackups, { recursive: true });
  }

  serverProcess = spawn(runtimePath, [serverEntry], {
    cwd: serverRoot,
    windowsHide: true,
    stdio: "ignore",
    env: {
      ...process.env,
      NODE_ENV: "production",
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
      GAMEHALL_DB_PATH: databasePath,
      CRON_SECRET: schedulerToken,
      NODE_PATH: path.join(serverRoot, "server_modules"),
    },
  });

  serverProcess.once("exit", (code) => {
    if (!app.isQuitting && code !== 0) {
      dialog.showErrorBox(
        "GameHall stopped",
        "The local application server stopped unexpectedly. Please restart GameHall.",
      );
      app.quit();
    }
  });

  const url = `http://127.0.0.1:${port}`;
  await waitForServer(url);
  return url;
}

function sendDueAnnouncements(origin) {
  const target = new URL("/api/cron/send-announcements", origin);
  const request = http.request(target, { method: "POST", headers: { Authorization: `Bearer ${schedulerToken}` } });
  request.on("error", () => undefined);
  request.end();
}

function createMainWindow(url) {
  appOrigin = new URL(url).origin;
  mainWindow = new BrowserWindow({
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
    },
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, destination) => {
    if (new URL(destination).origin !== appOrigin) {
      event.preventDefault();
    }
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow.loadURL(url);
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  try {
    const url = app.isPackaged
      ? await startPackagedServer()
      : process.env.GAMEHALL_DESKTOP_URL ?? process.env.CRITTABLE_DESKTOP_URL ?? "http://127.0.0.1:3000";
    createMainWindow(url);
    if (app.isPackaged) {
      sendDueAnnouncements(url);
      announcementTimer = setInterval(() => sendDueAnnouncements(url), 60_000);
      announcementTimer.unref();
    }
  } catch (error) {
    dialog.showErrorBox(
      "GameHall could not start",
      error instanceof Error ? error.message : "An unknown startup error occurred.",
    );
    app.quit();
  }
});

app.on("activate", () => {
  if (!mainWindow && appOrigin) {
    createMainWindow(appOrigin);
  }
});

app.on("before-quit", () => {
  app.isQuitting = true;

  if (announcementTimer) {
    clearInterval(announcementTimer);
    announcementTimer = null;
  }

  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
});

app.on("window-all-closed", () => {
  app.quit();
});
