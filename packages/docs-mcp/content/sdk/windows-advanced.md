---
title: Windows SDK 高级用法
sidebar_label: 高级用法
pagination_label: "Windows SDK 高级用法"
---

# Windows SDK 高级用法

本页介绍多会话、直播/点播、鉴权和运行时控制。基础接入请参阅 [Windows SDK 快速接入](./windows.md)。

## 直播与点播接入策略

SDK 自动识别直播／点播，[基础接入方式相同](./windows.md)。播放期间可回传播放器状态，帮助 P2P 调度；不回传也可正常播放。

### 直播

<span id="直播回传缓冲余量" />

<span id="缓冲反馈" />

回传当前位置之后连续可播放的缓冲时长，帮助 SDK 调整 P2P 预取。例如播放到 60 秒、缓冲到 70 秒，应传 **10,000 毫秒**。直播起播位置与目标延迟由播放器设置。

```cpp
meshstream_session_update_buffered_duration_ms(session, buffered_duration_ms);
```

### 点播（VOD）

<span id="点播另外回传播放位置" />

<span id="播放进度与缓冲反馈" />

除缓冲时长外，回传当前播放位置，帮助 SDK 在已连接且拥有目标分片的 Peer 中优先选择进度接近的节点。Seek 完成后立即更新位置。

```cpp
meshstream_session_update_current_position_ms(session, position_ms);
meshstream_session_update_buffered_duration_ms(session, buffered_duration_ms);
```

数值均为非负毫秒，缓冲时长不能跨越断档。播放器状态有效后通常每秒回传一次；关闭会话前停止回传并等待在途调用结束。

<span id="播放器状态回传" />

<span id="接入示例" />

<span id="播放器状态回传示例" />

<details>
<summary>完整播放器状态回传示例</summary>

由宿主播放器提供有效的有符号毫秒值，函数校验后再转换为 C API 所需的 `uint64_t`。

```cpp
void sync_playback_state(
    meshstream_session_t* session,
    bool is_live,
    int64_t current_position_ms,
    int64_t buffered_duration_ms) {
    if (!session) return;
    if (buffered_duration_ms >= 0) {
        meshstream_session_update_buffered_duration_ms(
            session, static_cast<uint64_t>(buffered_duration_ms));
    }
    if (!is_live && current_position_ms >= 0) {
        meshstream_session_update_current_position_ms(
            session, static_cast<uint64_t>(current_position_ms));
    }
}
```

</details>

## MP4 / MP3 直链播放

MP4 和 MP3 属于点播直链：播放器直接加载文件地址，而不是 HLS `.m3u8` 或 DASH `.mpd` 清单。为同一视频或音频设置稳定的 `content_id`；地址不带扩展名时，显式填写 `mime_type`。

```cpp
meshstream_playback_options_t options{};
options.struct_size = sizeof(options);
options.version = MESHSTREAM_PLAYBACK_OPTIONS_VERSION;
options.content_id = "trailer-2026";
options.mime_type = "mp4";

meshstream_session_t* session = nullptr;
int32_t rc = meshstream_client_create_playback_session(
    client,
    "https://cdn.example.com/video/trailer.mp4",
    &options,
    &session,
    nullptr);
if (rc == MESHSTREAM_OK) {
    const char* playback_url = meshstream_session_get_playback_url(session);
    // 将 playback_url 交给支持 MP4 的播放器。
}
```

MP3 只需将地址和 `mime_type` 分别替换为 `.mp3` 和 `"mp3"`，并交给支持音频播放的宿主播放器。媒体源需要支持单 Range 请求并返回有效的 `Content-Range`。不满足该条件时，文件仍按原有方式播放，但不会启用加速。

## 为每路播放单独配置

一个 `meshstream_client_t` 可以管理多个独立 `meshstream_session_t`。每个播放器实例都应创建自己的会话；切换节目时销毁旧会话，再为新内容创建会话。

### 动态地址与源站鉴权

通过 `origin_headers_json` 传递仅发往源站的 JSON 请求头：

```cpp
meshstream_playback_options_t options{};
options.struct_size = sizeof(options);
options.version = MESHSTREAM_PLAYBACK_OPTIONS_VERSION;
options.content_id = "movie-2026-001";
options.mime_type = "m3u8"; // 无扩展名地址时显式指定；DASH 使用 mpd，直链媒体使用 mp4 或 mp3
options.origin_headers_json = "{\"Authorization\":\"Bearer origin-token\"}";

meshstream_session_t* session = nullptr;
if (meshstream_client_create_playback_session(
        client, signed_url, &options, &session, nullptr) == MESHSTREAM_OK) {
    const char* playback_url = meshstream_session_get_playback_url(session);
    // 将 playback_url 交给播放器。
}
```

该字段不得记录日志，也不会发送给其他观看设备。

## 预加载与内容切换

显式 `preload` 是可选的 HLS/DASH 预热：后台获取清单与首个媒体分片，不会下载整部视频。它也可提前启动 Tracker/Peer 连接，但排队成功不保证 Peer 已连接或媒体已就绪。尚未播放的候选会话不会向 Peer 上传媒体。MP4/MP3 直链不使用这条显式预加载流程。

保存候选会话，选中时复用其播放地址。关闭任一会话前，先停止状态回传、等待在途调用结束并取消其事件订阅，避免回调访问已关闭的会话。预加载不负责解码器准备，也不会渲染首帧。

宿主持有 `current_session`、`next_session`，类型均为 `meshstream_session_t*`，初始为 `nullptr`。每个播放器独立管理自己的会话；`next_url` 是候选地址，`next_content_id` 是稳定内容 ID。

### 准备候选内容

```cpp
meshstream_playback_options_t options{};
options.struct_size = sizeof(options);
options.version = MESHSTREAM_PLAYBACK_OPTIONS_VERSION;
options.content_id = next_content_id;
options.mime_type = "m3u8";

meshstream_session_t* candidate = nullptr;
int32_t rc = meshstream_client_create_playback_session(
    client, next_url, &options, &candidate, nullptr);
if (rc == MESHSTREAM_OK) {
    if (next_session) meshstream_session_destroy(next_session);
    next_session = candidate;
    int32_t preload_rc = meshstream_session_preload(next_session);
    // MESHSTREAM_OK: queued; MESHSTREAM_PRELOAD_SKIPPED: not queued.
    (void)preload_rc;
}
```

`MESHSTREAM_OK` 表示已排队；`MESHSTREAM_PRELOAD_SKIPPED` 表示本次未排队，例如直链媒体或预热已经运行，不属于播放失败。其他返回码按错误处理；创建候选失败时不要替换当前会话。

### 切换至候选内容

执行下面代码前，先停止并等待旧会话回调结束，停止宿主播放器并解除旧媒体引用。启用候选会话后，由所用播放器的接口加载其地址；播放期间保持当前会话存活：

```cpp
if (next_session) {
    if (current_session) meshstream_session_destroy(current_session);
    current_session = next_session;
    next_session = nullptr;
    const char* playback_url = meshstream_session_get_playback_url(current_session);
    // Load playback_url in the host player, then start playback.
    (void)playback_url;
}
```

### 取消候选内容

仅关闭已丢弃的候选会话，当前播放不受影响：

```cpp
if (next_session) {
    meshstream_session_destroy(next_session);
    next_session = nullptr;
}
```

## 运行时控制

```cpp
meshstream_session_set_p2p_enabled(session, 0); // 临时关闭 P2P
meshstream_session_set_p2p_enabled(session, 1);

meshstream_stats_t stats{};
meshstream_session_get_stats(session, &stats);
```

`meshstream_session_set_p2p_enabled` 只影响当前会话的加速状态，不影响播放器继续使用 `playback_url` 播放。

## 事件与监控

Windows SDK 通过拉取快照进行监控：

```cpp
meshstream_stats_t stats{};
meshstream_session_get_stats(session, &stats);

meshstream_status_t status{};
meshstream_session_get_status(session, &status);
```

重点观察 P2P 下载、分享和媒体源下载流量，以及连接和分片成功/失败计数。状态和统计仅用于展示、告警和诊断，不应决定播放器是否继续播放。

<span id="接入验证" />

<details>
<summary>验证 P2P 效果</summary>

1. 先用单设备确认正常播放、点播拖动，以及关闭 P2P 后仍能播放。
2. 用两个设备播放同一内容，保持 `content_id` 一致；点播选择有重叠的播放进度，直播选择同一频道。媒体字节和时间轴应保持一致，不同资产或个性化清单不要复用同一个 ID。
3. 检查回传单位为毫秒，并在媒体清单加载后持续更新。当前位置 60 秒、连续缓冲到 70 秒时，缓冲值应为 10,000 毫秒；点播 Seek 完成后立即更新位置。
4. 在一段播放时间内观察 P2P 下载字节数与下载分担率的变化。仅有 Peer 连接不代表实际通过 P2P 下载了媒体；分片可用性、网络环境和平台策略都会影响结果。
5. 关闭 P2P，确认播放器继续通过 CDN 播放。随后停止状态回传并取消事件订阅，再关闭会话，确认切换内容后没有继续调用已关闭的会话。

</details>

## 网络与平台策略

SDK 自动处理应用身份和服务连接，业务代码不需要填写服务地址、区域或访问 Token。`meshstream_session_set_p2p_enabled` 是本地会话开关，控制台策略优先级更高。

## 生命周期与兜底

- 每个播放器实例对应一个 `meshstream_session_t`。
- 切换频道或节目时先调用 `meshstream_session_destroy`，再创建新会话。
- 应用退出时先销毁全部会话，再调用 `meshstream_client_destroy`。
- 加速、鉴权或网络异常时，继续使用 SDK 返回的播放地址。
- `MESHSTREAM_CREATE_PLAYBACK_SESSION_FAILED` 表示会话创建失败，业务应保留原始播放地址作为兜底。

停止播放时先销毁会话，再销毁客户端。加速暂不可用时仍保持正常播放；记录流量统计和诊断信息，便于生产排障。

## 能力边界

SDK 负责播放会话和加速处理；VLC、libVLC、mpv 或自研播放器负责清单解析、ABR、解码、渲染和播放器缓存。SDK 不替换播放器，也不承诺应用退出或进入后台后持续分享媒体数据。
