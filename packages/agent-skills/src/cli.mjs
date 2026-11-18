#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { claudeBody, cursorBody, skillBody } from "./skill-content.mjs";

const targets = {
  codex: [{ path: ".codex/skills/meshstream-web-integration/SKILL.md", body: skillBody }],
  cursor: [{ path: ".cursor/rules/meshstream-web-integration.mdc", body: cursorBody }],
  claude: [{ path: ".claude/skills/meshstream-web-integration/SKILL.md", body: claudeBody }],
};

function usage() {
  return `MeshStream Agent Skills\n\nUsage:\n  meshstream-agent-skills add --ide <codex|cursor|claude|all> [--project <path>] [--force]\n\nThe installer writes only the selected editor's project-local instructions. Existing files are preserved unless --force is supplied.`;
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = { command, ide: undefined, project: process.cwd(), force: false };
  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (value === "--ide") options.ide = rest[++index];
    else if (value === "--project") options.project = path.resolve(rest[++index]);
    else if (value === "--force") options.force = true;
    else if (value === "--help" || value === "-h") options.help = true;
    else throw new Error(`Unknown option: ${value}`);
  }
  return options;
}

async function install(options) {
  const requested = options.ide === "all" ? Object.keys(targets) : [options.ide];
  if (!requested[0] || requested.some((ide) => !targets[ide])) {
    throw new Error("--ide must be codex, cursor, claude, or all");
  }
  const written = [];
  for (const ide of requested) {
    for (const file of targets[ide]) {
      const destination = path.join(options.project, file.path);
      try {
        await fs.access(destination);
        if (!options.force) throw new Error(`already exists: ${file.path} (use --force to replace it)`);
      } catch (error) {
        if (error?.code !== "ENOENT" && !String(error.message).startsWith("already exists:")) throw error;
        if (String(error.message).startsWith("already exists:") && !options.force) throw error;
      }
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, file.body, "utf8");
      written.push(path.relative(options.project, destination));
    }
  }
  return written;
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || options.command === "help" || options.command === undefined) {
    console.log(usage());
    process.exit(0);
  }
  if (options.command !== "add") throw new Error(`Unknown command: ${options.command}`);
  const written = await install(options);
  console.log(`Installed MeshStream AI Coding instructions:\n${written.map((file) => `- ${file}`).join("\n")}`);
} catch (error) {
  console.error(`meshstream-agent-skills: ${error.message}`);
  console.error(usage());
  process.exit(1);
}
