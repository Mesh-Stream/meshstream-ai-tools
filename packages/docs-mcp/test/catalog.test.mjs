import assert from "node:assert/strict";
import test from "node:test";
import { getBillingGuidance, getIntegrationGuide, getIntegrationPlan, getPlatformMatrix, getSdkRelease, getTroubleshootingGuide, searchDocs } from "../src/catalog.mjs";

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
  assert.equal(result.releases.length, 0);
  const all = await getSdkRelease("all");
  assert.ok(all.releases.every((release) => /^\[?(Android|iOS|Flutter|React Native|Uniapp)/.test(release.sdk)));
  assert.ok(all.releases.some((release) => release.version === "1.0.9"));
  assert.equal((await getSdkRelease("react-native")).releases.length, 1);
  assert.equal((await getSdkRelease("iOS / macOS")).releases.length, 1);
  assert.equal((await getSdkRelease("macos")).releases.length, 1);
});

test("getIntegrationGuide returns setup and advanced sources", async () => {
  const result = await getIntegrationGuide("web", "hls.js");
  assert.equal(result.platform, "web");
  assert.equal(result.framework, "hls.js");
  assert.deepEqual(result.sources.map((source) => source.path), ["sdk/web-setup.md", "sdk/web.md", "sdk/web-advanced.md"]);
});

test("getIntegrationGuide covers native and cross-platform SDKs", async () => {
  for (const platform of ["android", "ios", "macos", "windows", "flutter", "react-native", "uniapp"]) {
    const result = await getIntegrationGuide(platform);
    assert.equal(result.platform, platform === "react-native" ? "reactnative" : platform);
    assert.ok(result.sources.length >= 3);
    assert.ok(result.sources.some((source) => source.path.includes("-setup.md")));
  }
  const matrix = getPlatformMatrix();
  assert.ok(matrix.platforms.some(({ platform }) => platform === "android"));
  assert.ok(matrix.platforms.some(({ platform }) => platform === "flutter"));
});

test("normalizes platform aliases and adds platform-specific guidance", async () => {
  const result = await getIntegrationPlan({ platform: "react-native", framework: "React Native" });
  assert.equal(result.request.platform, "reactnative");
  assert.match(result.platformGuidance.label, /React Native/);
  assert.match(result.platformGuidance.acceptance, /Android|iOS/);
  const android = await getIntegrationGuide("Kotlin");
  assert.equal(android.platform, "android");
  const apple = await getIntegrationGuide("iOS / macOS");
  assert.equal(apple.platform, "ios");
});

test("getTroubleshootingGuide includes the official guide and related matches", async () => {
  const result = await getTroubleshootingGuide("Peer");
  assert.equal(result.source.path, "troubleshooting.md");
  assert.match(result.guide, /P2P|Peer/i);
  assert.ok(Array.isArray(result.related));
});

test("getIntegrationPlan returns platform-aware steps and acceptance evidence", async () => {
  const result = await getIntegrationPlan({ platform: "web", framework: "Vue 3", player: "hls.js", protocol: "HLS", scenario: "live playback" });
  assert.equal(result.request.platform, "web");
  assert.equal(result.request.player, "hls.js");
  assert.ok(result.plan.some((step) => /playbackUrl/.test(step)));
  assert.ok(result.p2pAcceptance.some((step) => /同时增长/.test(step)));
  assert.match(result.starterPrompt, /Vue 3/);
  assert.ok(result.modeSteps.length > 0);
});

test("getBillingGuidance returns public rules without account data", async () => {
  const result = await getBillingGuidance("quota");
  assert.equal(result.pricingUrl, "https://meshstream.net/pricing");
  assert.match(result.guidance, /配额|quota/i);
  assert.ok(Array.isArray(result.related));
});
