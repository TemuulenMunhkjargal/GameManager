import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { assertNoNestedInstaller } from "./desktop-package-guard.mjs";

const projectRoot = process.cwd();
const standaloneRoot = path.join(projectRoot, ".next", "standalone");

if (!existsSync(path.join(standaloneRoot, "server.js"))) {
  throw new Error("Standalone Next.js output is missing. Run npm run build first.");
}

for (const disposableDirectory of ["artifacts", "release"]) {
  rmSync(path.join(standaloneRoot, disposableDirectory), { recursive: true, force: true });
}

assertNoNestedInstaller(standaloneRoot);

const staticSource = path.join(projectRoot, ".next", "static");
const staticDestination = path.join(standaloneRoot, ".next", "static");
mkdirSync(path.dirname(staticDestination), { recursive: true });
cpSync(staticSource, staticDestination, { recursive: true, force: true });

const sqliteNativeSource = path.join(
  projectRoot,
  "node_modules",
  "better-sqlite3",
  "build",
);
const sqliteNativeDestination = path.join(
  standaloneRoot,
  "node_modules",
  "better-sqlite3",
  "build",
);

if (!existsSync(sqliteNativeSource)) {
  throw new Error("The better-sqlite3 native binary is missing. Run npm install first.");
}

cpSync(sqliteNativeSource, sqliteNativeDestination, {
  recursive: true,
  force: true,
});

// electron-builder intentionally filters nested folders named node_modules
// from extraResources. Mirror the standalone dependencies under a neutral
// directory name and expose it through NODE_PATH in the desktop process.
const standaloneModules = path.join(standaloneRoot, "node_modules");
const packagedModules = path.join(standaloneRoot, "server_modules");
rmSync(packagedModules, { recursive: true, force: true });
cpSync(
  standaloneModules,
  packagedModules,
  { recursive: true, force: true },
);
rmSync(standaloneModules, { recursive: true, force: true });

for (const disposableFile of ["package-lock.json", "tsconfig.tsbuildinfo"]) {
  rmSync(path.join(standaloneRoot, disposableFile), { force: true });
}

const publicSource = path.join(projectRoot, "public");
if (existsSync(publicSource)) {
  cpSync(publicSource, path.join(standaloneRoot, "public"), {
    recursive: true,
    force: true,
  });
}

if (process.platform !== "win32") {
  throw new Error("The current desktop packaging target supports Windows only.");
}

const runtimeDirectory = path.join(projectRoot, ".desktop-runtime");
rmSync(runtimeDirectory, { recursive: true, force: true });
mkdirSync(runtimeDirectory, { recursive: true });
copyFileSync(process.execPath, path.join(runtimeDirectory, "node.exe"));

console.log("Prepared standalone server for desktop packaging.");
