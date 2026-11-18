---
title: 高级配置
sidebar_label: 高级配置
unlisted: true
---

# 高级配置

大多数客户不需要直接调用平台 API。安装 SDK 后，SDK 会使用内置的 Bootstrap 地址完成配置拉取、会话鉴权、Tracker 发现和用量上报；业务代码只需要传入控制台生成的 `key` 和播放地址。

## 默认配置

SaaS 版本默认使用：

```text
https://api.meshstream.net/config-api/v1/sdk/bootstrap
```

不要在业务代码中自行拼接 Access、Tracker 或 Event Collector 地址，也不要自行维护会话 Token。SDK 会根据 Bootstrap 返回的策略选择服务，并在 Token 临近过期时自动续期。

## 私有部署

只有私有化部署或企业专属网关才需要覆盖 Bootstrap 地址。Web、Android 和 iOS SDK 都提供了对应的高级配置字段：

```text
bootstrapUrl / bootstrapURL
```

覆盖时填写完整的 `https://` 地址，例如：

```text
https://p2p-api.example.com/v1/sdk/bootstrap
```

私有地址必须能够返回与 SaaS Bootstrap 兼容的配置，并通过 HTTPS 对外提供。普通 SaaS 客户保持默认值即可。

## Bootstrap 请求字段

SDK 会自动发送以下信息，客户无需手动组装请求：

| 字段 | 说明 |
| --- | --- |
| `key` | 控制台签发的 SDK Key |
| `platform` | `web`、`android`、`ios` 或 `macos` |
| `contentId` | 可选，业务侧指定的稳定内容标识；不传时由 SDK 根据播放地址派生 |

SDK 不接受客户端传入的区域字段。服务端从 SDK Key 解析租户的 `homeRegion`，并从请求网络
推导访问侧的 `scheduling.region`、国家和运营商信息，用于 Tracker/ICE 就近调度。两者不是同一
个概念：`homeRegion` 决定租户的数据归属，访问侧调度不会改变数据驻留区域。

Bootstrap 成功响应会包含 `homeRegion`、`edgeRegion`、`primaryTrackerUrl`、`trackerUrls`、`iceServers` 和 `reportUrl`。
其中 `primaryTrackerUrl` 是服务端综合地域、健康状态、draining 和容量准入后选出的主 Tracker；
SDK 先连接主 Tracker，其余 `trackerUrls` 仅用于故障切换。
当请求到达错误的区域副本时，区域路由器应在请求进入 Config API 前完成转发；启用区域强校验的
副本会对错误归属返回 HTTP `421`，对无法解析 `homeRegion` 返回 HTTP `503`。SDK 不会根据响应
自行切换数据中心，播放仍应保留 CDN 兜底。

`iceServers` 由服务端按以下优先级选择：控制台为 SDK Key 或应用配置的自定义 ICE 列表优先；未配置时，
确认国家为中国大陆使用中国 ICE 池 `stun:stun.chat.bilibili.com:3478` 和
`stun:stun.miwifi.com:3478`；非中国或无法确认时使用海外池 `stun:stun.cloudflare.com:3478` 和
`stun:stun.l.google.com:19302`。SDK 客户端不应自行推断国家或覆盖 Bootstrap 返回的结果。

移动端还会自动采集包名、签名摘要等平台身份信息，用于控制台配置的应用校验。业务代码不需要设置 `tenantId`、`applicationId`、`packageName` 或内部节点地址。

## 播放与降级

Bootstrap 失败、Key 被停用或 P2P 暂时没有可用节点时，不应仅据此中断播放或替换当前播放地址。应用应继续使用各端 SDK 返回或管理的会话播放地址，媒体通过客户已有的交付路径保持可用。Bootstrap 只负责加速能力配置，不替代媒体源鉴权；媒体源的签名 URL、Cookie 和请求头仍由客户自己的源站策略负责。
