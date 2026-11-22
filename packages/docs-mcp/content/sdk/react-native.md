---
title: React Native SDK 快速接入
sidebar_label: 快速接入
description: "React Native SDK 快速接入指南：创建播放会话、连接播放器、查看状态并释放资源。"
pagination_label: "React Native SDK 快速接入"
---

# React Native SDK 快速接入

当前 npm 包版本为 `react-native-meshstream 1.1.2`，发布于 [npm](https://www.npmjs.com/package/react-native-meshstream/v/1.1.2)。它提供统一的 JavaScript client/session API，播放器仍由应用管理。

<span id="接入准备" />
<span id="安装" />
<span id="android-本地代理网络配置" />
<span id="ios-本地代理网络配置" />

运行代码前，请先完成[安装与配置](./react-native-setup.md)，准备 SDK Key 和可播放媒体地址，并配置应用网络策略。

## 最小接入

```tsx
import Video from 'react-native-video';
import { MeshStream } from 'react-native-meshstream';

const client = await MeshStream.create({ key: 'your_sdk_key' });
const session = await client.createPlaybackSession({
  url: 'https://cdn.example.com/live/playlist.m3u8',
  contentId: 'live-channel-42',
  mimeType: 'm3u8',
});

<Video source={{ uri: session.playbackUrl }} controls />;
```

切换内容或播放器销毁时关闭当前资源：

```ts
await session.close();
await client.close();
```

P2P 策略、Tracker 或 Peer 不可用时会回退 CDN，不应因此停止播放器。可使用 `getStatus()`、`getStats()` 和 `getDiagnostics()` 查看状态，并通过 `addMeshStreamEventListener` 订阅事件。

## 预加载与多播放器

一个 client 可以管理多个独立 session。下一条内容可先创建 session 并调用 `await next.preload()`；只有真正播放时才把 `next.playbackUrl` 交给播放器。取消候选内容时关闭对应 session。

## 版本与验证

React Native 包版本独立于原生 SDK 版本。诊断时同时记录 npm 包版本和原生 SDK 版本。示例与发布记录见 [React Native SDK GitHub 仓库](https://github.com/Mesh-Stream/meshstream-p2p-react-native-sdk)。

相关文档：[安装与配置](./react-native-setup.md) · [高级用法](./react-native-advanced.md)。
