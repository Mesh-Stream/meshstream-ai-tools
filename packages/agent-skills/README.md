# MeshStream Agent Skills

这是 MeshStream AI Coding Skill 的本地预览包。它把接入、排错和 P2P 验收规则安装到项目目录，不读取或上传客户代码，也不会写入凭据。

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
npx @meshstream/agent-skills add --ide all
```

本地预览：

```bash
node src/cli.mjs add --ide all --project /path/to/project
```

默认保留已有文件；只有显式传入 `--force` 才会替换已有的 MeshStream 指令文件。
