import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const sourceIndex = args.indexOf("--source");
const source = sourceIndex >= 0 ? args[sourceIndex + 1] : undefined;
if (!source) {
  console.error("Usage: npm run sync-docs -- --source /absolute/path/to/apps/developer-site/docs");
  process.exit(1);
}

const sourcePath = path.resolve(source);
const destination = path.join(repoRoot, "packages", "docs-mcp", "content");
await fs.access(sourcePath);
await fs.cp(sourcePath, destination, { recursive: true, force: true });
console.log(`Synced MeshStream docs from ${sourcePath}`);
