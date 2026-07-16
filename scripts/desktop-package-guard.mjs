import { readdirSync } from "node:fs";
import path from "node:path";

export function findNestedInstaller(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = findNestedInstaller(entryPath);
      if (nested) return nested;
    } else if (entry.isFile() && /^GameHall-Setup-.*\.exe$/i.test(entry.name)) {
      return entryPath;
    }
  }

  return null;
}

export function assertNoNestedInstaller(directory) {
  const installer = findNestedInstaller(directory);
  if (installer) throw new Error(`Refusing to package a nested installer: ${installer}`);
}
