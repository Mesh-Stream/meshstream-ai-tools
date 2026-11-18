---
title: Web SDK 高级用法
sidebar_label: 高级用法
pagination_label: "Web SDK 高级用法"
---

# Web SDK 高级用法

本页用于已完成 [基础接入](./web.md) 后的生产配置。Service Worker、已有播放器适配、动态地址与鉴权、低延迟调优、诊断和灰度发布均属于高级能力，不影响基础播放链路。

## Service Worker 传输

Service Worker 是可选传输层，不是 Web SDK 的前置条件。默认情况下 SDK 优先使用浏览器可用的加速方式；当 Service Worker 不可用时，当前会话仍通过既有媒体交付路径正常播放。

先执行 `npm run build:web-sdk:release`，将发布包中的 `dist/meshstream-sw.js` 部署到与页面同源的 HTTPS 路径，例如 `/meshstream-sw.js`。`localhost` 可用于本地开发。

```ts
import { attach } from "@meshstream/p2p-web";

const session = attach({
  key,
  url,
  video,
  transportPreference: "auto",
  serviceWorker: {
    url: "/meshstream-sw.js",
    scope: "/",
    autoRegister: true,
    p2pTimeoutMs: 5000,
    onSegmentStats: ({ source, bytes }) => {
      console.debug("MeshStream segment", source, bytes);
    },
  },
});

await session.start();
```

| `transportPreference` | 适用场景 |
| --- | --- |
| `auto` | 默认值。优先 MSE，必要时使用可用的 Service Worker。 |
| `mse` | 仅使用 MSE 加速；用于回滚 Service Worker 方案。 |
| `service-worker` | 强制验证 Worker 路径，仅建议灰度和兼容性测试。 |
| `cdn` | 关闭当前会话的加速，用于播放对照和应急处理。 |

Service Worker 只能控制同源且由其 `scope` 覆盖的页面。`onSegmentStats` 中的 `source` 表示当前分片是否使用了加速，可用于评估实际效果。

### 上线验收

1. 验证 Worker 脚本可通过 HTTPS 访问，且页面位于其 `scope` 内。
2. 使用 `auto` 验证正常播放，并确认关闭加速后播放仍正常。
3. 在两个同时播放同一内容的测试端确认出现 P2P 下载流量，不要只看连接数量。
4. 灰度使用 `service-worker`，确认失败时仍可播放；回滚时移除 `serviceWorker` 配置或切换为 `mse`。

## 动态地址与源站鉴权

签名 URL 每次变化时，使用稳定的 `contentId` 标识同一内容，以保持加速效果。`originHeaders` 仅用于请求客户媒体源，不会发送给其他观看设备。

```ts
const session = attach({
  key,
  url: signedM3u8Url,
  contentId: "asset-12345",
  video,
  originHeaders: {
    Authorization: `Bearer ${token}`,
    "X-Playback-Session": playbackSession,
  },
});

await session.start();
window.addEventListener("pagehide", () => session.dispose(), { once: true });
```

令牌在播放期间轮换时使用同步的 `originHeadersProvider`。回调不能返回 `Promise`，业务应先刷新本地令牌状态：

```ts
const session = attach({
  key,
  url: signedM3u8Url,
  video,
  originHeadersProvider: ({ kind }) =>
    kind === "segment" ? { Authorization: `Bearer ${currentToken}` } : undefined,
});
```

浏览器仍会执行 CORS 与受限请求头规则。跨域媒体请求保持原有请求方式，不会附加 SDK 配置的鉴权头；不要把源站 Token、Cookie 或签名 URL 写入日志。

## MP4 / MP3 直链播放

这里的“直链播放”是指播放器直接加载一个 `.mp4` 或 `.mp3` 文件地址，而不是加载 HLS `.m3u8` 或 DASH `.mpd` 清单。MP4 和 MP3 的加速仅通过同源 Service Worker 启用；不满足使用条件时，当前会话仍通过既有媒体交付路径正常播放。

接入前必须满足以下条件：

- 页面与 Worker 使用 HTTPS（`localhost` 开发环境除外），且 Worker 已激活并控制页面；
- Worker 与页面同源，且站点已部署 `meshstream-sw.js`；SDK 会为直链媒体默认尝试注册 Worker，也可使用前文的 `serviceWorker` 显式设置路径与 scope；
- 源站支持单 Range 请求，并正确返回 `Content-Range`；
- 跨源媒体响应暴露 `Content-Length`、`Content-Type`、`Accept-Ranges`，并允许 `Range` 请求头。

下面示例分别展示视频和音频直链的接入方式；两者的 Service Worker 和源站条件相同。

```ts title="MP4 视频"
const session = attach({
  key,
  url: "https://cdn.example.com/video/trailer.mp4",
  contentId: "trailer-2026",
  video: document.querySelector("video")!,
  serviceWorker: {
    url: "/meshstream-sw.js",
    scope: "/",
    autoRegister: true,
  },
});

await session.start();
window.addEventListener("pagehide", () => session.dispose(), { once: true });
```

```ts title="MP3 音频"
const session = attach({
  key,
  url: "https://cdn.example.com/audio/episode-01.mp3",
  contentId: "podcast-episode-01",
  video: document.querySelector("audio")!,
  serviceWorker: {
    url: "/meshstream-sw.js",
    scope: "/",
    autoRegister: true,
  },
});

await session.start();
window.addEventListener("pagehide", () => session.dispose(), { once: true });
```

无扩展名的受鉴权直链，请额外传入 `mimeType: "mp4"` 或 `mimeType: "mp3"`，避免浏览器无法通过地址判断媒体类型。

整文件请求、后缀 Range、多 Range、媒体元数据或无法安全拆分的请求保持原有媒体请求方式。Worker 未启动或源站不满足 Range 条件时，SDK 不会阻断 MP4/MP3 播放，只是不启用加速。

## 已有播放器适配

业务已有播放器实例时，从适配器入口接入。SDK 仅接管 P2P 会话与媒体请求路径，播放器的 ABR、解码、渲染和销毁仍由业务负责。

```ts
import Hls from "hls.js";
import { attachToHls } from "@meshstream/p2p-web/adapters";

const hls = new Hls({ maxBufferLength: 30 });
const session = attachToHls({ key, url, video, player: hls });

await session.start();
hls.loadSource(url);
hls.attachMedia(video);

window.addEventListener("pagehide", () => {
  session.dispose();
  hls.destroy();
}, { once: true });
```

必须在 `loadSource` 前调用 `session.start()`，以便第一批媒体请求可以参与加速。不要在同一媒体元素或同一播放地址上同时使用 `attach` 与 `attachToHls`。

| 接入方式 | 场景 | 说明 |
| --- | --- | --- |
| `attach` | 新页面或原生媒体元素 | 基础用法，SDK 创建并管理所需播放器。 |
| `attachToHls` | 业务已有 hls.js | 业务保留 hls.js 生命周期和 ABR 配置。 |
| `attachToShaka` | 已有 Shaka HLS/DASH 实例 | SDK 绑定 P2P 会话，业务销毁实例。 |
| `attachToDashJs` | dash.js `>=3.1.0 <6` | 在初始化前安装请求加载器。 |
| `attachToRxPlayer` | RxPlayer DASH | 常规音视频分片进入 P2P 请求路径。 |
| `attachToVhs` | Video.js VHS HLS | 需要同源 Service Worker。 |
| `attachToVideoJs`、Plyr、DPlayer、ArtPlayer | 媒体元素桥接 | 不是各播放器引擎的原生加载器插件。 |

已有 Shaka 实例需要同时传入创建该实例的 `shakaLibrary`，让 P2P 请求插件注册到同一个播放器运行时：

```ts
import shaka from "shaka-player";
import { attachToShaka } from "@meshstream/p2p-web/adapters";

const player = new shaka.Player();
await player.attach(video);
const session = attachToShaka({ key, url, player, shakaLibrary: shaka });
await session.start();
```

## HLS 与低延迟配置

SDK 自动识别直播和点播。未显式设置直播延迟时，识别到 HLS 直播媒体清单后使用 `liveSyncDurationCount: 3` 和 `liveMaxLatencyDurationCount: 6`，避免扩大同步窗口而增加直播延迟。

`hlsConfig` 是当前唯一由 Web SDK 对外暴露的播放器调优参数，用于 SDK 创建的 hls.js 实例。业务可通过它调整缓冲、ABR 或低延迟参数；已有 hls.js 实例应在创建时自行配置。DASH 没有等价的 `dashConfig`：使用 Shaka、dash.js 或 RxPlayer 时，继续在业务创建的播放器实例上配置。MP4/MP3 不使用播放器调优参数，固定走 Service Worker 的 Range 传输。

```ts
const session = attach({
  key,
  url,
  video,
  hlsConfig: {
    liveSyncDurationCount: 3,
    liveMaxLatencyDurationCount: 6,
  },
});
```

低延迟 HLS/DASH 的 CMAF 部分分片、DRM、字幕以及无法安全处理的 Range 请求保持播放器/CDN 原路径。SDK 只分发完整媒体分片，避免破坏播放器取消请求与延迟控制语义。

## 运行时控制与可观测性

`setP2pEnabled(false)` 可以在播放期间关闭加速，不影响正常播放。`statistics()` 返回流量和错误计数；`diagnostics()` 返回最近的连接诊断；`qoe()` 返回可直接写入业务遥测的匿名质量快照。

```ts
const unsubscribe = session.addEventListener({
  onP2pReady() {
    console.info("P2P ready");
  },
  onP2pUnavailable(reason) {
    console.info("CDN fallback", reason);
  },
  onPeerCountChanged(count) {
    updatePeerCount(count);
  },
  onStatistics(stats) {
    reportDeliveryStats(stats);
  },
});

const qoe = session.qoe();
// qoe.p2pDownloadRatio, qoe.firstPeerConnectMs, qoe.fallbackCount

window.addEventListener("pagehide", () => {
  unsubscribe();
  session.dispose();
}, { once: true });
```

诊断与统计上报失败不能影响播放器。请避免将 SDK Key、源站请求头、Cookie 或用户标识写入业务日志。

## 生产边界

- SDK 负责播放会话和加速处理；播放器继续负责清单、ABR、解码、渲染和播放生命周期。
- 加速、网络、配置或统计出现问题时，保留当前会话管理的播放器地址；不要仅因加速状态变化而替换地址或停止播放。
- iPhone/iPad Safari 没有 MSE HLS P2P 路径，应使用原生 HLS 播放器配合同源 Service Worker 传输。仅当 Worker 未激活、未接管页面或运行条件不满足时，才回退至 CDN。macOS Safari 是否使用 MSE 路径取决于当前版本和运行时能力，应以 `getCapability()` 结果为准；如需统一验证 Worker 路径，可在受控灰度中设置 `transportPreference: "service-worker"`。
- MP4/MP3 仅对可安全拆分的单 Range 请求启用加速，其余请求保持原有播放方式。
