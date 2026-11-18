---
title: 选择 SDK
sidebar_label: 选择 SDK
---

# 选择 SDK

根据应用使用的技术栈选择 SDK。各端文档按同一顺序组织：**安装与配置 → 快速接入 → 高级用法**。

| 应用 / 技术栈 | 安装与配置 | 快速接入 | 高级用法 |
| --- | --- | --- | --- |
| Web | [安装配置](./web-setup.md) | [接入代码](./web.md) | [进阶功能](./web-advanced.md) |
| Android | [安装配置](./android-setup.md) | [接入代码](./android.md) | [进阶功能](./android-advanced.md) |
| iOS / macOS | [安装配置](./ios-setup.md) | [接入代码](./ios.md) | [进阶功能](./ios-advanced.md) |
| Windows | [安装配置](./windows-setup.md) | [接入代码](./windows.md) | [进阶功能](./windows-advanced.md) |
| Flutter | [安装配置](./flutter-setup.md) | [接入代码](./flutter.md) | [进阶功能](./flutter-advanced.md) |
| React Native | [安装配置](./react-native-setup.md) | [接入代码](./react-native.md) | [进阶功能](./react-native-advanced.md) |
| Uniapp | [安装配置](./uniapp-setup.md) | [接入代码](./uniapp.md) | [进阶功能](./uniapp-advanced.md) |

## 阅读顺序

1. **安装与配置**：确认系统要求，安装依赖，配置权限与网络。
2. **快速接入**：创建会话，将播放地址交给播放器，验证播放并释放资源。
3. **高级用法**：按需接入源站鉴权、预加载、多会话、运行时控制和诊断。

首次接入可从[快速开始](../quickstart.md)了解完整流程。播放或 P2P 异常时，进入[故障排查](../troubleshooting.md)。

## 原生与跨平台 SDK 版本对照

| SDK | 当前版本 | Android 原生依赖 | Apple 原生依赖 |
| --- | --- | --- | --- |
| [Android](./android.md) | 1.0.9 | — | — |
| [iOS / macOS](./ios.md) | 1.0.8 | — | — |
| [Flutter](./flutter.md) | 1.0.8 | 1.0.9 | 1.0.8 |
| [React Native](./react-native.md) | 1.0.5 | 1.0.9 | 1.0.8 |
| [Uniapp](./uniapp.md) | 1.0.6 | 1.0.9 | 1.0.8 |

跨平台插件与原生 SDK 的版本号独立管理。建议固定依赖版本，并将包管理器锁文件纳入版本管理。

Android/iOS 播放地址使用本机 HTTP 代理；即使原始媒体地址为 HTTPS，也需按对应集成指南完成应用网络配置，并确保 Release 包同样生效。
