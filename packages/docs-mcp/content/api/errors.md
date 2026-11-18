---
title: SDK 错误与降级
sidebar_position: 2
unlisted: true
---

# SDK 错误与降级

MeshStream 将 P2P 作为加速层，而不是播放可用性的前提。对于已创建的播放会话，Bootstrap、Tracker、上报或节点发现暂时不可用，不代表媒体播放失败；播放器应保留各端 SDK 返回或管理的当前播放地址，不要仅因加速状态变化而替换地址或中断播放。媒体仍通过客户已有的交付路径保持可用。

## 常见错误

| 错误 | 含义 | 处理建议 |
| --- | --- | --- |
| `TRACKER_UNAVAILABLE` | 当前没有可用 Tracker 节点，或 WSS 连接失败 | 保持当前播放会话；检查 Key、网络权限、服务端路由和 Tracker 状态 |
| Bootstrap 失败 | 配置服务不可达或 Key 无效 | 保持正常播放；检查网络与控制台中 Key 状态 |
| HTTP `421` | 请求到达了不属于该租户 `homeRegion` 的区域副本 | 由全局路由器重试到正确中心；SDK 不自行切换中心 |
| HTTP `503 HOME_REGION_UNRESOLVED` | 服务端无法解析 SDK Key 的租户归属，或归属配置暂不可用 | 修复 SDK Key 的租户归属或服务端路由配置后重试；不要把客户端区域字段作为补救参数 |
| Admission 拒绝 | 平台身份不匹配或 Key 被禁用 | 检查控制台中 Key 的平台绑定与允许列表 |
| 统计上报失败 | SDK 的后台统计链路暂时不可达 | 无需处理；SDK 会异步重试或丢弃，不影响播放 |

更多错误细节请以对应 SDK 的运行时日志为准。

## 一次播放的处理阶段

```text
initialize({ key })
  → 配置拉取与鉴权       SDK 自动完成
  → Peer 发现与信令      SDK 自动完成
  → 媒体交付             P2P 优先，客户现有交付路径保障可用性
  → 用量统计             SDK 后台异步完成
```

这些阶段不需要业务代码逐步调用，也不建议客户直接对接内部 Access、Tracker 或 Event Collector 服务。客户端不传入 `areaCode`、`area_code` 或 `region`；租户 `homeRegion` 和访问侧 `edgeRegion` 均由服务端决定。加速阶段出现故障时，已创建会话仍应保持正常播放。判断接入是否正确的标准是：**故意禁用 P2P 时，播放器依然能播完整个视频**。
