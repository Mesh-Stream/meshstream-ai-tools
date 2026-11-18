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

const documentFiles = [
  "intro.md",
  "quickstart.md",
  "ai-coding.md",
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
  const rows = overview.text.split("\n")
    .filter((line) => /^\|/.test(line) && !/^\|\s*-/.test(line))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 4 && cells[0] !== "SDK")
    .map(([sdk, version, android, apple]) => ({ sdk, version, android, apple }));
  const normalized = String(platform || "all").trim().toLowerCase();
  const filtered = normalized === "all" ? rows : rows.filter((row) => row.sdk.toLowerCase().includes(normalized));
  return {
    source: { path: overview.path, url: overview.url },
    platform: normalized,
    releases: filtered,
    note: "仅返回官网公开版本表；发布前仍需从公共渠道验证精确包、哈希和兼容性。",
  };
}

export async function getIntegrationGuide(platform = "web", framework = "") {
  const normalized = String(platform || "web").trim().toLowerCase();
  const map = {
    web: ["sdk/web-setup.md", "sdk/web.md", "sdk/web-advanced.md"],
    android: ["sdk/android-setup.md", "sdk/android.md", "sdk/android-advanced.md"],
    ios: ["sdk/ios-setup.md", "sdk/ios.md", "sdk/ios-advanced.md"],
    macos: ["sdk/ios-setup.md", "sdk/ios.md", "sdk/ios-advanced.md"],
    windows: ["sdk/windows-setup.md", "sdk/windows.md", "sdk/windows-advanced.md"],
    flutter: ["sdk/flutter-setup.md", "sdk/flutter.md", "sdk/flutter-advanced.md"],
    reactnative: ["sdk/react-native-setup.md", "sdk/react-native.md", "sdk/react-native-advanced.md"],
    "react-native": ["sdk/react-native-setup.md", "sdk/react-native.md", "sdk/react-native-advanced.md"],
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
