---
title: Android SDK 快速接入
sidebar_label: 快速接入
description: "Android SDK 快速接入指南：创建播放会话、连接播放器、查看状态并释放资源。"
pagination_label: "Android SDK 快速接入"
---

# Android SDK 快速接入

MeshStream Android SDK 为 Android 播放器增加 P2P 加速能力。应用继续使用自己的播放器，SDK 负责播放会话和加速处理。

<span id="平台与最低版本" />
<span id="接入前准备" />
<span id="工程配置" />
<span id="java--kotlin-编译目标" />
<span id="网络权限" />
<span id="添加依赖" />
<span id="允许本地播放代理" />
<span id="混淆与内存" />
<span id="r8--proguard" />
<span id="媒体缓存预算" />

运行代码前，请先完成[安装与配置](./android-setup.md)，准备 SDK Key 和可播放媒体地址，并配置应用网络策略。

## 快速开始

按以下四步接入：初始化 Client、创建播放会话、将会话返回的播放地址交给播放器、播放结束后释放会话。

### 1. 初始化 Client

```kotlin
val client = P2pSdk.create(
    applicationContext,
    P2pConfig(key = "your_sdk_key"),
)
```

### 2. 创建会话并交给播放器

`originUrl` 是原始媒体地址。每次播放创建一个会话，并始终将 `session.playbackUrl` 交给播放器。会话地址会保留现有媒体播放链路；P2P 是否可用只影响加速状态，不决定是否使用该地址。

```kotlin
val session = client.createPlaybackSession(
    originUrl,
    PlaybackOptions(contentId = "movie-2026-001"),
)

player.setMediaItem(MediaItem.fromUri(session.playbackUrl))
player.prepare()
player.play()
```

### 3. 播放结束时释放会话

```kotlin
session?.close()
```

### 4. 应用不再使用 SDK 时释放 Client

```kotlin
P2pSdk.shutdown()
```

加速暂不可用不会阻断播放，播放器仍使用会话返回的 `playbackUrl`。只有 SDK 初始化或会话创建因本地配置、资源或编程错误而抛出异常时，业务才可自行选择记录错误并直接播放 `originUrl`；这属于业务降级，不经过 SDK，也不会计入 SDK 用量统计。

## 预加载下一条内容

推荐流式内容列表为下一条候选内容先创建会话并调用 `preload()`。它只在后台预热 HLS/DASH 清单与首个分片，不等待网络，也不创建或驱动播放器。用户切换时复用同一个会话；候选内容不再需要时关闭它：

```kotlin
val nextSession = client.createPlaybackSession(nextOriginUrl)
nextSession.preload()

// 用户切换到下一条时
player.setMediaItem(MediaItem.fromUri(nextSession.playbackUrl))
player.prepare()
player.play()

// 候选内容取消时
nextSession.close()
```

## 配置项

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `key` | 必填 | 控制台签发的 SDK Key |
| `playbackUrl` | 空 | 仅作为旧兼容配置的 bootstrap 身份提示，不创建会话也不决定播放器地址；新接入请使用 `createPlaybackSession(originUrl)` 并设置稳定的 `contentId` |
| `contentId` | 空 | 稳定内容标识；动态签名地址建议显式设置 |
| `mimeType` | 空 | `m3u8`、`mpd`、`mp4` 或 `mp3`；扩展名不明显时可以指定 |
| `originHeaders` | 空 Map | 发往源站媒体请求的请求头，不会发送给其他设备 |
| `p2pEnabled` | `true` | 本地 P2P 开关；平台策略优先级更高 |
| `maxPeerConnections` | `12` | 同时连接的 Peer 数量上限 |
| `maxUploadPeers` | `4` | 本设备同时向其他设备分享内容的数量上限 |
| `maxDownloadPeers` | `5` | 本设备同时从其他设备获取内容的数量上限 |
| `requestTimeoutMs` | `8000` | 单个加速媒体请求的最长等待时间；超过后保持正常播放 |
| `maxMemoryBytes` | `64 MiB` | SDK 使用的媒体缓存上限 |
| `logLevel` | `NONE` | 日志级别：`NONE / ERROR / INFO / DEBUG` |

移动端包名和签名信息由 SDK 自动读取，业务代码不需要配置。服务发现地址也由 SDK 内置。

SDK 不接受客户端区域参数。服务端从 SDK Key 解析租户 `homeRegion`，并根据可信请求网络信号确定访问侧 `edgeRegion` 用于 Tracker/ICE 调度；这不是数据驻留配置。不要在客户端添加 `areaCode`、`area_code` 或 `region`。严格多中心模式下，无法解析租户归属区域会返回 `503 HOME_REGION_UNRESOLVED`，请求到错误中心会返回 `421`；SDK 不会自行跨中心切换，所有加速失败仍保留会话播放链路。

## 动态地址与源站请求头

播放地址如果每次都带短期签名参数，建议传入稳定的 `contentId`：

```kotlin
P2pConfig(
    key = "your_sdk_key",
    contentId = "asset-12345",
    mimeType = "m3u8",
    originHeaders = mapOf(
        "Authorization" to "Bearer $originToken",
    ),
)
```

`originHeaders` 只用于访问客户源站，不会发送给其他设备。源站鉴权仍由客户自己的签名 URL、Cookie 或请求头策略负责。

## 播放会话 API

| 方法 | 说明 |
| --- | --- |
| `createPlaybackSession(originUrl)` | 创建一个播放会话并返回 SDK 播放地址 |
| `preload()` | 异步预热 HLS/DASH 清单与首个分片；只用于候选会话，不会播放媒体。仅在本次成功排队时返回 `true` |
| `setP2pEnabled(enabled)` | 运行时开关 P2P，不影响 CDN 播放 |
| `updateBufferedDurationMs(value)` | 上报当前播放时间到缓冲前沿的时长，用于调整后台 P2P 预取 |
| `updateCurrentPositionMs(value)` | 上报当前播放位置；点播用于匹配进度接近的节点，seek 后应立即调用 |
| `statistics()` | 返回当前会话的流量和 Peer 数量快照 |
| `close()` | 结束会话并释放相关资源 |

一个 `P2pClient` 可以管理多个独立播放会话。应用不再需要 SDK 时调用 `P2pSdk.shutdown()`。

## 事件与统计

初始化完成后可以读取服务端策略快照。该状态只用于展示和诊断，不能作为停止播放器的条件：

```kotlin
val status = client.status
println(status.effectiveP2pEnabled)
println(status.reason)
println(status.configVersion)
println(status.trackerPoolReady)
```

`accountEnabled`、`applicationEnabled`、`keyEnabled`、`platformEnabled` 和
`effectiveP2pEnabled` 分别表示账号、应用、Key、平台及最终 P2P 策略。
`trackerPoolReady` 表示服务端是否已准备好加速连接；为 `false` 时本次播放不启用加速。
额度耗尽时
`quotaStatus` 会返回服务端状态，播放仍然保留 CDN 路径。

```kotlin
client.addEventListener(object : P2pEventListener {
    override fun onP2pReady(sessionId: Long) {}
    override fun onPeerCountChanged(sessionId: Long, peerCount: Int) {}
    override fun onStatistics(sessionId: Long, stats: P2pStats) {}
    override fun onP2pUnavailable(sessionId: Long, reason: P2pUnavailableReason) {}
    override fun onCdnFallback(sessionId: Long, bytes: Long) {}
})
```

所有回调都带 `sessionId`，方便一个 client 管理多个播放器时区分会话。P2P 状态事件只表示加速状态，不应作为停止播放的条件。

## HLS、DASH 与 MP4/MP3 直链播放

- SDK 支持 HLS、DASH，以及带 Range 的 MP4/MP3 直链播放请求，但不负责格式解码。
- MP4/MP3 需要源站支持单 Range，并返回有效的 `Content-Range`；不满足条件时保持正常播放但不启用加速。
- 直链媒体地址没有 `.mp4` 或 `.mp3` 后缀时，请在 `PlaybackOptions` 中显式传入 `mimeType = "mp4"` 或 `mimeType = "mp3"`；播放器仍需支持对应格式。
- Android 应用需要使用支持对应格式的播放器，例如 Media3 HLS 或 Media3 DASH。
- Maven `1.1.2` 为四 ABI universal AAR：`armeabi-v7a` / `x86` 构建目标 API 17、`arm64-v8a` / `x86_64` 构建目标 API 21。
- 目标设备必须满足所选 ABI 的最低系统要求；播放器的系统下限需另行满足。
- `INTERNET` 和 `ACCESS_NETWORK_STATE` 权限由 SDK 包声明；应用仍应按自身工程规范确认网络权限。

## 播放容错

以下情况都只会关闭或降低 P2P 加速，不会阻断媒体播放：

- SDK Key 或应用校验失败；
- 当前没有可用 Peer；
- 网络条件不满足 P2P；
- P2P 分片请求超时或失败；
- 服务暂时不可用。

## 下一步

[快速开始](../quickstart.md) · [最佳实践](../best-practices.md) · [故障排查](../troubleshooting.md)

相关文档：[安装与配置](./android-setup.md) · [高级用法](./android-advanced.md)。
