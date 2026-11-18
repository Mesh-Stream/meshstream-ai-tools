# MeshStream AI Tools

公开的 MeshStream AI Coding 工具仓库，包含两个独立 npm 包：

- `@meshstream/docs-mcp`：只读官方文档 MCP，提供文档搜索、公开版本、接入指南和故障排查；
- `@meshstream/agent-skills`：把 MeshStream 接入、排错和 P2P 验收规则安装到 Codex、Cursor 或 Claude Code 项目。

两个包都不会读取或上传客户项目文件，不接收 SDK Key，也不执行生产操作。

## 开发

```bash
npm install
npm test
```

官网文档是 MeshStream 的资料源。更新文档快照时，从 P2PCDN 根目录执行：

```bash
npm run sync-docs -- --source /path/to/P2PCDN/apps/developer-site/docs
```

提交前核对文档快照、测试结果和两个包的版本。发布前使用 `npm pack --workspace` 检查实际附件内容。

## 发布

当前两个包按同一版本一起发布。发布前先运行 `npm test`、两个 `npm pack --dry-run`，再更新
`packages/*/package.json` 的版本并提交。仓库的 `Publish npm packages` workflow 只在 GitHub
Release 正式发布事件中运行；在仓库设置中配置只允许发布这两个包的 npm automation token：
`NPM_TOKEN`。该 Secret 必须是拥有 `@meshstream` scope 发布权限的 npm automation token；
GitHub 或其他服务的 token 不能替代它。创建与包版本一致的 tag 和 Release 后，
workflow 会使用 provenance 发布 `@meshstream/docs-mcp` 与 `@meshstream/agent-skills`，不会
发布根目录私有 workspace。

## 安装预览

```bash
npx @meshstream/agent-skills add --ide codex
npx @meshstream/agent-skills add --ide cursor
npx @meshstream/agent-skills add --ide claude
```

MCP 的编辑器配置示例见 [packages/docs-mcp/README.md](packages/docs-mcp/README.md)。
