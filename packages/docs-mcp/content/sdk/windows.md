---
title: Windows SDK 快速接入
sidebar_label: 快速接入
description: "Windows SDK 快速接入指南：创建播放会话、连接播放器、查看状态并释放资源。"
pagination_label: "Windows SDK 快速接入"
---

# Windows SDK 快速接入

MeshStream Windows SDK 通过 C ABI 为桌面播放器提供 P2P 加速能力。应用继续使用自己的播放器，SDK 负责播放会话和加速处理。

<span id="平台与运行环境" />
<span id="接入前准备" />
<span id="添加-sdk" />

运行代码前，请先完成[安装与配置](./windows-setup.md)，准备 SDK Key 和可播放媒体地址，并配置应用网络策略。

## 快速开始

按以下四步接入：初始化 Client、创建播放会话、将 SDK 地址交给播放器、播放结束后释放资源。

### 1. 初始化 Client

```c
#include "meshstream.h"

meshstream_config_t config = {0};
meshstream_config_default(&config);
config.key = "your_sdk_key";

meshstream_client_t* client = NULL;
if (meshstream_client_create(&config, &client) != MESHSTREAM_OK) {
    // 记录本地初始化错误；业务可自行决定是否降级为原始播放地址。
    return;
}
```

### 2. 创建会话并交给播放器

`origin_url` 是原始媒体地址。每次播放创建一个会话，并始终将 SDK 返回的 `playback_url` 交给播放器。会话地址会保留现有媒体播放链路；P2P 是否可用只影响加速状态，不决定是否使用该地址。

```c
const char* origin_url = "https://cdn.example.com/video/master.m3u8";

meshstream_session_t* session = NULL;
meshstream_playback_options_t options = {0};
options.struct_size = sizeof(options);
options.version = MESHSTREAM_PLAYBACK_OPTIONS_VERSION;
options.content_id = "asset-12345";

if (meshstream_client_create_playback_session(
        client, origin_url, &options, &session, NULL) != MESHSTREAM_OK) {
    meshstream_client_destroy(client);
    return;
}
const char* playback_url = meshstream_session_get_playback_url(session);

// 在 session 有效期间，将 playback_url 交给 VLC、libVLC、mpv 或自研播放器。
```

### 3. 播放结束时释放会话

```c
if (session != NULL) {
    meshstream_session_destroy(session);
}
```

### 4. 应用退出时释放 Client

```c
meshstream_client_destroy(client);
```

加速暂不可用不会阻断播放，播放器仍使用会话返回的 `playback_url`。只有客户端或会话创建因本地配置、资源或编程错误而失败时，业务才可自行选择记录错误并直接播放 `origin_url`；这属于业务降级，不经过 SDK，也不会计入 SDK 用量统计。

## 预加载下一条内容

对于可能马上播放的 HLS 或 DASH 内容，可先创建候选会话并调用 `meshstream_session_preload`。调用不等待网络，只预热清单和首个分片，也不创建或驱动播放器。用户切换时直接将同一会话的播放地址交给播放器；候选内容取消时销毁该会话。

## 配置项

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `key` | 必填 | 控制台签发的 SDK Key |
| `log_level` | `0` | 日志级别；生产环境建议保持默认值 |

Windows SDK 的服务发现地址、应用身份和策略由 SDK 自动处理，业务代码无需填写服务端地址或 Token。

Windows SDK 不接受客户端区域参数。租户 `homeRegion` 从 SDK Key 服务端解析，访问侧 Tracker/ICE
调度根据请求网络完成；业务代码无需选择数据中心。

## 动态地址与源站请求头

播放地址带短期签名参数时，为同一内容设置稳定的 `content_id`。如需附加源站鉴权请求头，通过 `origin_headers_json` 传入 JSON 对象：

```c
options.content_id = "asset-12345";
options.mime_type = "m3u8"; // DASH 使用 mpd；直链媒体使用 mp4 或 mp3
options.origin_headers_json = "{\"Authorization\":\"Bearer origin-token\"}";
```

这些请求头只用于访问客户媒体源，不会发送给其他观看设备。不要将 Token、Cookie 或完整签名 URL 写入应用日志。

## 播放会话 API

| 方法 | 说明 |
| --- | --- |
| `meshstream_client_create_playback_session` | 创建播放会话并返回 SDK 播放地址 |
| `meshstream_session_get_playback_url` | 获取交给播放器的播放地址 |
| `meshstream_session_preload` | 异步预热 HLS/DASH 清单与首个分片，不会播放媒体 |
| `meshstream_session_set_p2p_enabled` | 运行时开关 P2P，不影响 CDN 播放 |
| `meshstream_session_update_buffered_duration_ms` | 上报当前播放时间到缓冲前沿的时长，用于调整后台 P2P 预取 |
| `meshstream_session_update_current_position_ms` | 上报当前播放位置；点播用于匹配进度接近的节点，seek 后应立即调用 |
| `meshstream_session_get_stats` | 获取当前会话的流量和 Peer 数量快照 |
| `meshstream_session_destroy` | 结束播放会话并释放相关资源 |
| `meshstream_client_destroy` | 释放客户端及其资源 |

## 事件与统计

Windows SDK 通过 `meshstream_session_get_stats` 获取统计快照。主要字段包括：

- `p2p_downloaded`：本设备通过 P2P 获取的字节数；
- `p2p_uploaded`：本设备向其他设备分享的字节数；
- `http_downloaded`：从客户 CDN 获取的字节数；
- `connected_peers`：当前连接的其他设备数；
- `peer_connect_errors`：连接其他设备失败的累计次数。

可通过 `meshstream_session_get_status` 获取当前会话的加速状态；该状态仅用于展示与诊断，不能作为停止播放器的条件。

## HLS、DASH 与 MP4/MP3 直链播放

- SDK 支持 HLS、DASH，以及带 Range 的 MP4/MP3 直链播放请求，但不负责格式解码。
- MP4/MP3 需要源站支持单 Range，并返回有效的 `Content-Range`；不满足条件时保持正常播放但不启用加速。
- 播放器需要自行支持对应格式，并播放 SDK 返回的播放地址。
- 加速、网络或配置暂时不可用时，播放仍会继续，不应将加速状态作为停止播放的条件。

## 播放容错

以下情况只会关闭或降低加速能力，不会阻断媒体播放：

- SDK Key、应用或平台校验未通过；
- 当前没有可用的加速连接；
- 网络条件不满足加速要求；
- 单个媒体请求超时或失败；
- 平台服务暂时不可用。

## 错误码

| 宏 | 值 | 含义 |
| --- | ---: | --- |
| `MESHSTREAM_OK` | 0 | 成功 |
| `MESHSTREAM_INVALID_ARGUMENT` | 1 | 参数错误 |
| `MESHSTREAM_RUNTIME_ERROR` | 2 | 运行时错误 |
| `MESHSTREAM_CREATE_PLAYBACK_SESSION_FAILED` | 3 | 播放会话创建失败 |
| `MESHSTREAM_PRELOAD_SKIPPED` | 4 | 不支持预热或预热已在执行 |

## 下一步

[快速开始](../quickstart.md) · [最佳实践](../best-practices.md) · [故障排查](../troubleshooting.md)

相关文档：[安装与配置](./windows-setup.md) · [高级用法](./windows-advanced.md)。
