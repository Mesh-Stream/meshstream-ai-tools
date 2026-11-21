# MeshStream Agent Skills

这是 MeshStream AI Coding Skill 包。它把 Web、Android、iOS / macOS、Windows、Flutter、React Native 和 uni-app 的接入、排错和 P2P 验收规则安装到项目目录，不读取或上传客户代码，也不会写入凭据。

## 本地测试

```bash
npm test
```

## 安装

包公开发布后，客户可以在项目根目录执行：

```bash
npx @meshstream/agent-skills add --ide codex
npx @meshstream/agent-skills add --ide cursor
npx @meshstream/agent-skills add --ide claude
npx @meshstream/agent-skills add --ide codebuddy
npx @meshstream/agent-skills add --ide all
```

The installer writes these project-local files:

| Editor | File | How the editor uses it |
| --- | --- | --- |
| Codex | `.codex/skills/meshstream-sdk-integration/SKILL.md` | Loaded as a project skill for the current task |
| Cursor | `.cursor/rules/meshstream-sdk-integration.mdc` | Available as a project rule; enable it in Rules when needed |
| Claude Code | `.claude/skills/meshstream-sdk-integration/SKILL.md` | Available as the `/meshstream-sdk-integration` skill |
| CodeBuddy | `.codebuddy/skills/meshstream-sdk-integration/SKILL.md` | Loaded by the project skill workflow after reopening the session |

Run the command from the application project root, then start a new editor chat. Existing files are preserved; use `--force` only to replace an older installed rule.

本地预览：

```bash
node src/cli.mjs add --ide all --project /path/to/project
```

默认保留已有文件；只有显式传入 `--force` 才会替换已有的 MeshStream 指令文件。

安装后，规则会先识别项目平台和播放器，再读取对应官方文档；移动端验收要求真实设备或明确标记未执行，不能用 Web 示例或模拟器结果替代。
