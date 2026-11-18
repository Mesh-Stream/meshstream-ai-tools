import assert from "node:assert/strict";
import test from "node:test";
import { getIntegrationGuide, getSdkRelease, getTroubleshootingGuide, searchDocs } from "../src/catalog.mjs";

test("searchDocs returns official source URLs and relevant Web results", async () => {
  const results = await searchDocs("Web SDK hls.js P2P", 5);
  assert.ok(results.length > 0);
  assert.ok(results.some((result) => result.path === "sdk/web.md"));
  assert.ok(results.every((result) => result.url.startsWith("https://meshstream.net/docs/")));
});

test("getSdkRelease reads the public version table", async () => {
  const result = await getSdkRelease("web");
  assert.equal(result.platform, "web");
  assert.ok(Array.isArray(result.releases));
  assert.ok(result.releases.length >= 1);
});

test("getIntegrationGuide returns setup and advanced sources", async () => {
  const result = await getIntegrationGuide("web", "hls.js");
  assert.equal(result.platform, "web");
  assert.equal(result.framework, "hls.js");
  assert.deepEqual(result.sources.map((source) => source.path), ["sdk/web-setup.md", "sdk/web.md", "sdk/web-advanced.md"]);
});

test("getTroubleshootingGuide includes the official guide and related matches", async () => {
  const result = await getTroubleshootingGuide("Peer");
  assert.equal(result.source.path, "troubleshooting.md");
  assert.match(result.guide, /P2P|Peer/i);
  assert.ok(Array.isArray(result.related));
});
