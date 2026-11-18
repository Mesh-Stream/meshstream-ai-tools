---
title: React Native SDK 高级用法
sidebar_label: 高级用法
description: "React Native SDK 高级用法：直播点播、MP4/MP3、源站鉴权、预加载、运行时控制、监控与生命周期。"
pagination_label: "React Native SDK 高级用法"
---

# React Native SDK 高级用法

本页按原生 SDK 的接入场景组织：直播／点播、文件直链、每路配置、预加载、运行时控制、监控与平台策略。示例复用[快速接入](./react-native.md)创建的 client，播放器变量由业务应用持有。

## 直播与点播接入策略

SDK 自动识别直播／点播，[基础接入方式相同](./react-native.md)。播放期间可回传播放器状态，帮助 P2P 调度；不回传也可正常播放。

### 直播

<span id="直播回传缓冲余量" />

<span id="缓冲反馈" />

回传当前位置之后连续可播放的缓冲时长，帮助 SDK 调整 P2P 预取。例如播放到 60 秒、缓冲到 70 秒，应传 **10,000 毫秒**。直播起播位置与目标延迟由播放器设置。

```ts
await session.updateBufferedDurationMs(bufferedDurationMs);
```

### 点播（VOD）

<span id="点播另外回传播放位置" />

<span id="播放进度与缓冲反馈" />

除缓冲时长外，回传当前播放位置，帮助 SDK 在已连接且拥有目标分片的 Peer 中优先选择进度接近的节点。Seek 完成后立即更新位置。

```ts
await session.updateCurrentPositionMs(positionMs);
await session.updateBufferedDurationMs(bufferedDurationMs);
```

数值均为非负毫秒，缓冲时长不能跨越断档。播放器状态有效后通常每秒回传一次；关闭会话前停止回传并等待在途调用结束。

<span id="播放器状态回传" />

<span id="播放位置与连续缓冲" />

<span id="播放器状态同步" />

<span id="接入示例" />

<span id="播放器状态回传示例" />

<details>
<summary>完整播放器状态回传示例</summary>

将播放器回调转换为下面的毫秒输入；异步回传应串行执行，并处理桥接调用异常。

```ts
async function syncPlaybackState(
  positionMs: number, bufferedDurationMs: number, isLive: boolean,
) {
  if (!isLive && Number.isFinite(positionMs) && positionMs >= 0) {
    await session.updateCurrentPositionMs(positionMs);
  }
  if (Number.isFinite(bufferedDurationMs) && bufferedDurationMs >= 0) {
    await session.updateBufferedDurationMs(bufferedDurationMs);
  }
}
```

</details>

## MP4 / MP3 直链播放

MP4 与 MP3 使用文件直链。为同一内容设置稳定的 `contentId`；地址没有扩展名时显式指定 `mimeType`：

```ts
const session = await client.createPlaybackSession({
  url: 'https://cdn.example.com/video/trailer.mp4',
  contentId: 'trailer-2026',
  mimeType: 'mp4',
});
```

将 `session.playbackUrl` 交给支持该格式的播放器。MP3 只需替换媒体地址并将类型设为 `mp3`。文件加速要求源站支持单区间 HTTP Range 请求，并返回有效的 `Content-Range`；不满足条件时不启用 P2P 加速，实际播放与拖动结果仍取决于源站和播放器。SDK 不负责解码，也不绕过 DRM。

## 每路播放配置与源站鉴权

<span id="动态地址与源站请求头" />

客户端配置用于创建 client，每个媒体资源的参数在创建 session 时单独传入：

| 层级 | 参数 | 用途 |
| --- | --- | --- |
| Client | `key` | 对应应用和平台的 SDK Key |
| Client | `p2pEnabled` | 初始 P2P 意愿，仍受控制台策略约束 |
| Session | `url` | 必填的原始媒体地址 |
| Session | `contentId` | 同一内容的稳定标识 |
| Session | `mimeType` | `m3u8`、`mpd`、`mp4` 或 `mp3` |
| Session | `originHeaders` | 仅发给媒体源的请求头 |

对带短期签名的地址传入稳定 `contentId`。没有扩展名时填写 `mimeType`；源站鉴权头通过 `originHeaders` 传入：

```ts
const session = await client.createPlaybackSession({
  url: signedUrl,
  contentId: 'movie-2026-001',
  mimeType: 'mp4',
  originHeaders: { Authorization: `Bearer ${originToken}` },
});
```

这些请求头只用于源站请求，不会发送到 Peer。签名续期由业务层负责，续期后继续使用同一个 `contentId`；不要把 SDK Key、源站 Token 或完整签名 URL 写入日志。

## 预加载与内容切换

<span id="多会话与预加载" />

显式 `preload` 是可选的 HLS/DASH 预热：后台获取清单与首个媒体分片，不会下载整部视频。它也可提前启动 Tracker/Peer 连接，但排队成功不保证 Peer 已连接或媒体已就绪。尚未播放的候选会话不会向 Peer 上传媒体。MP4/MP3 直链不使用这条显式预加载流程。

保存候选会话，选中时复用其播放地址。关闭任一会话前，先停止状态回传、等待在途调用结束并取消其事件订阅，避免回调访问已关闭的会话。预加载不负责解码器准备，也不会渲染首帧。

每个播放器使用独立的 session。列表预览可以提前创建下一条会话：

### 准备候选内容

```ts
const next = await client.createPlaybackSession({
  url: nextItem.url,
  contentId: nextItem.id,
  mimeType: 'm3u8',
});

const queued = await next.preload();
if (queued) {
  // 只有真正切换时才把 next.playbackUrl 交给播放器。
}
```

`preload()` 返回 `true` 只表示预热已排队，不代表首帧已经出图。候选内容不再需要时及时关闭 session，避免连接长期占用。

### 切换至候选内容

真正切换时，先从播放器解除旧媒体引用并关闭旧会话，再使用 `next.playbackUrl`，把 `next` 保留为当前会话。预加载不会驱动播放器，排队成功也不代表 Peer 已就绪；预热可能产生网络流量。

### 取消候选内容

若取消候选内容，则关闭它：

```ts
await next.close();
```

## 运行时控制

<span id="p2p-开关与-cdn-回退" />

### P2P 开关

灰度或排障时可以只关闭当前会话的 P2P：

```ts
await session.setP2pEnabled(false);
// 播放器继续使用 session.playbackUrl。
await session.setP2pEnabled(true);
```

P2P、Tracker 或配置不可用时，继续播放 `session.playbackUrl`。不要因为 Peer 数为零、收到 `p2pUnavailable` 或单次请求回源就替换 URL 或停止播放器。

## 事件与监控

<span id="事件状态与诊断" />

<span id="版本与兼容性诊断" />

同时按 `clientId` 和 `sessionId` 过滤事件，并在关闭会话前移除订阅：

```ts
const subscription = addMeshStreamEventListener((event) => {
  if (event.type === 'p2pUnavailable') {
    console.info('P2P unavailable:', event.reason);
  }
  if (event.type === 'statistics') {
    console.info('peers=', event.statistics?.connectedPeers);
  }
}, { clientId: client.clientId, sessionId: session.sessionId });

const status = await client.getStatus();
const stats = await session.getStats();
const diagnostics = await session.getDiagnostics();

subscription.remove();
```

可用事件包括 `peerCountChanged`、`playbackPrepared`、`p2pReady`、`p2pUnavailable`、`statistics`、`cdnFallback`、`trackerError` 和 `peerConnectError`。`cdnFallback` 是某次请求回源的统计，不代表整个会话切换成 CDN。

| 字段 | 含义 |
| --- | --- |
| `httpDownloaded` | HTTP/CDN 下载字节 |
| `p2pDownloaded` | 从 Peer 获取的字节 |
| `p2pUploaded` | 向 Peer 分享的字节 |
| `connectedPeers` | 当前已连接 Peer 数量 |
| `downloadOffloadRatio` | P2P 下载字节 / HTTP 与 P2P 总下载字节，范围 0–1 |

百分比展示时将 `downloadOffloadRatio` 乘以 100；它是下载分流比例，不是上传分享比例。尚无下载数据时为零，不能仅凭有 Peer 或单次 CDN 回退判断分流效果。通过 `getDiagnostics()` 查看连接耗时和错误信息；可选字段可能为空。

### 版本诊断

提交问题时记录 JavaScript 包版本、原生 SDK 版本和平台：

```ts
const version = await MeshStream.getVersion();
// { packageVersion, nativeSdkVersion, platform }
```

<span id="接入验证" />

<details>
<summary>验证 P2P 效果</summary>

1. 先用单设备确认正常播放、点播拖动，以及关闭 P2P 后仍能播放。
2. 用两个设备播放同一内容，保持 `contentId` 一致；点播选择有重叠的播放进度，直播选择同一频道。媒体字节和时间轴应保持一致，不同资产或个性化清单不要复用同一个 ID。
3. 检查回传单位为毫秒，并在媒体清单加载后持续更新。当前位置 60 秒、连续缓冲到 70 秒时，缓冲值应为 10,000 毫秒；点播 Seek 完成后立即更新位置。
4. 在一段播放时间内观察 P2P 下载字节数与下载分担率的变化。仅有 Peer 连接不代表实际通过 P2P 下载了媒体；分片可用性、网络环境和平台策略都会影响结果。
5. 关闭 P2P，确认播放器继续通过 CDN 播放。随后停止状态回传并取消事件订阅，再关闭会话，确认切换内容后没有继续调用已关闭的会话。

</details>

## 网络与平台策略

Wi-Fi、蜂窝网络、以太网、账户权限与额度由原生 SDK 和控制台策略共同判断，本地 P2P 开关不能覆盖服务端限制。不要向客户端传入 `region`、`areaCode` 或 Tracker/ICE 地址。通过 `getStatus()` 查看 `effectiveP2pEnabled` 与 `reason`；单纯 Peer 数为零不代表播放异常。

SDK 播放地址使用 HTTP 回环代理，即使媒体源是 HTTPS 也需要完成 [Android/iOS 网络配置](./react-native-setup.md)，并确保 Release 包同样生效。已有网络策略时合并必要例外；公网 HTTP 媒体源仅放行所需域名，优先使用 HTTPS。

## 生命周期与后台播放

<span id="生命周期顺序" />

切换内容或销毁播放页面时：

1. 停止状态回传，等待在途回传结束，并取消事件订阅。
2. 停止播放器并解除当前媒体引用。
3. 关闭当前 session 及不再需要的预加载候选会话。
4. 只有其他活动会话都不再需要 client 时，才关闭 client。

后台或画中画仍在播放时，保留对应播放器和会话，由宿主应用配置后台模式、音频会话与播放器能力。页面离开是否释放资源需遵循业务播放策略，不能直接关闭仍在后台播放的会话。SDK 不绕过操作系统限制，也不保证后台持续分享。

```ts
await session.close();
await client.close();
```

## 能力边界

以下为当前 React Native 封装的公共 API 范围；以本页公开参数为准，不要直接传入仅原生 SDK 支持的字段：

| 能力 | 当前封装入口 |
| --- | --- |
| HLS / DASH / MP4 / MP3、源站请求头、稳定内容标识 | 通过会话参数使用 |
| 多会话、预加载、P2P 开关、状态回传、统计 | 使用本页对应方法 |
| `maxMemoryBytes`、Peer 连接上限、请求超时、原生日志级别 | 当前未开放对应公共配置项 |
| Apple `setPictureInPictureActive` | 当前未开放对应桥接方法；播放器支持画中画不等于封装已提供此接口 |
| 解码、ABR、DRM、播放器缓存、系统后台权限 | 由播放器与应用管理 |

P2P 不可用不等于媒体不可播放。会话有效时继续使用其播放地址，是否重试或终止由播放器错误及源站响应决定；原生初始化或桥接调用失败仍需由应用处理。

## 相关文档

[安装与配置](./react-native-setup.md) · [快速接入](./react-native.md) · [故障排查](../troubleshooting.md)
