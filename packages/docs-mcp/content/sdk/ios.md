---
title: iOS / macOS SDK 快速接入
sidebar_label: 快速接入
description: "iOS / macOS SDK 快速接入指南：创建播放会话、连接播放器、查看状态并释放资源。"
pagination_label: "iOS / macOS SDK 快速接入"
---

# iOS / macOS SDK 快速接入

MeshStreamKit 为 iOS 和 macOS 应用提供 P2P 媒体分发加速能力。SDK 提供 Objective-C 接口，可与 AVPlayer 或兼容的第三方播放器集成。

当前发布版本为 `MeshStreamKit 1.1.2`，同一发行包包含 iOS 真机、iOS 模拟器及 macOS 双架构组件。

官方发布包、示例工程及更新说明见 [SDK 仓库](https://github.com/Mesh-Stream/meshstream-p2p-ios-sdk)。

<span id="环境要求" />
<span id="接入准备" />
<span id="安装-sdk" />
<span id="cocoapods" />
<span id="swift-package-manager" />
<span id="手动集成" />
<span id="更新-sdk" />
<span id="应用配置" />
<span id="ios" />
<span id="macos" />

运行代码前，请先完成[安装与配置](./ios-setup.md)，准备 SDK Key 和可播放媒体地址，并配置应用网络策略。

## 开始播放

### 持有播放对象

在播放管理器或页面控制器中持有客户端、播放会话和播放器，确保其生命周期覆盖整个播放过程：

```objc
@property(nonatomic, strong) P2PClient *client;
@property(nonatomic, strong) PlaybackSession *session;
@property(nonatomic, strong) AVPlayer *player;
```

### 创建播放会话

使用 SDK Key 初始化客户端，为媒体地址创建播放会话，再将 `playbackUrl` 传入播放器。示例中的 `originURL` 为原始媒体地址：

```objc
#import <AVFoundation/AVFoundation.h>
#import <MeshStreamKit/MeshStreamKit.h>

P2PConfig *config = [[P2PConfig alloc] initWithKey:@"YOUR_IOS_SDK_KEY"];
NSError *error = nil;
self.client = [P2PSDK clientWithConfig:config error:&error];
if (!self.client) {
    NSLog(@"SDK initialization failed: %@", error);
    return;
}

self.session = [self.client createPlaybackSessionWithURL:originURL error:&error];
if (!self.session) {
    NSLog(@"Playback session creation failed: %@", error);
    return;
}

self.player = [AVPlayer playerWithURL:self.session.playbackUrl];
[self.player play];
```

将 `self.player` 关联至应用的播放视图。第三方播放器使用同一会话返回的 `playbackUrl`。

客户端或会话创建失败时，依据返回的 `NSError` 处理异常；仅在会话创建成功后初始化播放器。

### 释放播放资源

切换内容或结束播放时，先暂停播放器并解除媒体引用，再关闭对应会话：

```objc
[self.player pause];
[self.player replaceCurrentItemWithPlayerItem:nil];
[self.session close];
self.session = nil;
```

`[P2PSDK shutdown]` 用于全局资源释放，仅在应用不再使用任何 SDK 客户端或会话时调用。单个播放页面退出时关闭对应会话即可；画中画或后台播放仍在继续时，应保留所需的播放对象。

## 常用配置

通过 `P2PConfig` 设置客户端配置，配置在创建客户端时生效。

| 属性 | 默认值 | 说明 |
| --- | --- | --- |
| `sdkKey` | 必填 | 通过 `initWithKey:` 传入对应平台的 SDK Key |
| `p2pEnabled` | `YES` | P2P 加速开关，受控制台策略约束 |
| `maxPeerConnections` | `12` | 最大对等节点连接数 |
| `maxUploadPeers` | `4` | 最大并发上传节点数 |
| `maxDownloadPeers` | `5` | 最大并发下载节点数 |
| `maxMemoryBytes` | `64 MiB` | SDK 媒体缓存容量上限 |
| `requestTimeoutMs` | `8000` | P2P 媒体请求超时，单位为毫秒 |
| `logLevel` | `P2PLogLevelNone` | 日志级别：`None / Error / Info / Debug` |
| `fileLoggingEnabled` | `NO` | 是否保存本地诊断日志 |

`maxMemoryBytes` 仅限制 SDK 媒体缓存，不包含播放器及应用的其他内存占用。`requestTimeoutMs` 不控制播放器启动超时。

## 预加载

预加载为可选能力，适用于提前准备下一条播放内容。创建独立会话后调用 `[session preload]`；开始播放时复用该会话的 `playbackUrl`，取消预加载时调用 `[session close]`。

预加载会产生网络流量。方法返回成功表示预加载请求已接受，不代表媒体下载完成或首帧已渲染。会话管理与内容切换示例见[高级用法](./ios-advanced.md)。

## 事件与统计

通过 `P2PEventListener` 订阅加速事件，或调用 `[session statistics]` 获取当前会话统计。

| 字段 | 说明 | 单位 |
| --- | --- | --- |
| `httpDownloaded` | HTTP 下载流量 | 字节 |
| `p2pDownloaded` | P2P 下载流量 | 字节 |
| `p2pUploaded` | P2P 上传流量 | 字节 |
| `connectedPeers` | 已连接的对等节点数 | 个 |

## 诊断日志

日志默认关闭。需要诊断时，在创建客户端前设置日志级别及文件记录选项：

```objc
config.logLevel = P2PLogLevelInfo;
config.fileLoggingEnabled = YES;
```

日志文件保存在应用的 Caches 目录，采用滚动清理机制，不自动上传。生产环境建议按需启用，并在共享诊断资料前移除 SDK Key、访问凭据及敏感媒体地址。

## 兼容性与常见问题

### 支持哪些播放器与媒体格式？

播放器需支持加载 SDK 返回的播放地址。媒体格式、解码、DRM、后台播放及画中画的支持范围由所选播放器、操作系统及应用配置决定。音频会话与后台能力按播放器文档配置。

### 节点数为 0 是否表示播放异常？

`connectedPeers` 表示当前已连接的对等节点数，不是播放器状态。P2P 暂不可用时，应用仍应依据播放器错误及媒体源状态判断播放结果。更多诊断步骤见[故障排查](../troubleshooting.md)。

### CocoaPods 无法解析依赖时如何处理？

确认 Pod 名称为 `MeshStreamKit`，并执行 `pod install --repo-update`。新版本发布后，公共索引可能存在同步延迟；可使用 [SDK 仓库](https://github.com/Mesh-Stream/meshstream-p2p-ios-sdk)提供的版本化远程 podspec 方式安装。CocoaPods 集成请使用官方发布的 Pod，而非 `:git` 源码依赖。

## 示例与支持

- iOS：[示例工程](https://github.com/Mesh-Stream/meshstream-p2p-ios-sdk/tree/main/Examples/iOS)。运行前配置签名团队、Bundle ID 和 SDK Key。
- macOS：[示例工程](https://github.com/Mesh-Stream/meshstream-p2p-ios-sdk/tree/main/Examples/macOS)。
- 商务与技术支持：[support@meshstream.net](mailto:support@meshstream.net)。

SDK 的使用与分发遵循适用的商业授权协议。应用分发时需保留[第三方许可声明](https://github.com/Mesh-Stream/meshstream-p2p-ios-sdk/blob/main/THIRD_PARTY_NOTICES.md)，并按业务要求完成隐私披露与设备兼容性验证。

## 下一步

[高级用法](./ios-advanced.md) · [快速开始](../quickstart.md) · [故障排查](../troubleshooting.md)

相关文档：[安装与配置](./ios-setup.md) · [高级用法](./ios-advanced.md)。
