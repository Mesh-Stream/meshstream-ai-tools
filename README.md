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

## 安装预览

```bash
npx @meshstream/agent-skills add --ide codex
npx @meshstream/agent-skills add --ide cursor
npx @meshstream/agent-skills add --ide claude
```

MCP 的编辑器配置示例见 [packages/docs-mcp/README.md](packages/docs-mcp/README.md)。
