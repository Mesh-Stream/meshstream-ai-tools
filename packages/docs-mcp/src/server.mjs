#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getIntegrationGuide, getSdkRelease, getTroubleshootingGuide, searchDocs } from "./catalog.mjs";

const server = new McpServer({ name: "meshstream-docs", version: "0.1.0" });

function result(value) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

server.registerTool("search_docs", {
  description: "Search the official MeshStream developer documentation. Read-only; results include source URLs and excerpts.",
  inputSchema: {
    query: z.string().min(1).describe("Question or keywords to search for"),
    limit: z.number().int().min(1).max(10).optional().describe("Maximum number of results"),
  },
}, async ({ query, limit }) => result({ query, results: await searchDocs(query, limit) }));

server.registerTool("get_sdk_release", {
  description: "Read the public SDK version table from the official MeshStream documentation.",
  inputSchema: {
    platform: z.string().optional().describe("Platform filter such as web, android, ios, flutter, or all"),
  },
}, async ({ platform }) => result(await getSdkRelease(platform)));

server.registerTool("get_integration_guide", {
  description: "Return the official setup, integration, and advanced guide for a MeshStream SDK platform.",
  inputSchema: {
    platform: z.string().optional().describe("Platform such as web, android, ios, windows, flutter, react-native, or uniapp"),
    framework: z.string().optional().describe("Optional framework or player context"),
  },
}, async ({ platform, framework }) => result(await getIntegrationGuide(platform, framework)));

server.registerTool("get_troubleshooting_guide", {
  description: "Return the official troubleshooting guide and related documentation matches.",
  inputSchema: {
    query: z.string().optional().describe("Optional symptom, error, or keyword"),
  },
}, async ({ query }) => result(await getTroubleshootingGuide(query)));

await server.connect(new StdioServerTransport());
