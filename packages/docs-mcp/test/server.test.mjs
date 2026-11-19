import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const packageRoot = path.resolve(import.meta.dirname, "..");

test("MCP server exposes the read-only documentation and planning tools", async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(packageRoot, "src", "server.mjs")],
    env: { ...process.env, MESHSTREAM_DOCS_ROOT: path.join(packageRoot, "content") },
  });
  const client = new Client({ name: "meshstream-docs-mcp-test", version: "0.1.0" });
  try {
    await client.connect(transport);
    const listed = await client.listTools();
    assert.deepEqual(listed.tools.map((tool) => tool.name).sort(), [
      "get_billing_guidance",
      "get_document",
      "get_integration_guide",
      "get_integration_plan",
      "get_platform_matrix",
      "get_sdk_release",
      "get_troubleshooting_guide",
      "search_docs",
    ]);
    const response = await client.callTool({ name: "search_docs", arguments: { query: "Web SDK" } });
    assert.equal(response.isError, undefined);
    assert.match(response.content[0].text, /sdk\/web\.md/);
  } finally {
    await transport.close();
  }
});
