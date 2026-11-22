---
title: Uniapp SDK 安装与配置
sidebar_label: 安装与配置
description: "Uniapp SDK 安装与配置指南：平台要求、依赖安装和应用设置。"
pagination_label: "Uniapp SDK 安装与配置"
---

# Uniapp SDK 安装与配置

当前 DCloud 插件版本为 `meshstream-p2p 1.1.4`，可从 [DCloud 插件市场](https://ext.dcloud.net.cn/plugin?name=meshstream-p2p)安装。插件用于 uni-app Vue 3 App，不提供播放器界面或解码器。

## 接入准备

- HBuilderX 4.25+；
- 控制台创建的 uni-app 应用 SDK Key；
- 一个可播放的 HLS `.m3u8`、DASH `.mpd`、支持 Range 的 MP4 或 MP3 地址；
- 一个支持目标格式的 uni-app 播放器；
- Android 或 iOS 自定义基座/云打包环境。

插件 Android 声明下限为 API 21，iOS 为 15.0。应用实际下限取插件、HBuilderX 基座、播放器和其他依赖的最高要求；当前示例使用 Android API 24。插件固定使用公开 Android SDK `io.meshstream:meshstream-android-sdk:1.1.2` 和 iOS `MeshStreamKit 1.1.2`。

Android 原生依赖包含 `armeabi-v7a`、`arm64-v8a`、`x86`、`x86_64` 四种 ABI。真机与模拟器需同时满足框架、HBuilderX 基座和播放器的系统及架构要求。

## 安装

Android 权限与编译要求见[原生工程配置](./android-setup.md#工程配置)，R8 和缓存预算见[混淆与内存](./android-setup.md#混淆与内存)。保留 HBuilderX 基座要求的 Java/Kotlin 编译目标。

在 HBuilderX 中通过插件市场安装精确版本 `1.1.4`，或将已发布插件包解压到项目的 `uni_modules/meshstream-p2p/`，确保 `package.json` 直接位于该目录下。

标准基座不包含该插件所需的原生 SDK。请使用自定义基座或云打包，并确保 Android Maven、iOS CocoaPods 能解析公开原生依赖。

## 平台网络配置

SDK 返回的播放地址使用本机 HTTP 回环代理，即使原始媒体源为 HTTPS，播放器也需要访问该代理。

### Android

插件附带 Android Manifest 和回环地址网络策略。请保留插件的 `utssdk/app-android/AndroidManifest.xml` 与 `res/xml/` 资源；若宿主应用已有网络安全配置，应将回环规则合并到最终生效的策略中。

需要由应用统一管理网络策略时，可创建 `nativeResources/android/res/xml/meshstream_app_network_security_config.xml`：

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

在应用项目根目录创建或合并 `AndroidManifest.xml`，将 `com.example.app` 替换为云打包时使用的 Android 包名：

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    package="com.example.app">
    <application
        android:networkSecurityConfig="@xml/meshstream_app_network_security_config"
        tools:replace="android:networkSecurityConfig" />
</manifest>
```

已有策略时保留业务域名规则；公网 HTTP 媒体源需要单独配置，建议使用 HTTPS。上述按域名放行适用于 API 24 及以上；需要兼容 API 23 时参照 [Android 网络配置](./android-setup.md#允许本地播放代理)。配置文件的合并方式见 [DCloud Android 原生配置](https://uniapp.dcloud.net.cn/tutorial/app-nativeresource-android.html)。

### iOS

在应用项目根目录创建或合并 `Info.plist`，添加本地网络的 ATS 许可：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsLocalNetworking</key>
        <true/>
    </dict>
</dict>
</plist>
```

已有 ATS 字典时合并该键，保留其他限制。配置位置与合并方式见 [DCloud iOS 原生配置](https://uniapp.dcloud.net.cn/tutorial/app-nativeresource-ios.html)。

修改 Android/iOS 原生网络配置后，需要重新制作自定义基座或云打包，并重新安装；页面热更新不会更新这些配置。

## 下一步

完成以上配置后，进入[快速接入](./uniapp.md)，创建会话、连接播放器，并在播放结束后释放资源。
