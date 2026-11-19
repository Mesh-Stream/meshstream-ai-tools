import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

const run = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");
const cli = path.join(root, "src", "cli.mjs");

test("installs Codex, Cursor, Claude, and CodeBuddy instructions without touching existing files", async () => {
  const project = await fs.mkdtemp(path.join(os.tmpdir(), "meshstream-agent-skills-"));
  const result = await run(process.execPath, [cli, "add", "--ide", "all", "--project", project]);
  assert.match(result.stdout, /Installed MeshStream AI Coding instructions/);
  for (const file of [
    ".codex/skills/meshstream-sdk-integration/SKILL.md",
    ".cursor/rules/meshstream-sdk-integration.mdc",
    ".claude/skills/meshstream-sdk-integration/SKILL.md",
    ".codebuddy/skills/meshstream-sdk-integration/SKILL.md",
  ]) {
    const contents = await fs.readFile(path.join(project, file), "utf8");
    assert.match(contents, /MeshStream/);
    assert.match(contents, /Android/);
    assert.match(contents, /iOS/);
  }
  await assert.rejects(() => run(process.execPath, [cli, "add", "--ide", "codex", "--project", project]), /already exists/);
});

test("rejects an unsupported editor and leaves the project unchanged", async () => {
  const project = await fs.mkdtemp(path.join(os.tmpdir(), "meshstream-agent-skills-"));
  await assert.rejects(() => run(process.execPath, [cli, "add", "--ide", "vscode", "--project", project]), /--ide must be/);
  assert.deepEqual(await fs.readdir(project), []);
});
