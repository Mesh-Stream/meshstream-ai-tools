---
sidebar_position: 2
title: AI Coding
sidebar_label: AI Coding
description: 使用 Codex、Cursor 或 Claude Code，通过官方任务模板完成 MeshStream SDK 接入、排错和 P2P 验收。
---

# AI Coding

MeshStream 的 AI Coding 资料让 AI 编辑器基于官方 SDK 文档协助完成接入。Web、Android、iOS / macOS、Windows、Flutter、React Native 和 uni-app 均可使用同一套 MCP 与 Skills 工作流；执行结果仍以本地构建、播放和真实 P2P 互传证据为准。

## 现在能做什么

AI Coding 分成两个层次：MCP 负责查事实和生成结构化集成方案，Skills 负责把方案落到项目工作流。它们都只读取公开文档，不读取客户代码、不接收 SDK Key，也不会替用户发布生产变更。

| 能力 | MCP | Skills |
| --- | --- | --- |
| 文档、版本和错误码查询 | 支持，返回来源链接 | 支持，要求 AI 先查官方文档 |
| 按平台、框架、播放器生成接入计划 | `get_integration_plan` | 支持从项目代码识别上下文 |
| 跑官方 Demo / 从零接入 | 返回步骤和验收清单 | 支持 Codex、Cursor、Claude Code、CodeBuddy |
| 功能扩展和故障排查 | 返回公开规则 | 保留现有播放器并执行最小改动 |
| 套餐、配额和用量规则 | `get_billing_guidance` | 引导到公开价格页和控制台 |
| 平台能力与验收边界 | `get_platform_matrix` | 按平台选择安装、示例和验证范围 |

### 配置 MCP

在支持 MCP 的编辑器中，把下面这一项加入已有的 `mcpServers`，不要覆盖其他服务：

```json
{
  "meshstream-docs": {
    "command": "npx",
    "args": ["--yes", "@meshstream/docs-mcp@0.5.0"]
  }
}
```

配置后可以直接提问：

```text
调用 get_integration_plan，mode=from-zero，为 Vue 3 + hls.js + HLS 点播项目生成 MeshStream 最小接入方案，保留 CDN 回退，并列出真实 P2P 双端验收证据。
```

## 平台支持

MCP 会根据 `platform`、`framework`、播放器和协议返回对应的安装、接入、高级用法和验收来源。Skills 会先识别当前项目，再选择对应平台的公开 SDK；不会把原生项目降级成 Web 示例。

| 平台 | 适用项目 | 官方接入文档 |
| --- | --- | --- |
| Web | Vue、React、原生 Web；hls.js、Shaka、dash.js | [Web 安装](./sdk/web-setup.md) · [快速接入](./sdk/web.md) |
| Android | Kotlin / Java 原生应用 | [Android 安装](./sdk/android-setup.md) · [快速接入](./sdk/android.md) |
| iOS / macOS | Swift / Objective-C、AVPlayer | [Apple 安装](./sdk/ios-setup.md) · [快速接入](./sdk/ios.md) |
| Windows | C++ / Windows 原生播放器 | [Windows 安装](./sdk/windows-setup.md) · [快速接入](./sdk/windows.md) |
| Flutter | Flutter/Dart，调用 iOS 和 Android 原生 SDK | [Flutter 安装](./sdk/flutter-setup.md) · [快速接入](./sdk/flutter.md) |
| React Native | React Native，调用 iOS 和 Android 原生 SDK | [React Native 安装](./sdk/react-native-setup.md) · [快速接入](./sdk/react-native.md) |
| uni-app | Vue 3 + UTS，自定义基座或云打包 | [uni-app 安装](./sdk/uniapp-setup.md) · [快速接入](./sdk/uniapp.md) |

可以直接让 MCP 生成其他端方案，例如：

```text
调用 get_integration_plan，platform=android，framework=Kotlin，player=Media3，protocol=HLS，mode=from-zero。
输出依赖、播放器连接、Android 回环代理配置、CDN 回退，以及两台真实 Android 设备的 P2P 上传/下载字节验收。
```

## 快速开始

在项目根目录打开 Codex、Cursor 或 Claude Code，先把下面的任务完整粘贴到对话框：

```text
请在当前项目中集成 MeshStream SDK。

执行顺序：
1. 识别目标平台、项目框架、播放器、媒体协议、包管理器和现有播放生命周期。
2. 阅读该平台对应的 MeshStream 官方安装、快速接入、统计和故障排查文档。
3. 使用当前公开渠道可安装的精确 SDK 版本，不猜测不存在的 API、版本或配置项。
4. 复用现有播放器，不替换源站、CDN、DRM 或业务鉴权；原生端使用对应平台的本地播放代理配置。
5. 保留 CDN 回退，并在播放结束、切源、页面隐藏或原生控制器销毁时释放 MeshStream 会话。
6. 修改代码后运行项目已有的构建和测试命令；移动端优先连接真实设备验证。
7. 报告目标平台、修改文件、实际 SDK 版本、构建结果、播放结果和仍未验证的设备/网络条件。

如果项目中没有可播放的媒体地址或 SDK Key，先生成需要我补充的清单，不要写入凭据。
```

## 原生与跨端项目接入任务

Android、iOS / macOS、Windows、Flutter、React Native 和 uni-app 使用相同的任务模式，但必须读取对应平台文档并保留平台播放器生命周期：

```text
在当前项目中接入 MeshStream：

- 先识别平台、框架、播放器、媒体协议和现有播放控制器。
- 使用对应平台官方安装页和快速接入页中的精确公开版本。
- 原生/跨端项目保留现有播放器、DRM、ABR、源站鉴权和 CDN 回退；不要把 Web API 或 Service Worker 代码移植到原生端。
- Android、iOS / macOS 使用 SDK 返回的本地播放代理地址，并完成对应网络安全配置。
- Flutter、React Native、uni-app 只调用已发布的原生依赖，不引用本地 AAR、Pod 或内部源码路径。
- Windows 按官方 C++ 头文件、库和播放器示例接入，检查 x64 架构和关闭释放。
- 在切源、后台、播放结束和控制器销毁时释放会话与连接。
- 先运行构建和单元测试，再用真实设备或目标架构验证播放、P2P 上传/下载字节和 CDN 回退。

输出平台、依赖版本、修改文件、构建结果、设备/系统、P2P 双端字节证据、回退结果和未执行项。
```

## 已发布工具

官方工具的当前版本为 `0.5.0`，包含结构化集成规划、公开计费指引和 CodeBuddy 支持：

- [`@meshstream/agent-skills`](https://www.npmjs.com/package/@meshstream/agent-skills)：将接入、排错和 P2P 验收规则安装到 Codex、Cursor 或 Claude Code 项目。
- [`@meshstream/docs-mcp`](https://www.npmjs.com/package/@meshstream/docs-mcp)：只读官方文档 MCP，不读取客户项目文件，也不执行生产操作。

在项目根目录安装编辑器规则：

```bash
npx --yes @meshstream/agent-skills@0.5.0 add --ide codex
npx --yes @meshstream/agent-skills@0.5.0 add --ide codebuddy
```

### 四种编辑器怎么使用

命令必须在你的业务项目根目录执行；它只写入项目级规则，不会上传代码或读取凭据。安装后重新打开项目或新建一个对话，让编辑器加载规则：

| 编辑器 | 安装命令 | 生成文件 | 使用方式 |
| --- | --- | --- | --- |
| Codex | `npx --yes @meshstream/agent-skills@0.5.0 add --ide codex` | `.codex/skills/meshstream-sdk-integration/SKILL.md` | 在项目中直接描述接入、排错或验收任务 |
| Cursor | `npx --yes @meshstream/agent-skills@0.5.0 add --ide cursor` | `.cursor/rules/meshstream-sdk-integration.mdc` | 新建 Chat，按项目规则执行；需要时在 Rules 中启用该规则 |
| Claude Code | `npx --yes @meshstream/agent-skills@0.5.0 add --ide claude` | `.claude/skills/meshstream-sdk-integration/SKILL.md` | 新建会话后直接提问，或使用 `/meshstream-sdk-integration` 调用技能 |
| CodeBuddy | `npx --yes @meshstream/agent-skills@0.5.0 add --ide codebuddy` | `.codebuddy/skills/meshstream-sdk-integration/SKILL.md` | 重启项目会话后直接提问，技能会按平台选择文档 |

一次安装全部编辑器规则：

```bash
npx --yes @meshstream/agent-skills@0.5.0 add --ide all --project .
```

已有规则不会被覆盖；确认要更新时显式加 `--force`。安装完成后可以这样开始：

```text
读取 MeshStream SDK integration skill。先识别当前项目是 Android + Kotlin + Media3，
再调用 get_integration_plan 生成 from-zero 方案。不要套用 Web API；完成构建后列出真实设备的
P2P 上传/下载字节、CDN 回退和释放证据。
```

在支持 MCP 的编辑器配置中加入：

```json
{
  "mcpServers": {
    "meshstream-docs": {
      "command": "npx",
      "args": ["--yes", "@meshstream/docs-mcp@0.5.0"]
    }
  }
}
```

## Web 播放项目接入任务

除了从零接入，还可以要求 AI 执行 `demo`、`troubleshooting`、`feature-extension` 或 `docs` 模式。每种模式都必须输出实际运行证据，不能只生成代码就宣称完成。

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
- 工具源码和发行记录见 [MeshStream AI Tools](https://github.com/Mesh-Stream/meshstream-ai-tools)。

## 下一步

- [选择 SDK](./sdk/overview.md)
- [Web SDK 安装与配置](./sdk/web-setup.md) · [Android](./sdk/android-setup.md) · [iOS / macOS](./sdk/ios-setup.md)
- [Windows](./sdk/windows-setup.md) · [Flutter](./sdk/flutter-setup.md) · [React Native](./sdk/react-native-setup.md) · [uni-app](./sdk/uniapp-setup.md)
- [统计与用量](./concepts/statistics.md)
- [故障排查](./troubleshooting.md)
