---
title: 多区域接入
sidebar_label: 多区域接入
---

# 多区域接入

SDK 不使用客户端区域枚举。平台从 SDK Key 解析租户的 `homeRegion`，作为账号、数据和未来控制面
路由的归属；同时根据请求网络推导访问侧 `edgeRegion`、国家和运营商，用于 Tracker/ICE 就近调度。
访问侧调度不会改变租户数据归属，也不会要求业务代码传入区域。

当前单中心部署由一个控制面、数据库、Redis、Access、Config、Event Collector 和 Tracker 统一负责。
扩展第二个中心前，需要先部署完整区域栈、完成健康检查和全局路由，再开启区域强校验。错误区域请求
返回 `421 Misdirected Request`，无法解析租户归属返回 `503`；SDK 不负责自行切换数据中心，CDN
回源始终作为播放兜底。
