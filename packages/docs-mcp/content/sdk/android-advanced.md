---
title: Android 高级用法
sidebar_label: 高级用法
pagination_label: "Android 高级用法"
---

# Android 高级用法

基础接入只需将 SDK 返回的 `playbackUrl` 交给 Media3 或 ExoPlayer。本页介绍多路播放、鉴权和运行时控制。

## 直播与点播接入策略

SDK 自动识别直播／点播，[基础接入方式相同](./android.md)。播放期间可回传播放器状态，帮助 P2P 调度；不回传也可正常播放。

### 直播

<span id="直播回传缓冲余量" />

<span id="缓冲反馈" />

回传当前位置之后连续可播放的缓冲时长，帮助 SDK 调整 P2P 预取。例如播放到 60 秒、缓冲到 70 秒，应传 **10,000 毫秒**。直播起播位置与目标延迟由播放器设置。

```kotlin
session.updateBufferedDurationMs(bufferedDurationMs)
```

### 点播（VOD）

<span id="点播另外回传播放位置" />

<span id="播放进度与缓冲反馈" />

除缓冲时长外，回传当前播放位置，帮助 SDK 在已连接且拥有目标分片的 Peer 中优先选择进度接近的节点。Seek 完成后立即更新位置。

```kotlin
session.updateCurrentPositionMs(positionMs)
session.updateBufferedDurationMs(bufferedDurationMs)
```

数值均为非负毫秒，缓冲时长不能跨越断档。播放器状态有效后通常每秒回传一次；关闭会话前停止回传并等待在途调用结束。

<span id="播放器状态回传" />

<span id="接入示例" />

<span id="播放器状态回传示例" />

<details>
<summary>完整播放器状态回传示例</summary>

示例使用 `io.meshstream.sdk.PlaybackSession` 和 Media3 `Player`；`isLive` 是业务播放状态。

```kotlin
fun syncPlaybackState(session: PlaybackSession, player: Player, isLive: Boolean) {
    val positionMs = player.currentPosition
    val bufferedEndMs = player.bufferedPosition
    if (positionMs >= 0L && bufferedEndMs >= 0L) {
        val bufferedMs = (bufferedEndMs - positionMs).coerceAtLeast(0L)
        session.updateBufferedDurationMs(bufferedMs)
    }
    if (!isLive && positionMs >= 0L) {
        session.updateCurrentPositionMs(positionMs)
    }
}
```

</details>

## MP4 / MP3 直链播放

MP4 和 MP3 属于点播直链：播放器直接加载文件地址，而不是 HLS `.m3u8` 或 DASH `.mpd` 清单。为同一视频或音频设置稳定的 `contentId`；地址不带扩展名时，显式填写 `mimeType`。

```kotlin
val session = client.createPlaybackSession(
    "https://cdn.example.com/video/trailer.mp4",
    PlaybackOptions(
        contentId = "trailer-2026",
        mimeType = "mp4",
    ),
)

player.setMediaItem(MediaItem.fromUri(session.playbackUrl))
player.prepare()
player.play()
```

MP3 只需将地址和 `mimeType` 分别替换为 `.mp3` 和 `"mp3"`，并使用支持音频播放的 Media3/ExoPlayer 实例。媒体源需要支持单 Range 请求并返回有效的 `Content-Range`。不满足该条件时，文件仍按原有方式播放，但不会启用加速。

## 为每路播放单独配置

一个 `P2pClient` 可以管理多个独立会话。动态签名地址请传入稳定的 `contentId`。

```kotlin
val session = client.createPlaybackSession(
    signedUrl,
    PlaybackOptions(
        contentId = "movie-2026-001",
        mimeType = "m3u8",
        originHeaders = mapOf("Authorization" to "Bearer $originToken"),
    ),
)

player.setMediaItem(MediaItem.fromUri(session.playbackUrl))
player.prepare()
player.play()
```

`originHeaders` 只用于请求客户媒体源，不会发送给其他观看设备。切换内容时先关闭旧会话，再创建新会话。

码率和清晰度由 Media3 / ExoPlayer 管理，不需要业务代码传入表示层标识。

## 预加载与内容切换

显式 `preload` 是可选的 HLS/DASH 预热：后台获取清单与首个媒体分片，不会下载整部视频。它也可提前启动 Tracker/Peer 连接，但排队成功不保证 Peer 已连接或媒体已就绪。尚未播放的候选会话不会向 Peer 上传媒体。MP4/MP3 直链不使用这条显式预加载流程。

保存候选会话，选中时复用其播放地址。关闭任一会话前，先停止状态回传、等待在途调用结束并取消其事件订阅，避免回调访问已关闭的会话。预加载不负责解码器准备，也不会渲染首帧。

播放管理器持有可空的 `currentSession`、`nextSession` 字段，类型均为 `PlaybackSession?`。每个播放器独立管理自己的会话，以下步骤在播放器线程执行。

### 准备候选内容

```kotlin
val candidate = client.createPlaybackSession(
    nextUrl,
    PlaybackOptions(contentId = nextContentId, mimeType = "m3u8"),
)
val previous = nextSession
nextSession = candidate
previous?.close()
val queued = candidate.preload()
```

`queued == true` 只表示预热已排队，不代表已完成。返回 `false` 本身不表示会话无法播放，仍可将其播放地址交给播放器。

### 切换至候选内容

先停止旧会话的状态回传与事件订阅，再停止并解除旧媒体，关闭旧会话并启用候选会话：

```kotlin
val candidate = nextSession
if (candidate != null) {
    player.stop()
    player.clearMediaItems()
    currentSession?.close()
    currentSession = candidate
    nextSession = null
    player.setMediaItem(MediaItem.fromUri(candidate.playbackUrl))
    player.prepare()
    player.play()
}
```

### 取消候选内容

仅关闭已丢弃的候选会话，当前播放不受影响：

```kotlin
nextSession?.close()
nextSession = null
```

## 运行时控制

```kotlin
// 临时关闭当前会话 P2P，播放器继续使用同一个播放地址。
session.setP2pEnabled(false)
session.setP2pEnabled(true)
```

## 事件与监控

```kotlin
client.addEventListener(object : P2pEventListener {
    override fun onP2pReady(sessionId: Long) = log("P2P ready: $sessionId")
    override fun onP2pUnavailable(sessionId: Long, reason: P2pUnavailableReason) =
        log("P2P unavailable: $sessionId, $reason")
    override fun onCdnFallback(sessionId: Long, bytes: Long) =
        log("CDN fallback: $bytes bytes")
    override fun onPeerCountChanged(sessionId: Long, peerCount: Int) =
        updatePeerCount(sessionId, peerCount)
})

val stats = session.statistics()
val offload = stats.downloadOffloadRatio
```

`onP2pUnavailable` 只表示加速暂不可用。不要因该状态停止播放器。

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

SDK 不接受客户端区域参数。SDK 会自动识别 Wi-Fi、蜂窝网络和以太网，并由服务端结合请求网络
和控制台策略决定是否启用加速。`p2pEnabled`、连接数量和超时是本地上限，
服务端策略优先级更高。

```kotlin
P2pConfig(
    key = "your_sdk_key",
    p2pEnabled = true,
    maxPeerConnections = 12,
    maxUploadPeers = 4,
    maxDownloadPeers = 5,
    requestTimeoutMs = 8_000,
)
```

## 生命周期与兜底

- 播放结束、切换媒体或页面销毁时调用 `session.close()`。
- 应用不再使用 SDK 时调用 `P2pSdk.shutdown()`。
- 加速初始化或媒体请求暂时不可用时，播放器继续使用会话的 `playbackUrl`；不要仅因加速状态变化而替换播放地址。
- 不要把 Key、源站 Token 或 `originHeaders` 写入日志。

## 能力边界

SDK 负责播放会话和加速处理；Media3/ExoPlayer 负责清单解析、ABR、解码、渲染和播放器缓存。SDK 不替换播放器，也不承诺后台持续分享。
