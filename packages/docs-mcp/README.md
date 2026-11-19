# MeshStream Docs MCP

只读 MCP，数据源是官网文档 Markdown。它提供文档查询、平台集成规划和公开计费指引：

- `search_docs`
- `get_sdk_release`
- `get_integration_guide`
- `get_troubleshooting_guide`
- `get_document`
- `get_integration_plan`
- `get_billing_guidance`
- `get_platform_matrix`

## 本地运行

```bash
npm install
npm test
npm start
```

本地开发默认从仓库的 `apps/developer-site/docs/` 读取。打包时会把官网文档快照复制到
包内的 `content/`，独立安装后无需访问源码仓库；也可以通过 `MESHSTREAM_DOCS_ROOT`
指向经过版本锁定的文档快照。

MCP 只读官网资料，不接收 SDK Key，不访问客户项目文件，也不执行代码或生产操作。
