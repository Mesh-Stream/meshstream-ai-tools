---
title: Windows SDK 安装与配置
sidebar_label: 安装与配置
description: "Windows SDK 安装与配置指南：平台要求、依赖安装和应用设置。"
pagination_label: "Windows SDK 安装与配置"
---

# Windows SDK 安装与配置

MeshStream Windows SDK 通过 C ABI 为桌面播放器提供 P2P 加速能力。应用继续使用自己的播放器，SDK 负责播放会话和加速处理。

## 平台与运行环境

| 项目 | 当前发布支持 |
| --- | --- |
| Windows 系统 | Windows 10 / 11 x64 |
| CPU 架构 | x64 |
| 接入语言 | C / C++（通过 `meshstream.h`） |
| 运行库 | Microsoft Visual C++ 2015-2022 Redistributable（x64） |

当前 Windows 发布包仅提供 x64 DLL 和导入库。Windows ARM64、x86 以及其他系统版本尚未作为发布支持范围；不要将 x64 DLL 随应用发布到这些环境。

## 接入前准备

开始接入前，请准备：

- MeshStream Windows SDK 动态库和公开头文件 `meshstream.h`；
- 控制台创建的 SDK Key；
- 一个支持目标媒体格式的播放器，例如 VLC、ffplay 或自研播放器；
- 一个可播放的 HLS `.m3u8`、DASH `.mpd`、支持 Range 的 MP4 或 MP3 地址；

## 添加 SDK

Windows SDK 发布包包含以下文件：

```text
include/meshstream.h
lib/p2pcdn_core.dll
lib/p2pcdn_core.dll.lib
```

在工程中完成以下操作：

1. 将 `include` 加入 C/C++ 头文件搜索路径，并包含 `meshstream.h`；
2. 将 `lib/p2pcdn_core.dll.lib` 加入链接输入；
3. 将 `lib/p2pcdn_core.dll` 放在应用可执行文件同级目录，或放入系统 `PATH`；
4. 在未安装运行库的机器上安装 Microsoft Visual C++ 2015-2022 Redistributable（x64）。

业务代码只应依赖 `meshstream.h` 公共接口，不要依赖 DLL 的内部文件名或本地代理地址格式。

## 下一步

完成以上配置后，进入[快速接入](./windows.md)，创建会话、连接播放器，并在播放结束后释放资源。
