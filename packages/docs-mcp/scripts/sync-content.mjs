import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..", "..", "..");
const destination = path.resolve(scriptDirectory, "..", "content");
const source = process.env.MESHSTREAM_DOCS_SOURCE?.trim()
  ? path.resolve(process.env.MESHSTREAM_DOCS_SOURCE)
  : destination;

await fs.access(source);
if (source !== destination) await fs.cp(source, destination, { recursive: true, force: true });
console.error(`Using MeshStream docs from ${source}`);
