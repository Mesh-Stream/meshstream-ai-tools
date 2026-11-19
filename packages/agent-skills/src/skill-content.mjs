export const skillBody = `---
name: meshstream-sdk-integration
description: Integrate, troubleshoot, and verify MeshStream SDKs across Web, native, and cross-platform playback projects.
---

# MeshStream SDK integration

Use the official MeshStream developer documentation as the source of truth:

- https://meshstream.net/docs/ai-coding
- https://meshstream.net/docs/sdk/overview
- https://meshstream.net/docs/sdk/web-setup
- https://meshstream.net/docs/sdk/web
- https://meshstream.net/docs/sdk/web-advanced
- https://meshstream.net/docs/sdk/android-setup
- https://meshstream.net/docs/sdk/android
- https://meshstream.net/docs/sdk/ios-setup
- https://meshstream.net/docs/sdk/ios
- https://meshstream.net/docs/sdk/windows-setup
- https://meshstream.net/docs/sdk/windows
- https://meshstream.net/docs/sdk/flutter-setup
- https://meshstream.net/docs/sdk/flutter
- https://meshstream.net/docs/sdk/react-native-setup
- https://meshstream.net/docs/sdk/react-native
- https://meshstream.net/docs/sdk/uniapp-setup
- https://meshstream.net/docs/sdk/uniapp
- https://meshstream.net/docs/concepts/statistics
- https://meshstream.net/docs/troubleshooting

If the meshstream-docs-mcp server is configured, prefer these read-only tools before writing code:
search_docs, get_sdk_release, get_integration_guide, and get_troubleshooting_guide.

## Required workflow

1. Identify the target platform (Web, Android, iOS/macOS, Windows, Flutter, React Native, or uni-app), framework, player, media protocol, package manager, and existing playback lifecycle.
2. Read the matching platform setup and integration guides, then use an exact SDK version listed in the official public release table. Do not invent APIs or versions.
3. Read SDK keys from environment variables or restricted runtime configuration. Never write keys, SecretKeys, signed URLs, Authorization headers, or Cookies into source, logs, or chat.
4. Reuse the existing player, origin, CDN, DRM, ABR, and authentication behavior. Native clients use the documented local playback proxy; do not move Web Service Worker code into native projects.
5. Keep CDN fallback when bootstrap, Tracker, WebRTC, ICE, or P2P segment transfer is unavailable.
6. Release the MeshStream session on source change, playback end, page hide/background, and player/controller destruction.
7. Run the existing build and test commands after making the smallest necessary change; use a real device for mobile acceptance when available.

## Supported task modes

Choose the smallest mode that matches the request:

- **from-zero integration:** inspect the project, select the platform SDK and existing player, then produce the smallest working change;
- **demo run:** find the repository's public example or demo, configure only local environment variables, run it, and report the actual result;
- **troubleshooting:** collect the concrete error, SDK status, bootstrap/Tracker/ICE evidence, and CDN fallback result before proposing a fix;
- **feature extension:** preserve the current integration and add one requested capability with focused tests and lifecycle cleanup;
- **documentation lookup:** use the read-only MeshStream docs MCP and include source URLs in the answer.

For Android, iOS, macOS, Windows, Flutter, React Native, and uni-app, use the matching official setup and advanced guides. Cross-platform wrappers must use published native dependencies, never local AARs, Pods, or internal source paths. Do not silently downgrade a real-device or cross-network check to a simulator or build-only result.

## P2P acceptance requirements

Peer count or a WebSocket connection alone is not proof of P2P delivery. Use two clients with the same content identity and record timestamped values for:

- connected Peer count;
- receiver P2P download bytes;
- sender P2P upload bytes;
- CDN download bytes;
- rebuffer count;
- first Peer and first P2P byte latency.

Report real transfer as passed only when receiver download bytes and sender upload bytes both increase for the same test. Test CDN fallback after P2P is stopped or blocked. Separate passed, failed, blocked, and unexecuted checks.

## Final response format

Report:

1. changed files and exact dependency versions;
2. build and test commands with results;
3. CDN playback result;
4. real P2P transfer evidence for both directions;
5. fallback and dispose/release evidence;
6. devices, networks, or production conditions that were not tested.
`;

export const cursorBody = `---
description: Platform-aware MeshStream SDK integration, troubleshooting, and P2P acceptance
alwaysApply: false
---

# MeshStream SDK integration

Use this rule when working on MeshStream playback integration. Follow the official docs at https://meshstream.net/docs/ai-coding and use an exact public SDK version.

Supported targets: Web, Android, iOS/macOS, Windows, Flutter, React Native, and uni-app.

## Workflow

1. Identify the target platform, framework, player, protocol, package manager, and playback lifecycle.
2. Read the matching MeshStream platform setup and integration docs before editing.
3. Keep existing player, CDN, origin authentication, DRM, and ABR behavior.
4. On native clients use the documented local playback proxy; on Web use the documented Service Worker/MSE path when supported.
5. Keep CDN fallback and release the session on source change, page hide/background, playback end, and player/controller destruction.
6. Run the existing build and tests, then prefer real-device acceptance for mobile platforms.

Never put SDK keys, SecretKeys, signed media URLs, Authorization headers, Cookies, or production logs in source or chat.

For P2P acceptance, require both receiver P2P download bytes and sender P2P upload bytes to increase. Peer count alone is not a transfer result. Report CDN fallback and dispose/release separately.
`;

export const claudeBody = skillBody;

