---
title: iOS / macOS SDK 安装与配置
sidebar_label: 安装与配置
description: "iOS / macOS SDK 安装与配置指南：平台要求、依赖安装和应用设置。"
pagination_label: "iOS / macOS SDK 安装与配置"
---

# iOS / macOS SDK 安装与配置

MeshStreamKit 为 iOS 和 macOS 应用提供 P2P 媒体分发加速能力。SDK 提供 Objective-C 接口，可与 AVPlayer 或兼容的第三方播放器集成。

当前发布版本为 `MeshStreamKit 1.0.10`，同一发行包包含 iOS 真机、iOS 模拟器及 macOS 双架构组件。

官方发布包、示例工程及更新说明见 [SDK 仓库](https://github.com/Mesh-Stream/meshstream-p2p-ios-sdk)。

## 环境要求

| 环境 | 最低系统版本 |
| --- | --- |
| iOS 真机 | iOS 15 |
| iOS 模拟器（Intel / Apple Silicon） | iOS 15 |
| macOS（Intel / Apple Silicon） | macOS 12 |

通过 Swift Package Manager 集成时，Xcode 需支持 Swift Tools 5.9。

## 接入准备

- 在[控制台](https://console.meshstream.net)创建应用，获取对应平台的 SDK Key。
- 确认应用的 Bundle ID 与控制台登记信息一致。
- 一个可播放的 HLS `.m3u8`、DASH `.mpd`、支持 Range 的 MP4 或 MP3 地址；

## 安装 SDK

支持 CocoaPods、Swift Package Manager 和手动集成。同一应用 Target 使用一种安装方式。

### CocoaPods

在 `Podfile` 中添加依赖：

```ruby
platform :ios, '15.0'

target 'YourApp' do
  pod 'MeshStreamKit', '1.0.10'
end
```

安装依赖：

```bash
pod install --repo-update
```

安装完成后，使用生成的 `.xcworkspace` 打开项目。macOS 项目将平台声明调整为 `platform :osx, '12.0'`。

### Swift Package Manager

在 Xcode 中选择 **File → Add Package Dependencies**，输入：

```text
https://github.com/Mesh-Stream/meshstream-p2p-ios-sdk.git
```

选择精确版本 `1.0.10`，并将 `MeshStreamKit` 添加至应用 Target。

### 手动集成

从 [SDK 仓库](https://github.com/Mesh-Stream/meshstream-p2p-ios-sdk)下载最新稳定版本的发布包。解压后，将 `MeshStreamKit.xcframework` 添加至应用 Target 的 **Frameworks, Libraries, and Embedded Content**，并选择 **Embed & Sign**。

使用对应[版本清单](https://github.com/Mesh-Stream/meshstream-p2p-ios-sdk/tree/main/releases)中的 SHA-256 校验下载包的完整性。

### 更新 SDK

CocoaPods 首次安装时解析满足项目依赖约束的版本，后续安装使用 `Podfile.lock` 锁定的版本。上面的示例将版本精确锁定为 `1.0.10`。升级时先将 `Podfile` 中的版本改为目标已发布版本，再执行：

```bash
pod update MeshStreamKit --repo-update
```

Swift Package Manager 项目需先在 Xcode 的 Package Dependencies 中将 Exact Version 规则改为目标已发布版本，再更新包依赖。版本约束不变时，更新命令不会将精确锁定的依赖升级到其他版本。手动集成项目替换完整的 XCFramework，并核对新版本的校验和。

建议将 `Podfile.lock` 或 `Package.resolved` 纳入版本管理，并在发布应用前完成升级验证。

## 应用配置

SDK 自动读取应用的 Bundle ID，无需额外配置服务地址。各平台需完成以下权限配置。

### iOS

SDK 返回的播放地址使用本机 HTTP 回环代理，即使媒体源为 HTTPS，也需允许播放器访问本地代理。在应用 Target 的 `Info.plist` 中合并以下设置：

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsLocalNetworking</key>
    <true/>
</dict>
```

已有 `NSAppTransportSecurity` 字典时合并该键，保留其余 ATS 限制。媒体源需要其他 ATS 例外时，仅添加必要配置。

### macOS

macOS 应用同样通过本机 HTTP 代理播放，需在应用的 `Info.plist` 中合并上面的 ATS 本地网络设置。

启用 App Sandbox 的应用需添加以下网络权限：

- `com.apple.security.network.client`
- `com.apple.security.network.server`

## 下一步

完成以上配置后，进入[快速接入](./ios.md)，创建会话、连接播放器，并在播放结束后释放资源。
