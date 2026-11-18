---
title: 最佳实践
sidebar_position: 3
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# 最佳实践

MeshStream 不替换业务播放器或 CDN。生产接入应遵循四项原则：每次播放创建独立会话；始终使用 SDK 返回的播放地址；在内容切换和生命周期结束时释放会话；在上线前验证加速不可用时的正常播放路径。

## 所有平台通用

### 使用稳定的内容标识

播放地址含临时签名、Token 或追踪参数时，显式传入稳定的 `contentId`，例如 `movie-2026-001` 或 `live-channel-main`。不要把完整签名 URL 当作内容身份，否则同一内容无法稳定识别和复用。

### 服务端调度与降级验收

SDK 不需要传入区域代码。服务端根据 SDK Key 的租户归属和请求网络完成服务调度，业务代码不应自行拼接内部服务地址。上线前应完成一次降级验收：确认控制台出现会话，确认播放器使用 `playbackUrl`，再关闭 P2P 或阻断加速连接，验证媒体仍能通过现有 CDN 完整播放。

### 分片长度决定起播命中速度

HLS/DASH 的分片时长应结合播放器缓冲策略、直播延迟目标和 CDN 配置确定。通常可从约 1--2 秒开始评估；分片过长会延后共享建立，分片过短则可能增加请求和调度开销。Web SDK 的 DASH 点播可配置初始等待时间；直播场景应优先保证及时起播。需要关闭点播初始等待时，可显式设置 `httpDownloadInitialTimeoutMs: 0`。

## 按平台实践

<Tabs groupId="platform" queryString="platform">
  <TabItem value="web" label="Web" default>

### 绑定已有播放器

`attach` 应绑定已有的 `<video>` 元素。页面切换、React 组件卸载或内容切换时，先释放旧会话，再创建新会话，避免多个会话同时占用连接和缓存。

```ts
const session = attach({
  key: "your_sdk_key",
  url: signedM3u8Url,
  contentId: "movie-2026-001",
  video,
});

await session.start();
// React useEffect cleanup、路由切换或切换视频时执行
session.dispose();
```

**播放器边界：** HLS/DASH 清单解析、ABR 和渲染仍由现有播放器负责。

**认证处理：** 使用 `originHeaders` 访问源站，不要将鉴权头暴露给 Peer。

**验收注意：** iOS Safari 没有 MSE 时使用原生 HLS，不能以 Web P2P 命中率作为验收条件。多个视频实例必须各自创建和释放会话。

  </TabItem>
  <TabItem value="android" label="Android">

### 将会话地址交给 Media3 / ExoPlayer

初始化 SDK 后，为每条播放内容创建会话，并将会话地址写入 `MediaItem`。播放器 `release()` 与会话 `close()` 应在页面或播放控制器销毁时一起调用。

```kotlin
val session = client.createPlaybackSession(
    originUrl,
    PlaybackOptions(contentId = "movie-2026-001"),
)

player.setMediaItem(MediaItem.fromUri(session.playbackUrl))
player.prepare()
player.play()

// onStop、切换内容或 ViewModel 清理时
session.close()
```

**错误处理：** 在 `onError` 中保持原有 CDN 播放兜底逻辑，不要将 P2P 初始化失败视为播放器错误。

**前后台：** 遵循应用现有的播放策略，SDK 不保证后台持续维持 Peer 连接。

**列表播放：** 只有实际可见、正在播放的项应保留会话。动态签名地址必须传稳定 `contentId`。

  </TabItem>
  <TabItem value="ios" label="iOS / macOS">

### 由播放器拥有者管理会话

`PlaybackSession` 应和 `AVPlayerItem` 处于同一生命周期：创建 item 前准备会话，替换 item 或页面销毁时关闭会话。不要只释放 `AVPlayer` 而遗留会话。

```objc
PlaybackSession *session = [client createPlaybackSessionWithURL:originURL error:nil];
AVPlayerItem *item = [AVPlayerItem playerItemWithURL:session.playbackUrl];
self.player = [AVPlayer playerWithPlayerItem:item];
[self.player play];

// 切换内容、dealloc 或退出播放页时
[session close];
```

**播放器边界：** `AVPlayer` 原生支持 HLS；播放 DASH 时，由业务侧使用支持 DASH 的播放器。

**认证与标识：** 对签名 URL 使用稳定 `contentId`；源站认证信息仅通过 `originHeaders` 访问源站。

**平台差异：** iOS 和 macOS 使用同一套 Apple SDK，但播放器行为和后台策略应分别验证。

  </TabItem>
  <TabItem value="windows" label="Windows">

### 明确资源所有权和销毁顺序

Windows SDK 使用 C ABI。播放器应使用 `meshstream_session_get_playback_url` 返回的地址；停止播放后先销毁会话，再销毁客户端，防止持有失效的地址或统计句柄。

```c
meshstream_session_t* session = NULL;
meshstream_playback_options_t options = {0};
options.struct_size = sizeof(options);
options.version = MESHSTREAM_PLAYBACK_OPTIONS_VERSION;
options.content_id = "asset-12345";
meshstream_client_create_playback_session(client, playback_url, &options, &session, NULL);

const char* sdk_playback_url = meshstream_session_get_playback_url(session);
// 将 sdk_playback_url 交给 VLC、ffplay 或自研播放器

meshstream_session_destroy(session);
meshstream_client_destroy(client);
```

**播放器边界：** HLS/DASH 是否可播放由业务播放器决定，SDK 不负责解码和渲染。

**并发会话：** 每个播放器使用独立的 `meshstream_session_t`，不要跨内容复用句柄。

**退出顺序：** 等待播放器停止读取地址后再销毁 session；通过 `meshstream_session_get_stats` 读取快照，避免在播放器线程中阻塞统计读取。

  </TabItem>
</Tabs>

## 常见遗漏

| 现象 | 优先检查 |
| --- | --- |
| 一直是 CDN | Key、HTTPS/WSS 网络权限、内容标识、可用 Peer，以及服务端 Tracker/ICE 调度状态 |
| 控制台没有统计 | 是否使用 `playbackUrl`、会话是否正常结束、是否过早释放应用进程 |
| 切换内容后异常 | 旧会话是否已释放，新内容是否创建了独立会话 |
| 签名地址无法聚合 | 是否传入稳定 `contentId`，而不是完整签名 URL |

需要更具体的 SDK 参数和 API，请查看 [Web](./sdk/web.md)、[Android](./sdk/android.md)、[iOS](./sdk/ios.md) 或 [Windows](./sdk/windows.md) 文档。
