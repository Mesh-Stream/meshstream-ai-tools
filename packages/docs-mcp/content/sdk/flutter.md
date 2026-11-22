---
title: Flutter SDK 快速接入
sidebar_label: 快速接入
description: "Flutter SDK 快速接入指南：创建播放会话、连接播放器、查看状态并释放资源。"
pagination_label: "Flutter SDK 快速接入"
---

# Flutter SDK 快速接入

当前插件版本为 `meshstream_p2p 1.1.2`，发布于 [pub.dev](https://pub.dev/packages/meshstream_p2p/versions/1.1.2)。插件把原生 SDK 的播放地址和状态交给 Flutter 播放器，不提供播放器界面或解码器。

<span id="接入准备" />
<span id="安装" />
<span id="flutter-默认工程" />
<span id="使用-settings-集中管理仓库的工程" />
<span id="平台网络配置" />
<span id="android" />
<span id="ios" />

运行代码前，请先完成[安装与配置](./flutter-setup.md)，准备 SDK Key 和可播放媒体地址，并配置应用网络策略。

## 最小接入

```dart
import 'package:meshstream_p2p/meshstream_p2p.dart';
import 'package:video_player/video_player.dart';

final client = await MeshStream.create(
  MeshStreamConfig(key: 'your_sdk_key'),
);
final session = await client.createPlaybackSession(
  PlaybackSessionOptions(
    url: 'https://cdn.example.com/live/playlist.m3u8',
    contentId: 'live-channel-42',
    mimeType: MeshStreamMimeType.m3u8,
  ),
);
final controller = VideoPlayerController.networkUrl(
  Uri.parse(session.playbackUrl),
);
await controller.initialize();
await controller.play();
```

播放结束时先释放播放器，再关闭会话和客户端：

```dart
await controller.dispose();
await session.close();
await client.close();
```

P2P 暂不可用时仍会使用会话的播放地址通过 CDN 播放。可使用 `session.getStats()`、`session.getDiagnostics()` 和 `client.getStatus()` 查看状态；不要因为 P2P 不可用而停止播放器。

## 运行官方示例

从 [Flutter SDK 仓库](https://github.com/Mesh-Stream/meshstream-p2p-flutter-sdk)获取示例，在 `example` 目录运行：

```bash
flutter pub get
flutter devices
flutter run --target lib/main.dart
```

连接多个设备时添加 `-d 设备ID`。页面打开后输入控制台创建的 SDK Key 和可播放的媒体地址，点击 **Create session**，即可查看画面及 P2P/CDN 统计。输入框中的提示值需要替换为自己的有效信息。

### Android 独立运行与 APK

需要在脱离开发工具后使用 Demo，可在 `example` 目录构建并启动 Release 版本；将 `YOUR_ANDROID_DEVICE_ID` 替换为 `flutter devices` 显示的设备 ID：

```bash
flutter run --release --target lib/main.dart -d YOUR_ANDROID_DEVICE_ID
```

需要分发 APK 时执行：

```bash
flutter build apk --release --target lib/main.dart
```

APK 位于 `build/app/outputs/flutter-apk/app-release.apk`。发布自己的应用前，按 Flutter 的 Android 发布流程配置应用 ID、版本及正式签名。

## 预加载与生命周期

列表场景可以为下一条内容创建独立会话并调用 `await session.preload()`，真正播放时复用该会话。候选内容取消时调用 `session.close()`；播放页面销毁时取消事件订阅并释放播放器、会话和客户端。

## 版本与验证

Flutter 包版本独立于原生 SDK 版本。遇到问题时同时记录 `meshstream_p2p` 版本、原生 Android/iOS SDK 版本、平台和播放器版本。示例与发布记录见 [Flutter SDK GitHub 仓库](https://github.com/Mesh-Stream/meshstream-p2p-flutter-sdk)。

相关文档：[安装与配置](./flutter-setup.md) · [高级用法](./flutter-advanced.md)。
