---
sidebar_position: 2
title: AI Coding
sidebar_label: AI Coding
description: 使用 Codex、Cursor 或 Claude Code，通过官方任务模板完成 MeshStream SDK 接入、排错和 P2P 验收。
---

# AI Coding

MeshStream 的 AI Coding 资料让 AI 编辑器基于官方 SDK 文档协助完成接入。当前页面提供可直接复制的任务模板；执行结果仍以本地构建、播放和真实 P2P 互传证据为准。

## 快速开始

在项目根目录打开 Codex、Cursor 或 Claude Code，先把下面的任务完整粘贴到对话框：

```text
请在当前项目中集成 MeshStream Web SDK。

执行顺序：
1. 识别项目框架、播放器、媒体协议和包管理器。
2. 阅读 MeshStream 官方 Web SDK 安装、快速接入、统计和故障排查文档。
3. 使用当前公开渠道可安装的精确 SDK 版本，不猜测不存在的 API、版本或配置项。
4. 复用现有播放器，不替换源站、CDN、DRM 或业务鉴权。
5. 保留 CDN 回退，并在播放结束、切源和页面销毁时释放 MeshStream 会话。
6. 修改代码后运行项目已有的构建和测试命令。
7. 报告修改文件、实际 SDK 版本、构建结果和仍未验证的事项。

如果项目中没有可播放的媒体地址或 SDK Key，先生成需要我补充的清单，不要写入凭据。
```

## Web 播放项目接入任务

对于 Vue、React 或原生 Web 项目，可以继续使用这段任务。它要求 AI 保持现有播放器控制权，并验证 P2P 失败时播放仍能继续：

```text
在当前 Web 播放页面接入 MeshStream：

- 播放器：请根据项目实际代码填写，例如 hls.js、Shaka 或 dash.js。
- 协议：请根据实际媒体地址填写 HLS 或 DASH。
- 使用稳定的 contentId；不要把带签名参数的完整 URL 当作长期内容标识。
- SDK Key 从环境变量读取，不要提交到 Git、日志或页面源码。
- 保留现有 ABR、DRM、源站请求头和播放器生命周期。
- 加速初始化失败、Tracker 不可用或 Peer 超时必须回退 CDN。
- 页面隐藏、切换媒体和销毁播放器时调用对应的 dispose/release。

完成后输出：
1. 修改文件和依赖版本；
2. 构建与测试命令及结果；
3. CDN 播放结果；
4. P2P 是否真正传输；
5. 未执行的真机、跨网络或生产验收项。
```

## P2P 验收任务

Peer 数量大于零只代表连接建立。需要两个使用同一内容标识的播放端，分别记录接收端下载和发送端上传字节：

```text
请对当前 MeshStream 播放接入执行双端 P2P 验收：

1. 启动发送端并缓存至少一个可共享分片。
2. 再启动接收端，使用相同的 contentId、清晰度和媒体内容。
3. 记录带时间戳的 Peer 数、P2P 下载字节、P2P 上传字节、CDN 下载字节和 rebuffer 次数。
4. 只有接收端 P2P 下载字节增长且发送端 P2P 上传字节同步增长，才能报告真实互传通过。
5. 停止或阻断 P2P，确认播放器继续通过 CDN 播放。
6. 销毁两个会话，确认 WebSocket、Peer、监听器和定时器释放。

请将通过、失败、阻塞和未执行分别列出，不要用“Peer > 0”代替互传结论。
```

## 故障排查任务

```text
请排查 MeshStream 播放正常但没有 P2P 的问题，按以下顺序检查：

1. SDK Key、应用状态、额度和 bootstrap 响应；
2. contentId、协议、清晰度和 swarm 是否一致；
3. Tracker WebSocket 握手、announce 和 Peer 发现时间；
4. WebRTC、ICE、浏览器权限和网络限制；
5. P2P 分片是否真的命中，以及超时后的 CDN 回退；
6. session dispose 后是否仍有连接或定时器。

输出每一步的证据、结论和下一步动作，不要通过关闭错误日志来掩盖问题。
```

## 版本与凭据规则

- 只使用[选择 SDK](./sdk/overview.md)和对应安装页中已经公开的版本。
- SDK Key 放在本地环境变量或受限的运行时配置中，不提交仓库。
- 签名播放地址、Authorization、Cookie、SecretKey 和生产日志不要粘贴到 AI 对话中。
- AI 生成的代码必须经过构建、播放、真实互传、CDN 回退和释放验证后才能上线。
- 当前页面提供任务模板；官方 MCP 和可安装 Skills 会在版本索引、公开包和验收流程稳定后单独发布。

## 下一步

- [选择 SDK](./sdk/overview.md)
- [Web SDK 安装与配置](./sdk/web-setup.md)
- [Web SDK 快速接入](./sdk/web.md)
- [统计与用量](./concepts/statistics.md)
- [故障排查](./troubleshooting.md)
