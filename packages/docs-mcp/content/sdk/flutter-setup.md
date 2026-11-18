---
title: Flutter SDK 安装与配置
sidebar_label: 安装与配置
description: "Flutter SDK 安装与配置指南：平台要求、依赖安装和应用设置。"
pagination_label: "Flutter SDK 安装与配置"
---

# Flutter SDK 安装与配置

当前插件版本为 `meshstream_p2p 1.0.9`，发布于 [pub.dev](https://pub.dev/packages/meshstream_p2p/versions/1.0.9)。插件把原生 SDK 的播放地址和状态交给 Flutter 播放器，不提供播放器界面或解码器。

## 接入准备

- Flutter 3.22+、Dart 3.4+；
- 控制台创建的 Flutter 应用 SDK Key；
- 一个可播放的 HLS `.m3u8`、DASH `.mpd`、支持 Range 的 MP4 或 MP3 地址；
- 一个 Flutter 播放器，例如 `video_player`。

插件 Android 声明下限为 API 21，iOS 为 15.0。应用实际下限取插件、Flutter 引擎、播放器和其他依赖的最高要求；当前示例使用 Android API 24。插件固定使用公开 Android SDK `io.meshstream:meshstream-android-sdk:1.0.10` 和 iOS `MeshStreamKit 1.0.10`。

Android 原生依赖包含 `armeabi-v7a`、`arm64-v8a`、`x86`、`x86_64` 四种 ABI。真机与模拟器需同时满足框架和播放器的系统及架构要求。

Flutter 的 Android 模拟器调试请使用当前 Flutter 版本支持的 arm64 或 x86_64 系统镜像。

Android 权限与编译要求见[原生工程配置](./android-setup.md#工程配置)，R8 和缓存预算见[混淆与内存](./android-setup.md#混淆与内存)。保留 Flutter 工程要求的 Java/Kotlin 编译目标。

## 安装

```yaml
dependencies:
  meshstream_p2p: 1.0.9
  video_player: ^2.9.3
```

根据工程当前的仓库管理方式选择下面一种配置。以下示例使用 Kotlin DSL。

### Flutter 默认工程

在 `android/build.gradle.kts` 已有的 `allprojects.repositories` 中添加 MeshStream 仓库，保留原有仓库：

```kotlin
allprojects {
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

### 使用 settings 集中管理仓库的工程

在 `android/settings.gradle.kts` 的 `dependencyResolutionManagement` 中合并下面的配置。显式设置 `PREFER_SETTINGS`，让 settings 中的仓库生效；同时保留 Google、Maven Central、Flutter 引擎及业务所需的仓库：

```kotlin
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)
    repositories {
        google()
        mavenCentral()
        maven {
            val flutterStorageBaseUrl =
                System.getenv("FLUTTER_STORAGE_BASE_URL") ?: "https://storage.googleapis.com"
            url = uri("$flutterStorageBaseUrl/download.flutter.io")
            content { includeGroup("io.flutter") }
        }
        maven {
            url = uri("https://sdk.meshstream.net/maven")
            content { includeGroup("io.meshstream") }
        }
    }
}
```

执行 `flutter pub get`，iOS 工程再执行 `cd ios && pod install`。插件会从公开渠道解析对应的原生依赖。

## 平台网络配置

### Android

SDK 返回的播放地址使用本机 HTTP 回环代理，即使媒体源是 HTTPS，也需要允许播放器访问该代理。

在 `android/app/src/main/AndroidManifest.xml` 的 `<application>` 中添加：

```xml
android:networkSecurityConfig="@xml/meshstream_network_security_config"
```

创建 `android/app/src/main/res/xml/meshstream_network_security_config.xml`：

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

将配置放在 `src/main`，使 Debug 和 Release 均生效。已有网络安全策略时合并回环地址规则，保留原有配置。公网 HTTP 媒体源需另行添加对应域名规则，建议优先使用 HTTPS。需要兼容 Android 6.0（API 23）的应用，请同时参照 [Android 网络配置](./android-setup.md#允许本地播放代理) 设置该系统的明文访问策略。

### iOS

在 `ios/Runner/Info.plist` 的 `NSAppTransportSecurity` 字典中添加本地网络许可；已有该字典时合并配置：

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsLocalNetworking</key>
    <true/>
</dict>
```

保留其他 ATS 限制；媒体源需要额外例外时只添加必要规则。

## 下一步

完成以上配置后，进入[快速接入](./flutter.md)，创建会话、连接播放器，并在播放结束后释放资源。
