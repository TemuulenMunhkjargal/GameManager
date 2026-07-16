import { rmSync } from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(process.cwd());
const rootPrefix = `${projectRoot}${path.sep}`;
const generatedDirectories = [".next", ".desktop-runtime", "release"];

for (const relativePath of generatedDirectories) {
  const target = path.resolve(projectRoot, relativePath);
  if (!target.startsWith(rootPrefix)) {
    throw new Error(`Refusing to clean a path outside the project: ${target}`);
  }
  rmSync(target, { recursive: true, force: true });
}

console.log("Removed previous desktop build output.");
