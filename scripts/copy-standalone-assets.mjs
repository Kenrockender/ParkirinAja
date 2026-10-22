import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const standaloneDir = resolve(projectRoot, ".next", "standalone");
const publicDir = resolve(projectRoot, "public");
const staticDir = resolve(projectRoot, ".next", "static");

if (!existsSync(standaloneDir)) {
  throw new Error("Standalone build output was not created.");
}

cpSync(staticDir, resolve(standaloneDir, ".next", "static"), { recursive: true, force: true });
cpSync(publicDir, resolve(standaloneDir, "public"), { recursive: true, force: true });
