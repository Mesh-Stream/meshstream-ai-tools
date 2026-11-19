#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getBillingGuidance, getDocument, getIntegrationGuide, getIntegrationPlan, getPlatformMatrix, getSdkRelease, getTroubleshootingGuide, searchDocs } from "./catalog.mjs";

const server = new McpServer({ name: "meshstream-docs", version: "0.3.0" });

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

server.registerTool("get_document", {
  description: "Read one public MeshStream documentation page by its relative path. Read-only.",
  inputSchema: {
    path: z.string().min(1).describe("Relative path such as sdk/web.md or billing/usage.md"),
  },
}, async ({ path }) => result(await getDocument(path)));

server.registerTool("get_integration_plan", {
  description: "Create a structured, platform-aware MeshStream integration and P2P acceptance plan. Read-only; it does not edit customer files or use credentials.",
  inputSchema: {
    platform: z.string().optional().describe("web, android, ios, macos, windows, flutter, react-native, or uniapp"),
    framework: z.string().optional().describe("Framework such as Vue, React, Flutter, or native"),
    player: z.string().optional().describe("Existing media player such as hls.js, Shaka, Media3, or AVPlayer"),
    protocol: z.string().optional().describe("HLS, DASH, MP4, or another actual media protocol"),
    scenario: z.string().optional().describe("Scenario such as live playback, VOD, or add CDN fallback"),
    mode: z.enum(["from-zero", "demo", "troubleshooting", "feature-extension", "docs"]).optional().describe("Task mode"),
  },
}, async (args) => result(await getIntegrationPlan(args)));

server.registerTool("get_platform_matrix", {
  description: "Return the supported MeshStream platform matrix and shared acceptance rules. Read-only.",
  inputSchema: {},
}, async () => result(getPlatformMatrix()));

server.registerTool("get_billing_guidance", {
  description: "Explain public MeshStream quota and plan rules and point to the pricing page. Read-only; it does not access account balance or place orders.",
  inputSchema: {
    query: z.string().optional().describe("Optional billing or quota question"),
  },
}, async ({ query }) => result(await getBillingGuidance(query)));

await server.connect(new StdioServerTransport());
