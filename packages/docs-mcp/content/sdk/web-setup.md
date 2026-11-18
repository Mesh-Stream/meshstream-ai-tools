---
title: Web SDK 安装与配置
sidebar_label: 安装与配置
description: "Web SDK 安装与配置指南：平台要求、依赖安装和应用设置。"
pagination_label: "Web SDK 安装与配置"
---

import Link from '@docusaurus/Link';

# Web SDK 安装与配置

MeshStream Web SDK 在不替换现有播放器的前提下，为 HLS、DASH 播放增加 P2P 加速；MP4 和 MP3 的加速仅在 Service Worker 可用时启用。播放器继续负责清单解析、ABR、解码与渲染；SDK 负责播放会话和加速处理。

## 接入前准备

- 控制台创建的 SDK Key；
- 一个可播放的 HLS `.m3u8`、DASH `.mpd`、支持 Range 的 MP4 或 MP3 地址；
- 页面中的 `<video>` 或 `<audio>` 元素。

安装 SDK：

```bash
npm install @meshstream/p2p-web
```

## 浏览器与播放器接入选择

先按浏览器能力选择传输路径，再按播放器所有权选择接入 API。`getCapability()` 可用于展示接入提示；最终是否启用 P2P 仍由浏览器环境和服务端策略共同决定。

| 环境 | HLS / DASH 接入 | P2P 路径 | 注意事项 |
| --- | --- | --- | --- |
| Chrome、Edge 等 Chromium 浏览器 | 新页面使用 `attach`；已有实例见高级页的 `attachToHls`、Shaka、dash.js 等适配器 | 优先 MSE + WebRTC | 推荐的 Web P2P 接入环境。 |
| Firefox | 使用 `attach` 或对应播放器适配器 | 浏览器同时支持 MSE、WebRTC 时启用 P2P | 以运行时能力检测结果为准。 |
| macOS Safari | 使用 `attach`，并以运行时能力检测为准；DASH 取决于宿主播放器能力 | 支持 MSE 时走常规 MSE + WebRTC；也可强制 Service Worker 灰度 | 不要按浏览器名称静态判断，先检查 `getCapability()`。 |
| iPhone/iPad Safari | HLS 使用原生 `<video>`，并部署同源 Service Worker | 原生播放器 + Service Worker P2P | iOS/iPadOS Safari 没有 MSE HLS P2P 路径。Worker 激活并接管页面后可启用 P2P；否则自动使用 CDN。 |
| MP4 / MP3 直链播放 | 将同源 Worker 脚本部署到站点；可在高级页显式配置路径和 scope | 仅同源 Service Worker + Range P2P | SDK 默认尝试注册 Worker。Worker 未激活、非 HTTPS 或源站不支持 Range 时，继续通过 CDN 播放。 |

已有播放器不需要迁移：hls.js 使用 `attachToHls`，Shaka 使用 `attachToShaka`，dash.js 使用 `attachToDashJs`，Video.js VHS 使用 `attachToVhs`，RxPlayer 使用 `attachToRxPlayer`。这些适配器的初始化顺序和能力边界见 [高级用法](./web-advanced.md#已有播放器适配)。

## 下一步

完成以上配置后，进入[快速接入](./web.md)，创建会话、连接播放器，并在播放结束后释放资源。
