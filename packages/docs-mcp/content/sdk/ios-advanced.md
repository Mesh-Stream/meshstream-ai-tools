---
title: iOS / macOS SDK 高级用法
sidebar_label: 高级用法
description: 配置 iOS 与 macOS 播放会话、媒体源鉴权、预加载及运行时控制。
pagination_label: "iOS / macOS SDK 高级用法"
---

# iOS / macOS SDK 高级用法

本文介绍播放会话管理、媒体源鉴权、预加载及运行时控制。首次接入请参阅[快速接入](./ios.md)。

示例代码在播放管理器的方法中执行，由 `self.client`、`self.session` 和 `self.player` 属性持有相关对象。替换当前播放会话前，先暂停播放器、解除旧媒体引用并关闭旧会话；仅在新会话创建成功后加载播放地址。

## 直播与点播接入策略

SDK 自动识别直播／点播，[基础接入方式相同](./ios.md)。播放期间可回传播放器状态，帮助 P2P 调度；不回传也可正常播放。

### 直播

<span id="直播回传缓冲余量" />

<span id="缓冲反馈" />

回传当前位置之后连续可播放的缓冲时长，帮助 SDK 调整 P2P 预取。例如播放到 60 秒、缓冲到 70 秒，应传 **10,000 毫秒**。直播起播位置与目标延迟由播放器设置。

```objc
[self.session updateBufferedDurationMs:bufferedMs];
```

### 点播（VOD）

<span id="点播另外回传播放位置" />

<span id="播放进度与缓冲反馈" />

除缓冲时长外，回传当前播放位置，帮助 SDK 在已连接且拥有目标分片的 Peer 中优先选择进度接近的节点。Seek 完成后立即更新位置。

```objc
[self.session updateCurrentPositionMs:positionMs];
[self.session updateBufferedDurationMs:bufferedMs];
```

数值均为非负毫秒，缓冲时长不能跨越断档。播放器状态有效后通常每秒回传一次；关闭会话前停止回传并等待在途调用结束。

<span id="直播与点播" />

<span id="播放器状态回传" />

<span id="接入示例" />

<span id="播放器状态回传示例" />

<span id="同步播放状态" />

<details>
<summary>完整播放器状态回传示例</summary>

在播放管理器中添加此方法。直播传 `YES`，点播传 `NO`；AVPlayer 的秒值在方法内转换为毫秒。

```objc
#include <math.h>

- (void)syncPlaybackStateForLiveStream:(BOOL)isLive {
    if (!self.session || !self.player.currentItem) return;
    CMTime currentTime = self.player.currentTime;
    double positionSeconds = CMTimeGetSeconds(currentTime);
    if (!isfinite(positionSeconds) || positionSeconds < 0) return;

    int64_t bufferedMs = 0;
    for (NSValue *value in self.player.currentItem.loadedTimeRanges) {
        CMTimeRange range = value.CMTimeRangeValue;
        if (CMTimeRangeContainsTime(range, currentTime)) {
            double seconds = CMTimeGetSeconds(
                CMTimeSubtract(CMTimeRangeGetEnd(range), currentTime));
            if (isfinite(seconds) && seconds >= 0) {
                bufferedMs = (int64_t)(seconds * 1000.0);
            }
            break;
        }
    }
    [self.session updateBufferedDurationMs:bufferedMs];
    if (!isLive) {
        [self.session updateCurrentPositionMs:(int64_t)(positionSeconds * 1000.0)];
    }
}
```

</details>

## MP4 / MP3 文件播放

MP4 和 MP3 使用媒体文件地址接入。为同一媒体资源设置稳定的 `contentId`；地址不包含文件扩展名时，通过 `mimeType` 指定媒体类型。

```objc
P2PPlaybackOptions *options = [[P2PPlaybackOptions alloc] init];
options.contentId = @"trailer-2026";
options.mimeType = @"mp4";

NSError *error = nil;
self.session = [self.client createPlaybackSessionWithURL:
    [NSURL URLWithString:@"https://cdn.example.com/video/trailer.mp4"]
    options:options
    error:&error];
if (self.session != nil) {
    AVPlayerItem *item = [AVPlayerItem playerItemWithURL:self.session.playbackUrl];
    self.player = [AVPlayer playerWithPlayerItem:item];
    [self.player play];
}
```

MP3 接入时，将示例地址替换为 MP3 文件地址，并设置 `mimeType = @"mp3"`。

文件加速要求媒体源支持单区间 HTTP Range 请求，并返回有效的 `Content-Range`。媒体源不满足该条件时不启用加速，实际播放结果仍取决于媒体源与播放器。

## 多会话管理

一个 `P2PClient` 可管理多个独立的 `PlaybackSession`。每个播放器实例使用独立会话，切换内容时释放旧会话并创建新会话；已预加载的内容可直接使用对应的候选会话。

## 媒体源鉴权

媒体地址包含临时签名时，通过稳定的 `contentId` 标识同一资源。需要请求头鉴权的媒体源可使用 `originHeaders` 传入凭据；这些请求头仅用于访问媒体源，不发送至其他对等节点。

```objc
P2PPlaybackOptions *options = [[P2PPlaybackOptions alloc] init];
options.contentId = @"movie-2026-001";
options.mimeType = @"m3u8";
options.originHeaders = @{ @"Authorization": [NSString stringWithFormat:@"Bearer %@", originToken] };

NSError *error = nil;
self.session = [self.client createPlaybackSessionWithURL:signedOriginURL
                                                   options:options
                                                     error:&error];
if (self.session != nil) {
    AVPlayerItem *item = [AVPlayerItem playerItemWithURL:self.session.playbackUrl];
    [self.player replaceCurrentItemWithPlayerItem:item];
    [self.player play];
}
```

Token、Cookie 及完整签名 URL 按应用安全策略管理，日志与分析数据中应移除相关敏感信息。

## 预加载与内容切换

显式 `preload` 是可选的 HLS/DASH 预热：后台获取清单与首个媒体分片，不会下载整部视频。它也可提前启动 Tracker/Peer 连接，但排队成功不保证 Peer 已连接或媒体已就绪。尚未播放的候选会话不会向 Peer 上传媒体。MP4/MP3 直链不使用这条显式预加载流程。

保存候选会话，选中时复用其播放地址。关闭任一会话前，先停止状态回传、等待在途调用结束并取消其事件订阅，避免回调访问已关闭的会话。预加载不负责解码器准备，也不会渲染首帧。

预加载为可选能力，适用于信息流及连续播放等场景。将候选会话保存至 `PlaybackSession *nextSession` 属性，开始播放时直接复用该会话。

### 准备候选内容

```objc
[self.nextSession close];
NSError *error = nil;
self.nextSession = [self.client createPlaybackSessionWithURL:nextURL error:&error];
if (self.nextSession != nil) {
    [self.nextSession preload];
}
```

### 切换至候选内容

释放当前媒体引用及会话后，将候选会话设为当前会话，再加载其播放地址：

```objc
if (!self.nextSession) {
    return;
}
[self.player pause];
[self.player replaceCurrentItemWithPlayerItem:nil];
[self.session close];
self.session = self.nextSession;
self.nextSession = nil;
AVPlayerItem *item = [AVPlayerItem playerItemWithURL:self.session.playbackUrl];
[self.player replaceCurrentItemWithPlayerItem:item];
[self.player play];
```

### 取消候选内容

候选内容不再需要时，关闭其会话并释放引用：

```objc
[self.nextSession close];
self.nextSession = nil;
```

预加载会产生网络流量。`preload` 返回成功表示请求已接受，不代表媒体下载完成或首帧已渲染。

## 运行时控制

### 调整加速状态与读取统计

```objc
[self.session setP2PEnabled:NO]; // 临时关闭加速
[self.session setP2PEnabled:YES];
P2PStats *stats = [self.session statistics];
```

`setP2PEnabled:` 用于调整当前会话的 P2P 开关，实际加速能力仍受控制台策略约束。

## 事件与监控

```objc
@interface PlaybackObserver : NSObject <P2PEventListener>
@end

@implementation PlaybackObserver
- (void)onP2PReady { }
- (void)onP2PUnavailable:(P2PUnavailableReason)reason { }
- (void)onPeerCountChanged:(NSInteger)peerCount { }
- (void)onCdnFallbackWithBytes:(int64_t)bytes { }
- (void)onStatistics:(P2PStats *)stats { }
@end
```

将事件监听器保存至 `PlaybackObserver *observer` 属性，并在播放管理器中注册：

```objc
self.observer = [[PlaybackObserver alloc] init];
[self.client addEventListener:self.observer];
```

结束监听时，移除已注册的同一实例并释放引用：

```objc
[self.client removeEventListener:self.observer];
self.observer = nil;
```

加速事件和统计用于观测 SDK 运行状态；播放状态及播放控制由应用通过播放器接口管理。

<span id="接入验证" />

<details>
<summary>验证 P2P 效果</summary>

1. 先用单设备确认正常播放、点播拖动，以及关闭 P2P 后仍能播放。
2. 用两个设备播放同一内容，保持 `contentId` 一致；点播选择有重叠的播放进度，直播选择同一频道。媒体字节和时间轴应保持一致，不同资产或个性化清单不要复用同一个 ID。
3. 检查回传单位为毫秒，并在媒体清单加载后持续更新。当前位置 60 秒、连续缓冲到 70 秒时，缓冲值应为 10,000 毫秒；点播 Seek 完成后立即更新位置。
4. 在一段播放时间内观察 P2P 下载字节数与下载分担率的变化。仅有 Peer 连接不代表实际通过 P2P 下载了媒体；分片可用性、网络环境和平台策略都会影响结果。
5. 关闭 P2P，确认播放器继续通过 CDN 播放。随后停止状态回传并取消事件订阅，再关闭会话，确认切换内容后没有继续调用已关闭的会话。

</details>

## 应用与授权配置

使用对应平台的 SDK Key，并确保应用 Bundle ID 与控制台登记信息一致。SDK 自动读取 Bundle ID，无需额外配置服务地址。客户端及会话的 P2P 开关均受控制台策略约束；媒体源鉴权凭据由应用管理。

## 生命周期管理

### 资源释放

- 每个播放器使用独立的播放会话，每个会话对应一个媒体资源。
- 结束播放时，先暂停播放器并解除媒体引用，再关闭当前会话及不再需要的候选会话。
- 应用不再使用任何 SDK 客户端或会话时，调用 `+[P2PSDK shutdown]` 释放全局资源。

### 后台播放与画中画

后台播放与画中画需在应用及播放器中配置相应能力。应用自行管理画中画时，在实际开始和结束的回调中调用 `[session setPictureInPictureActive:YES]` 或 `NO` 同步状态。

后台或画中画播放继续期间，应保留相应播放器与会话。SDK 会话状态不替代操作系统要求的后台权限或音频会话配置。

## 兼容性与错误处理

SDK 负责媒体分发加速，播放器负责解码、渲染、缓冲及播放错误处理。第三方播放器使用会话返回的 `playbackUrl`，媒体格式、DRM 及后台能力由播放器、操作系统与应用配置共同决定。

`P2PUnavailableReason` 表示加速能力不可用，不是媒体播放错误。会话仍有效时继续使用其播放地址；播放是否需要重试或终止，应根据播放器错误及媒体源状态判断。SDK Key 鉴权与媒体源鉴权分别处理，后者失败时需按业务流程更新凭据或提示错误。
