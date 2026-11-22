---
title: React Native SDK 安装与配置
sidebar_label: 安装与配置
description: "React Native SDK 安装与配置指南：平台要求、依赖安装和应用设置。"
pagination_label: "React Native SDK 安装与配置"
---

# React Native SDK 安装与配置

当前 npm 包版本为 `react-native-meshstream 1.1.2`，发布于 [npm](https://www.npmjs.com/package/react-native-meshstream/v/1.1.2)。它提供统一的 JavaScript client/session API，播放器仍由应用管理。

## 接入准备

- React Native 0.72+；
- 控制台创建的 React Native 应用 SDK Key；
- 一个可播放的 HLS `.m3u8`、DASH `.mpd`、支持 Range 的 MP4 或 MP3 地址；
- 一个播放器，例如 `react-native-video`。

插件 Android 声明下限为 API 21，iOS 为 15+。应用实际下限取插件、React Native、播放器和其他依赖的最高要求；当前示例使用 Android API 24、iOS 15.1。Android 桥接固定使用 `io.meshstream:meshstream-android-sdk:1.1.2`，iOS 桥接固定使用 `MeshStreamKit 1.1.2`。

Android 原生依赖包含 `armeabi-v7a`、`arm64-v8a`、`x86`、`x86_64` 四种 ABI。真机与模拟器需同时满足框架和播放器的系统及架构要求。

## 安装

Android 权限与编译要求见[原生工程配置](./android-setup.md#工程配置)，R8 和缓存预算见[混淆与内存](./android-setup.md#混淆与内存)。保留 React Native 工程要求的 Java/Kotlin 编译目标。

```bash
npm install --save-exact react-native-meshstream@1.1.2
npm install react-native-video
cd ios && pod install --repo-update
```

在 `android/settings.gradle`（或 `settings.gradle.kts`）中合并以下仓库配置。`PREFER_SETTINGS` 避免 React Native Gradle 插件添加的工程级仓库覆盖这里的设置：

```kotlin
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)
    repositories {
        google()
        mavenCentral()
        maven {
            url = uri("https://sdk.meshstream.net/maven")
            content { includeGroup("io.meshstream") }
        }
    }
}
```

应用其他依赖所需的仓库也应保留在同一个 settings 配置块中，包括替代 JavaScript 引擎要求的本地仓库。已有 `dependencyResolutionManagement` 时合并配置，不要重复声明。

原生依赖会从公开 Maven/CocoaPods 解析，请按上面的仓库配置安装并使用已发布版本。

## Android 本地代理网络配置

SDK 播放地址使用 HTTP 回环代理，即使媒体源为 HTTPS，也需放行该代理。在 `android/app/src/main/AndroidManifest.xml` 的 `<application>` 中添加 `android:networkSecurityConfig="@xml/meshstream_network_security_config"`，并创建 `android/app/src/main/res/xml/meshstream_network_security_config.xml`，使 Debug 和 Release 均生效：

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false" />
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="false">127.0.0.1</domain>
        <domain includeSubdomains="false">localhost</domain>
    </domain-config>
</network-security-config>
```

已有网络安全策略时合并回环地址规则，保留原有配置。公网 HTTP 媒体源需要另行配置域名规则；建议使用 HTTPS。需要兼容 Android 6.0（API 23）的应用，参见 [Android 本地代理配置](./android-setup.md#允许本地播放代理)。

## iOS 本地代理网络配置

在应用 Target 的 `ios/应用名/Info.plist` 中合并以下设置，允许播放器访问本机 HTTP 代理：

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsLocalNetworking</key>
    <true/>
</dict>
```

已有 ATS 字典时合并该键并保留其他限制。网络配置变更后重新构建原生应用；仅刷新 JavaScript 不会更新 Manifest 或 Info.plist。

## 下一步

完成以上配置后，进入[快速接入](./react-native.md)，创建会话、连接播放器，并在播放结束后释放资源。
