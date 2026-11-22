---
title: Uniapp SDK 快速接入
sidebar_label: 快速接入
description: "Uniapp SDK 快速接入指南：创建播放会话、连接播放器、查看状态并释放资源。"
pagination_label: "Uniapp SDK 快速接入"
---

# Uniapp SDK 快速接入

当前 DCloud 插件版本为 `meshstream-p2p 1.1.4`，可从 [DCloud 插件市场](https://ext.dcloud.net.cn/plugin?name=meshstream-p2p)安装。插件用于 uni-app Vue 3 App，不提供播放器界面或解码器。

<span id="接入准备" />
<span id="安装" />
<span id="平台网络配置" />
<span id="android" />
<span id="ios" />

运行代码前，请先完成[安装与配置](./uniapp-setup.md)，准备 SDK Key 和可播放媒体地址，并配置应用网络策略。

## 最小接入

JavaScript 页面使用插件提供的入口：

```ts
import { MeshStream } from '@/uni_modules/meshstream-p2p/javascript.js'

const client = await MeshStream.create({
  key: 'your_sdk_key',
  p2pEnabled: true,
})
const session = await MeshStream.createPlaybackSession(client.clientId, {
  url: 'https://cdn.example.com/live/playlist.m3u8',
  contentId: 'live-channel-42',
  mimeType: 'm3u8',
})

// 将 session.playbackUrl 绑定到现有 video 播放器。
await MeshStream.updateCurrentPositionMs(client.clientId, session.sessionId, positionMs)
await MeshStream.updateBufferedDurationMs(client.clientId, session.sessionId, bufferedDurationMs)
```

切换内容或页面销毁时：

```ts
await MeshStream.closeSession(client.clientId, session.sessionId)
await MeshStream.closeClient(client.clientId)
```

P2P 不可用时仍会通过 CDN 播放。预加载使用 `await MeshStream.preload(client.clientId, session.sessionId)`；事件使用 `subscribeEvents` 注册并用 `unsubscribeEvents` 取消。

## 版本与验证

Uniapp 插件版本独立于 Android/iOS 原生 SDK 版本。遇到问题时同时记录插件版本、HBuilderX 版本、基座、平台和播放器版本。示例与发布记录见 [Uniapp SDK GitHub 仓库](https://github.com/Mesh-Stream/meshstream-p2p-uniapp-sdk)。

相关文档：[安装与配置](./uniapp-setup.md) · [高级用法](./uniapp-advanced.md)。
