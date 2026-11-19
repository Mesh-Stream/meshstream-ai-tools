import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const bundledDocsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "content");
const defaultDocsRoot = existsSync(bundledDocsRoot)
  ? bundledDocsRoot
  : path.join(packageRoot, "apps", "developer-site", "docs");
const maxDocumentChars = 18_000;

const platformAliases = {
  web: "web",
  browser: "web",
  android: "android",
  kotlin: "android",
  java: "android",
  ios: "ios",
  "ios/ipados": "ios",
  macos: "macos",
  mac: "macos",
  apple: "ios",
  windows: "windows",
  win: "windows",
  c: "windows",
  cpp: "windows",
  "c++": "windows",
  flutter: "flutter",
  dart: "flutter",
  reactnative: "reactnative",
  "react-native": "reactnative",
  "react native": "reactnative",
  uniapp: "uniapp",
  "uni-app": "uniapp",
};

const platformProfiles = {
  web: {
    label: "Web",
    capabilities: ["browser playback session", "MSE/WebRTC or Service Worker transport", "CDN fallback", "P2P statistics", "page lifecycle release"],
    acceptance: "Use two browsers or browser profiles; verify Service Worker activation when using iOS Safari or direct MP4/MP3 playback.",
  },
  android: {
    label: "Android",
    capabilities: ["native playback session", "local HTTP playback proxy", "CDN fallback", "P2P statistics", "activity/background release"],
    acceptance: "Use two real Android devices when possible; simulator results do not replace device or cross-network acceptance.",
  },
  ios: {
    label: "iOS / macOS",
    capabilities: ["Apple playback session", "local HTTP playback proxy", "CDN fallback", "P2P statistics", "controller/background release"],
    acceptance: "Verify iOS arm64 and the required macOS architectures separately; record AVPlayer playback and both P2P byte directions.",
  },
  macos: {
    label: "macOS",
    capabilities: ["Apple playback session", "local HTTP playback proxy", "CDN fallback", "P2P statistics", "controller release"],
    acceptance: "Verify the target macOS architecture and AVPlayer or host-player lifecycle; do not infer Intel support from an Apple Silicon run.",
  },
  windows: {
    label: "Windows",
    capabilities: ["C ABI playback session", "x64 native player integration", "CDN fallback", "P2P statistics", "client/session release"],
    acceptance: "Verify the published x64 DLL, import library, target player, and shutdown cleanup on Windows x64.",
  },
  flutter: {
    label: "Flutter",
    capabilities: ["Dart playback session", "Android/iOS native bridge", "CDN fallback", "P2P statistics", "widget/controller release"],
    acceptance: "Verify the Flutter example on real Android and iOS devices and record the Flutter package plus native SDK versions.",
  },
  reactnative: {
    label: "React Native",
    capabilities: ["JavaScript playback session", "Android/iOS native bridge", "CDN fallback", "P2P statistics", "screen/controller release"],
    acceptance: "Verify the example on real Android and iOS devices and keep the npm bridge and native SDK versions pinned together.",
  },
  uniapp: {
    label: "uni-app",
    capabilities: ["UTS playback session", "Android/iOS native plugin", "CDN fallback", "P2P statistics", "page/base release"],
    acceptance: "Use a custom base or cloud build on real Android and iOS devices; standard HBuilderX base alone is insufficient evidence.",
  },
};

function normalizePlatform(platform = "web") {
  const raw = String(platform || "web").trim().toLowerCase().replaceAll("_", " ");
  return platformAliases[raw] || raw;
}

const documentFiles = [
  "intro.md",
  "quickstart.md",
  "ai-coding.md",
  "billing/usage.md",
  "best-practices.md",
  "troubleshooting.md",
  "concepts/p2p.md",
  "concepts/statistics.md",
  "concepts/identity.md",
  "sdk/overview.md",
  "sdk/web-setup.md",
  "sdk/web.md",
  "sdk/web-advanced.md",
  "sdk/android-setup.md",
  "sdk/android.md",
  "sdk/android-advanced.md",
  "sdk/ios-setup.md",
  "sdk/ios.md",
  "sdk/ios-advanced.md",
  "sdk/windows-setup.md",
  "sdk/windows.md",
  "sdk/windows-advanced.md",
  "sdk/flutter-setup.md",
  "sdk/flutter.md",
  "sdk/flutter-advanced.md",
  "sdk/react-native-setup.md",
  "sdk/react-native.md",
  "sdk/react-native-advanced.md",
  "sdk/uniapp-setup.md",
  "sdk/uniapp.md",
  "sdk/uniapp-advanced.md",
];

function docsRoot() {
  return path.resolve(process.env.MESHSTREAM_DOCS_ROOT?.trim() || defaultDocsRoot);
}

function titleFromMarkdown(markdown, fallback) {
  const match = markdown.match(/^title:\s*["']?(.+?)["']?\s*$/m) || markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || fallback;
}

function stripFrontMatter(markdown) {
  return markdown.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
}

function tokenize(value) {
  return value.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((token) => token.length > 1);
}

function scoreDocument(query, document) {
  const queryTokens = tokenize(query);
  const haystack = `${document.title} ${document.path} ${document.text}`.toLowerCase();
  return queryTokens.reduce((score, token) => score + (haystack.includes(token) ? (document.title.toLowerCase().includes(token) ? 4 : 1) : 0), 0);
}

async function readDocument(relativePath) {
  if (!documentFiles.includes(relativePath)) throw new Error(`Unknown documentation path: ${relativePath}`);
  const absolutePath = path.join(docsRoot(), relativePath);
  const markdown = await fs.readFile(absolutePath, "utf8");
  return {
    path: relativePath,
    title: titleFromMarkdown(markdown, relativePath),
    text: stripFrontMatter(markdown),
    url: `https://meshstream.net/docs/${relativePath.replace(/\.md$/, "").replaceAll("\\\\", "/")}`,
  };
}

export async function loadDocuments() {
  const documents = [];
  for (const relativePath of documentFiles) {
    try {
      documents.push(await readDocument(relativePath));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return documents;
}

export async function searchDocs(query, limit = 5) {
  const normalizedQuery = String(query || "").trim();
  if (!normalizedQuery) return [];
  const documents = await loadDocuments();
  return documents
    .map((document) => ({ document, score: scoreDocument(normalizedQuery, document) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.document.path.localeCompare(b.document.path))
    .slice(0, Math.min(10, Math.max(1, Number(limit) || 5)))
    .map(({ document, score }) => ({
      path: document.path,
      title: document.title,
      score,
      url: document.url,
      excerpt: document.text.slice(0, 1_000),
    }));
}

export async function getDocument(relativePath) {
  const document = await readDocument(relativePath);
  return { ...document, text: document.text.slice(0, maxDocumentChars) };
}

export async function getSdkRelease(platform = "all") {
  const overview = await getDocument("sdk/overview.md");
  const headingIndex = overview.text.split("\n").findIndex((line) => /原生与跨平台 SDK 版本对照|native.*cross-platform.*version/i.test(line));
  const tableText = (headingIndex >= 0 ? overview.text.split("\n").slice(headingIndex + 1) : overview.text.split("\n"))
    .filter((line) => !/^##\s/.test(line))
    .filter((line) => /^\|/.test(line) && !/^\|\s*-/.test(line));
  const rows = tableText
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 4 && !/^(SDK|应用|Application)/i.test(cells[0]))
    .map(([sdk, version, android, apple]) => ({ sdk, version, android, apple }));
  const normalized = String(platform || "all").trim().toLowerCase();
  const canonical = normalized === "all" ? "all" : normalizePlatform(normalized);
  const filtered = canonical === "all" ? rows : rows.filter((row) => normalizePlatform(row.sdk) === canonical || row.sdk.toLowerCase().includes(normalized));
  return {
    source: { path: overview.path, url: overview.url },
    platform: canonical,
    releases: filtered,
    note: "仅返回官网版本对照表中的公开版本；Web 和 Windows 若没有独立版本行，应继续以对应安装页和公开发行渠道为准。发布前仍需验证精确包、哈希和兼容性。",
  };
}

export async function getIntegrationGuide(platform = "web", framework = "") {
  const normalized = normalizePlatform(platform);
  const map = {
    web: ["sdk/web-setup.md", "sdk/web.md", "sdk/web-advanced.md"],
    android: ["sdk/android-setup.md", "sdk/android.md", "sdk/android-advanced.md"],
    ios: ["sdk/ios-setup.md", "sdk/ios.md", "sdk/ios-advanced.md"],
    macos: ["sdk/ios-setup.md", "sdk/ios.md", "sdk/ios-advanced.md"],
    windows: ["sdk/windows-setup.md", "sdk/windows.md", "sdk/windows-advanced.md"],
    flutter: ["sdk/flutter-setup.md", "sdk/flutter.md", "sdk/flutter-advanced.md"],
    reactnative: ["sdk/react-native-setup.md", "sdk/react-native.md", "sdk/react-native-advanced.md"],
    uniapp: ["sdk/uniapp-setup.md", "sdk/uniapp.md", "sdk/uniapp-advanced.md"],
  };
  const paths = map[normalized] || map.web;
  const guides = await Promise.all(paths.map(getDocument));
  return {
    platform: normalized,
    framework: String(framework || "").trim() || undefined,
    sources: guides.map(({ path: sourcePath, title, url, text }) => ({ path: sourcePath, title, url, text })),
  };
}

export async function getTroubleshootingGuide(query = "") {
  const document = await getDocument("troubleshooting.md");
  const matches = query ? await searchDocs(query, 5) : [];
  return {
    source: { path: document.path, title: document.title, url: document.url },
    query: String(query || "").trim() || undefined,
    guide: document.text,
    related: matches,
  };
}

const integrationSources = {
  web: ["sdk/web-setup.md", "sdk/web.md", "sdk/web-advanced.md"],
  android: ["sdk/android-setup.md", "sdk/android.md", "sdk/android-advanced.md"],
  ios: ["sdk/ios-setup.md", "sdk/ios.md", "sdk/ios-advanced.md"],
  macos: ["sdk/ios-setup.md", "sdk/ios.md", "sdk/ios-advanced.md"],
  windows: ["sdk/windows-setup.md", "sdk/windows.md", "sdk/windows-advanced.md"],
  flutter: ["sdk/flutter-setup.md", "sdk/flutter.md", "sdk/flutter-advanced.md"],
  reactnative: ["sdk/react-native-setup.md", "sdk/react-native.md", "sdk/react-native-advanced.md"],
  uniapp: ["sdk/uniapp-setup.md", "sdk/uniapp.md", "sdk/uniapp-advanced.md"],
};

export async function getIntegrationPlan({ platform = "web", framework = "", player = "", protocol = "", scenario = "", mode = "from-zero" } = {}) {
  const normalizedPlatform = normalizePlatform(platform);
  const paths = integrationSources[normalizedPlatform] || integrationSources.web;
  const guides = await Promise.all(paths.map(getDocument));
  const normalizedFramework = String(framework || "").trim();
  const normalizedPlayer = String(player || "").trim();
  const normalizedProtocol = String(protocol || "").trim().toUpperCase();
  const normalizedScenario = String(scenario || "").trim();
  const normalizedMode = String(mode || "from-zero").trim().toLowerCase();
  const assumptions = [];
  if (!normalizedFramework) assumptions.push("从项目依赖和入口文件识别框架");
  if (!normalizedPlayer) assumptions.push("保留现有播放器，由 AI 根据项目代码识别播放器");
  if (!normalizedProtocol) assumptions.push("从媒体地址和播放器配置识别 HLS、DASH 或直链协议");
  return {
    request: {
      platform: normalizedPlatform,
      framework: normalizedFramework || undefined,
      player: normalizedPlayer || undefined,
      protocol: normalizedProtocol || undefined,
      scenario: normalizedScenario || undefined,
    },
    assumptions,
    plan: [
      "扫描项目入口、播放器、媒体协议、包管理器和现有鉴权，不覆盖业务代码",
      "安装并锁定公开 SDK 版本，从环境变量读取 SDK Key",
      "创建播放会话，把 SDK 返回的 playbackUrl 交给现有播放器",
      "保留 CDN 回退、ABR、DRM、源站请求头和原有播放器生命周期",
      "在切源、页面隐藏、播放结束和销毁时释放会话与连接",
      "运行项目构建和测试，并输出修改文件、版本和未完成验收项",
    ],
    mode: normalizedMode,
    modeSteps: {
      "from-zero": ["确认 SDK 与播放器边界", "生成最小播放接入", "执行构建、播放和双端 P2P 验收"],
      demo: ["定位对应平台的公开示例", "只配置本地环境变量和测试媒体", "运行示例并记录播放、P2P、回退和释放结果"],
      troubleshooting: ["复现并收集错误码和时间线", "检查 Key、bootstrap、Tracker、ICE、分片命中和回退", "给出证据、修复动作和复测命令"],
      "feature-extension": ["读取当前集成和生命周期", "只修改实现目标功能所需的文件", "补齐针对功能的测试和回退验收"],
      docs: ["先用公开文档和版本表回答", "每个结论附来源 URL", "不确定时明确标记未知，不编造 API"],
    }[normalizedMode] || ["先确认任务模式", "按官方平台文档生成方案", "输出构建和验收证据"],
    p2pAcceptance: [
      "使用相同 contentId、内容和清晰度启动发送端与接收端",
      "记录首个 Peer、首个 P2P 字节、P2P 下载、P2P 上传、CDN 字节和 rebuffer",
      "只有接收端下载与发送端上传同时增长才算真实 P2P 通过",
      "停止或阻断 P2P 后验证 CDN 回退，最后验证 dispose/close 释放连接",
    ],
    platformGuidance: platformProfiles[normalizedPlatform] || {
      label: normalizedPlatform,
      capabilities: platformProfiles.web.capabilities,
      acceptance: "先确认平台是否在公开支持矩阵中，再执行对应平台验收。",
    },
    sources: guides.map(({ path: sourcePath, title, url }) => ({ path: sourcePath, title, url })),
    starterPrompt: `在当前${normalizedPlatform}项目中执行${normalizedMode}任务：${normalizedScenario || "接入 MeshStream P2P 媒体加速"}。已知上下文：框架=${normalizedFramework || "待识别"}，播放器=${normalizedPlayer || "待识别"}，协议=${normalizedProtocol || "待识别"}。先识别并确认上下文，再按官方文档生成最小改动方案。保留现有播放器、CDN、DRM、ABR 和源站鉴权；SDK Key 只能从环境变量读取；输出修改文件、精确依赖版本、构建结果、CDN 回退和真实 P2P 双端证据。`,
  };
}

export function getPlatformMatrix() {
  return {
    platforms: Object.keys(integrationSources).map((platform) => ({
      platform,
      label: platformProfiles[platform]?.label || platform,
      sources: integrationSources[platform].map((path) => ({ path, url: `https://meshstream.net/docs/${path.replace(/\.md$/, "")}` })),
      capabilities: platformProfiles[platform]?.capabilities || [],
      acceptance: platformProfiles[platform]?.acceptance,
    })),
    acceptanceRule: "Peer count or WebSocket connection alone is not P2P proof; receiver download and sender upload bytes must both increase.",
  };
}

export async function getBillingGuidance(query = "") {
  const usage = await getDocument("billing/usage.md");
  const matches = query ? await searchDocs(query, 5) : [];
  return {
    source: { path: usage.path, title: usage.title, url: usage.url },
    pricingUrl: "https://meshstream.net/pricing",
    guidance: usage.text,
    related: matches,
    note: "套餐、额度和用量只返回公开规则；实时余额、订单和支付状态请在控制台查看。",
  };
}
