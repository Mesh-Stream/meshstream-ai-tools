---
title: Web SDK 快速接入
sidebar_label: 快速接入
description: "Web SDK 快速接入指南：创建播放会话、连接播放器、查看状态并释放资源。"
pagination_label: "Web SDK 快速接入"
---

import Link from '@docusaurus/Link';

# Web SDK 快速接入

MeshStream Web SDK 在不替换现有播放器的前提下，为 HLS、DASH 播放增加 P2P 加速；MP4 和 MP3 的加速仅在 Service Worker 可用时启用。播放器继续负责清单解析、ABR、解码与渲染；SDK 负责播放会话和加速处理。

本页只覆盖一条可稳定上线的最小接入链路。使用已初始化播放器、动态鉴权、Service Worker 或运行时诊断时，请进入 [高级用法](./web-advanced.md)。

<span id="接入前准备" />
<span id="浏览器与播放器接入选择" />

运行代码前，请先完成[安装与配置](./web-setup.md)，准备 SDK Key 和可播放媒体地址，并配置应用网络策略。

## 最小接入

`attach` 是标准入口。SDK 根据媒体地址自动识别 HLS、DASH、MP4 或 MP3，并在内部创建所需的会话与传输路径：

```ts
import { attach } from "@meshstream/p2p-web";

const session = attach({
  key: "your_sdk_key",
  url: "https://cdn.example.com/video/master.m3u8",
  video: document.querySelector("video")!,
});

const result = await session.start();
console.log(result.mode);

window.addEventListener("pagehide", () => session.dispose(), { once: true });
```

`start()` 返回当前实际使用的传输模式。加速暂不可用时，会话仍通过既有媒体交付路径保持播放；不要把加速状态视为播放失败，也不要仅据此替换播放器地址。


## 基础配置

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `key` | 是 | 控制台签发的 SDK Key。 |
| `url` | 是 | 原始播放地址。HLS/DASH 使用常规接入；MP4/MP3 加速需要 Service Worker。 |
| `video` | 是 | 目标 `<video>` 或 `<audio>` 元素。 |
| `contentId` | 否 | 稳定的内容标识。播放地址带签名参数或会变化时建议填写。 |
| `mimeType` | 否 | 媒体类型提示：`m3u8`、`mpd`、`mp4` 或 `mp3`。通常无需填写。 |
| `autoplay` | 否 | 是否在播放器初始化后尝试自动播放。浏览器自动播放策略仍然生效。 |
| `p2pEnabled` | 否 | 传入 `false` 时，关闭本会话加速。 |

对于无扩展名且受鉴权保护的播放地址，请显式设置 `mimeType`；对于会变化的签名 URL，请传入稳定的 `contentId`。更多鉴权与动态地址配置见 [高级用法](./web-advanced.md#动态地址与源站鉴权)。

## 直播与点播

无需指定“直播”或“点播”参数。SDK 会自动识别：HLS 根据媒体清单中的 `#EXT-X-ENDLIST`，DASH 根据 MPD 的 `type="dynamic"`，MP4/MP3 按点播处理。URL 后缀无法判断时，SDK 会探测源站 `Content-Type`；受鉴权保护的无后缀地址可显式传入 `mimeType`。

直播请使用稳定的频道 ID，点播请使用稳定的节目或资产 ID：

```ts
const session = attach({
  key: "your_sdk_key",
  url: liveUrl,
  contentId: "live-channel-123",
  video: document.querySelector("video")!,
});
```

识别结果同时用于调度与用量统计。直播缓冲与低延迟参数只适用于 hls.js，详见 [HLS 与低延迟配置](./web-advanced.md#hls-与低延迟配置)；DASH 由 Shaka、dash.js 或业务自己的播放器配置管理，MP4/MP3 使用 Service Worker Range 传输并固定按点播处理。

## 生命周期与播放连续性

每次播放对应一个独立会话。播放结束、切换内容或页面销毁时调用 `dispose()`；再次播放新内容时创建新会话。

| 场景 | SDK 行为 |
| --- | --- |
| 浏览器不支持加速 | 保持当前会话管理的播放器地址，正常播放。 |
| 加速暂时不可用 | 自动保持正常播放。 |
| 服务端关闭 Key、应用或额度不可用 | 新会话保持正常播放，并提供诊断原因。 |
| 业务调用 `setP2pEnabled(false)` | 关闭本会话加速，播放不中断。 |

可通过 `result.fallbackReason` 记录接入诊断，但不要因该字段停止播放器：

```ts
const result = await session.start();
if (result.fallbackReason) {
  console.info("MeshStream acceleration unavailable", result.fallbackReason);
}
```

## 下一步

- [Web SDK 高级用法](./web-advanced.md)：Service Worker、动态地址、鉴权、播放器适配与可观测性。
- [最佳实践](../best-practices.md)：上线前检查与播放链路边界。
- [故障排查](../troubleshooting.md)：定位配置、网络和 Peer 问题。

## 场景与效果验证

- <Link to="/solutions/live-streaming">直播 P2P CDN 方案</Link>：先判断同内容并发、网络和延迟条件，再设计灰度与 CDN 回退验证。
- <Link to="/guides/reduce-video-cdn-cost">视频 CDN 成本优化与分流测量指南</Link>：区分分流字节与净成本，按可比业务窗口评估效果。

相关文档：[安装与配置](./web-setup.md) · [高级用法](./web-advanced.md)。
