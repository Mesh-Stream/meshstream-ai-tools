---
title: Android SDK 安装与配置
sidebar_label: 安装与配置
description: "Android SDK 安装与配置指南：平台要求、依赖安装和应用设置。"
pagination_label: "Android SDK 安装与配置"
---

# Android SDK 安装与配置

MeshStream Android SDK 为 Android 播放器增加 P2P 加速能力。应用继续使用自己的播放器，SDK 负责播放会话和加速处理。

## 平台与最低版本

| 项目 | 当前发布支持 |
| --- | --- |
| Android 系统 | ARM32 / x86：Android 4.2（API 17）及以上；ARM64 / x86_64：Android 5.0（API 21）及以上 |
| CPU 架构 | `armeabi-v7a`、`arm64-v8a`、`x86`、`x86_64`（同一 universal AAR） |
| Java / Kotlin | Java 8 或 Kotlin 项目 |
| 示例播放器 | Media3 / ExoPlayer；由业务自行选择并管理 |

:::note 当前发布支持

`1.1.2` 在同一 Maven 包中提供四种 ABI，覆盖 ARM 真机及 ARM64、x86、x86_64 模拟器。历史 `1.0.8` 为 ARM32 / ARM64 包，`1.0.7` 为 ARM64 包，保持不变。

ARM32 / x86 构建目标为 API 17，ARM64 / x86_64 为 API 21；播放器可能有更高的系统要求，当前 Media3 Demo 需要 API 24。

:::

## 接入前准备

开始接入前，请准备：

- 控制台创建的 SDK Key；
- 一个支持目标媒体格式的播放器，例如 Media3/ExoPlayer；
- 一个可播放的 HLS `.m3u8`、DASH `.mpd`、支持 Range 的 MP4 或 MP3 地址；

播放器仍负责清单解析、ABR、解码和渲染。SDK 不会替换播放器，也不会改变播放器的清晰度策略。

## 工程配置

### Java / Kotlin 编译目标

SDK 使用 Java 8 字节码。宿主工程需支持 Java 8 或更高版本；例如 Java 8 工程可在应用模块的 `build.gradle.kts` 中设置：

```kotlin
android {
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
}
```

已使用 Java 11/17 或更高目标的项目保留原有设置，并使 Kotlin JVM 目标与 Java 编译目标一致。Flutter、React Native 和 Uniapp 工程还需满足对应框架的 JDK 要求。

### 网络权限

Maven 发布包已声明以下权限，Gradle 会将其合并到应用 Manifest，无需动态申请：

| 权限 | 用途 |
| --- | --- |
| `android.permission.INTERNET` | 访问媒体源、加速服务和 Peer |
| `android.permission.ACCESS_NETWORK_STATE` | 检测网络类型及连接变化 |

SDK 接入不要求额外申请外部存储读写或 `ACCESS_WIFI_STATE` 权限。播放器、下载或其他业务功能需要的权限由应用单独配置。发布前可在 Android Studio 的 **Merged Manifest** 中确认上述网络权限未被宿主规则移除。

## 添加依赖

MeshStream Android SDK 通过 Maven 发布。在项目的仓库配置中添加以下仓库，并在应用模块中声明依赖。以下示例使用 Kotlin DSL：

```kotlin
repositories {
    google()
    mavenCentral()
    maven {
        url = uri("https://sdk.meshstream.net/maven")
        content { includeGroup("io.meshstream") }
    }
}

dependencies {
    implementation("io.meshstream:meshstream-android-sdk:1.1.2")
}
```

Gradle 会自动解析并下载 SDK 及其原生依赖，无需手工下载或复制 AAR。`1.1.2` 同时提供
`armeabi-v7a`、`arm64-v8a`、`x86` 和 `x86_64`，真机与模拟器使用同一 Maven 依赖。

建议在生产项目中固定 SDK 版本，并将仓库地址集中配置在项目级构建文件中，便于统一维护。SDK 依赖坐标为
`io.meshstream:meshstream-android-sdk`，后续版本升级仅需调整版本号。

### 允许本地播放代理

`session.playbackUrl` 使用设备本地的 `http://127.0.0.1:<port>/` 代理。Android 9 及以上的默认明文网络限制可能拦截该地址；即使源视频是 HTTPS，也需要允许播放器访问本地代理。

Android 7.0（API 24）及以上可在应用模块的 `src/main/res/xml/network_security_config.xml` 中仅放行回环地址，使 Debug 和 Release 均生效：

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

在 `AndroidManifest.xml` 的 `<application>` 中引用 `android:networkSecurityConfig="@xml/network_security_config"`。已有网络策略的项目请合并本地地址规则，保留业务原有配置。需要兼容 Android 6.0（API 23）时，该系统不支持按域名放行，需根据应用网络策略设置 `android:usesCleartextTraffic="true"`；API 24 及以上以网络安全配置为准。公网 HTTP 媒体源需要另行配置，HTTPS 媒体源无需为源站放行明文流量。

## 混淆与内存

### R8 / ProGuard

正式 AAR 已包含 consumer ProGuard 规则，保护 SDK 公开 API 和 JNI 桥接。通过 Maven 集成并启用 R8 时，Gradle 会自动应用这些规则，无需复制其他 SDK 的保留规则。

应用和播放器自身的混淆配置仍按各自要求设置。发布前使用实际开启压缩与混淆的 Release 包验证初始化、播放、统计和关闭流程。

### 媒体缓存预算

接入 SDK 默认无需设置 `android:largeHeap="true"`。该选项主要影响 Java/ART 堆，不能代替 native 内存控制，也不保证避免内存不足。

通过 `P2pConfig.maxMemoryBytes` 设置每个客户端的媒体缓存预算，默认 `64 MiB`。内存敏感的应用可根据设备和业务需求调整，例如：

```kotlin
val client = P2pSdk.create(
    applicationContext,
    P2pConfig(
        key = "your_sdk_key",
        maxMemoryBytes = 16L * 1024 * 1024,
    ),
)
```

此预算仅约束 SDK 媒体缓存，不代表整个进程的内存上限；播放器、解码器、连接和临时请求仍有其他开销。多客户端的缓存预算需合并考虑，较小的预算也可能减少可供 P2P 复用的分片。切换播放内容或退出页面时及时关闭会话，并在不再使用时关闭客户端。

## 下一步

完成以上配置后，进入[快速接入](./android.md)，创建会话、连接播放器，并在播放结束后释放资源。
