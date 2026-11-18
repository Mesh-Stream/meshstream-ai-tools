---
sidebar_position: 2
title: 快速开始
description: 用一条媒体播放链路完成 MeshStream 的首次接入和验收。
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# 快速开始

本指南用于验证一条完整的播放链路：创建应用和 SDK Key、建立播放会话、将 SDK 返回的播放地址交给现有播放器，并确认加速不可用时仍能正常播放。

## 前置条件

- 一个可播放的 HLS `.m3u8`、DASH `.mpd`、支持 Range 的 MP4 或 MP3 地址；
- 已在控制台创建应用和对应平台的 SDK Key；
- 播放器已经能够独立播放原始媒体地址；
- 业务侧已准备好源站鉴权所需的签名 URL、Cookie 或请求头。

<span id="原生与跨平台-sdk-版本对照" />

各端安装入口、当前版本与原生依赖关系统一列在[选择 SDK](./sdk/overview.md)中。

## 1. 创建应用和 SDK Key

在控制台创建应用，再为目标平台创建 SDK Key。SDK Key 用于标识应用和接入平台，可以随客户端发布；它不具备管理后台权限，账号密码、管理凭证和源站密钥不得写入客户端。

应用的归属区域由平台配置确定，业务代码不需要在 SDK 初始化时额外传入区域字段。

## 2. 按平台接入

所有平台遵循同一接入原则：为每次播放创建独立会话，将会话返回的 `playbackUrl` 交给现有播放器，并在播放结束或切换内容时释放会话。

<Tabs groupId="platform" queryString="platform">
  <TabItem value="web" label="Web" default>

安装 SDK，并将会话绑定到现有的 `<video>` 元素：

```bash
npm install @meshstream/p2p-web
```

```ts
import { attach } from "@meshstream/p2p-web";

const session = attach({
  key: "your_sdk_key",
  url: "https://cdn.example.com/video/master.m3u8",
  video: document.querySelector("video")!,
  contentId: "movie-2026-001",
});

const result = await session.start();
console.log(result.mode);

// 页面卸载或切换媒体内容时
session.dispose();
```

[查看 Web SDK 安装与配置](./sdk/web-setup.md)

  </TabItem>
  <TabItem value="android" label="Android">

在项目仓库中添加 Maven 仓库：

```kotlin
maven {
    url = uri("https://sdk.meshstream.net/maven")
    content { includeGroup("io.meshstream") }
}
```

在应用模块中声明依赖：

```kotlin
implementation("io.meshstream:meshstream-android-sdk:1.0.10")
```

创建客户端和播放会话，并将 `playbackUrl` 交给 Media3 / ExoPlayer：

```kotlin
val client = P2pSdk.create(
    applicationContext,
    P2pConfig(key = "your_sdk_key"),
)
val session = client.createPlaybackSession(
    originUrl,
    PlaybackOptions(contentId = "movie-2026-001"),
)

player.setMediaItem(MediaItem.fromUri(session.playbackUrl))
player.prepare()
player.play()

// 切换内容或销毁播放页面时
session.close()
```

[查看 Android SDK 安装与配置](./sdk/android-setup.md)

  </TabItem>
  <TabItem value="ios" label="iOS / macOS">

通过 CocoaPods 安装：

```ruby
pod 'MeshStreamKit', '1.0.10'
```

执行 `pod install --repo-update` 安装依赖。已有项目使用 `Podfile.lock` 锁定的版本；升级 SDK 时先将 `Podfile` 中精确锁定的 `1.0.10` 改为目标已发布版本，再执行 `pod update MeshStreamKit --repo-update`。其他安装方式与应用权限配置见 [iOS / macOS SDK 安装与配置](./sdk/ios-setup.md)。

在播放管理器中持有 `self.client`、`self.session` 和 `self.player` 属性，并执行以下代码。SDK Key 需对应目标平台及已登记的 Bundle ID；`originURL` 为原始媒体地址：

```objc
#import <MeshStreamKit/MeshStreamKit.h>
#import <AVFoundation/AVFoundation.h>

P2PConfig *config = [[P2PConfig alloc] initWithKey:@"your_sdk_key"];
NSError *clientError = nil;
self.client = [P2PSDK clientWithConfig:config error:&clientError];
if (self.client == nil) {
    // 按业务错误处理策略提示或回退。
    return;
}

P2PPlaybackOptions *options = [[P2PPlaybackOptions alloc] init];
options.contentId = @"movie-2026-001";
NSError *playbackError = nil;
self.session = [self.client createPlaybackSessionWithURL:originURL
                                               options:options
                                                 error:&playbackError];
if (self.session == nil) {
    return;
}
AVPlayerItem *item = [AVPlayerItem playerItemWithURL:self.session.playbackUrl];
self.player = [AVPlayer playerWithPlayerItem:item];
[self.player play];
```

将播放器关联至应用的播放视图。结束播放或切换内容时，在对应的生命周期回调中释放旧媒体引用及会话：

```objc
[self.player pause];
[self.player replaceCurrentItemWithPlayerItem:nil];
[self.session close];
self.session = nil;
```

[查看 iOS / macOS SDK 安装与配置](./sdk/ios-setup.md)

  </TabItem>
  <TabItem value="windows" label="Windows">

引入 C ABI 头文件，创建客户端和播放会话，并将 SDK 返回的地址交给桌面播放器：

```c
#include "meshstream.h"

meshstream_config_t config;
meshstream_config_default(&config);
config.key = "your_sdk_key";

meshstream_client_t* client = NULL;
meshstream_client_create(&config, &client);

meshstream_session_t* session = NULL;
meshstream_playback_options_t options = {0};
options.struct_size = sizeof(options);
options.version = MESHSTREAM_PLAYBACK_OPTIONS_VERSION;
options.content_id = "movie-2026-001";

meshstream_client_create_playback_session(
    client, playback_url, &options, &session, NULL);
const char* sdk_playback_url = meshstream_session_get_playback_url(session);
// 将 sdk_playback_url 交给 VLC、ffplay 或业务播放器。

// 播放结束时，先销毁会话，再销毁客户端。
meshstream_session_destroy(session);
meshstream_client_destroy(client);
```

[查看 Windows SDK 安装与配置](./sdk/windows-setup.md)

  </TabItem>
</Tabs>

## 3. 验收播放链路

按以下标准完成首次验收：

1. 播放器加载的是 SDK 返回的 `playbackUrl`，而不是原始媒体地址；
2. 切换媒体内容、页面卸载或播放结束时，旧会话已释放；
3. 暂时关闭 P2P 或阻断加速连接后，媒体仍能通过原有 CDN 播放完成；
4. 控制台可以查询到会话和用量数据。统计采用异步处理，可能存在短暂延迟。

加速能力不可用不等于媒体不可播放。业务错误处理应以播放器和媒体源的实际状态为准，不应仅因 P2P 状态停止播放。
