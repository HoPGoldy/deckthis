# 提案：webppt — 基于 iframe 的 Web PPT 框架

## 背景

团队需要在浏览器中展示技术分享、产品汇报等内容，现有方案（Keynote/PowerPoint）不适合 Web 工程师的工作流。目标是提供一套「写 HTML 即 PPT」的轻量工具，保持每页完全独立、样式隔离，CLI 启动即可预览。

## 目标

- [ ] `webppt-core`：浏览器 npm 包，提供最小化的 PPT 翻页能力，通过 iframe 隔离每张 slide
- [ ] `webppt-cli`：命令行工具，读取文件夹下的 HTML 文件，启动静态 dev server 渲染
- [ ] `defineConfig` 类型支持，`index.ts` 作为可选配置入口
- [ ] 开发体验：文件变化时 SSE 推送热重载

## 非目标

- 不做 `build` 命令（本期）
- 不做主题包系统（本期）
- 不做 PDF 导出（本期）
- 不做 React/Vue 组件支持（本期，每页纯 HTML）

## 工程管理

使用 **pnpm workspaces** 管理 monorepo。

## 开发方式

采用 **TDD**（测试驱动开发）：先写测试，再实现，每个功能模块均有对应的 vitest 测试覆盖。

## 范围

**包含**

- `packages/webppt-core`：`ppt-core.iife.js` 浏览器包，tsup 打包，**打包产物内嵌到 `webppt-cli` 中**，不作为独立 npm 包发布
- `packages/webppt-cli`：CLI 工具，`webppt dev -c <folder> [--port <n>]`，HTTP server 基于 **Hono.js**
- `shell.html` 为静态模板，启动后从 `GET /__webppt/config` 获取配置 JSON 并初始化 `SlideDeck`
- iframe 按需加载（当前页 + 前后各一页预加载）
- underlay / overlay 各为独立 iframe，约定文件名 `_underlay.html` / `_overlay.html`
- `index.ts` 配置文件加载（esbuild transform）
- 文件按字母序排序，支持 `order` 覆盖

**不包含**

- 生产打包
- 主题继承机制
- 动画过渡配置
- webppt-core 独立发布到 npm

## 风险

| 风险                                    | 可能性 | 缓解                                     |
| --------------------------------------- | ------ | ---------------------------------------- |
| iframe 通信复杂度                       | 低     | core 不与 iframe 内通信，只控制显示/隐藏 |
| esbuild transform 加载 TS config 兼容性 | 低     | 参考 Vite 实现，成熟方案                 |
| SSE 热重载在某些浏览器不稳定            | 低     | 降级为手动刷新按钮                       |

## 开放问题

- 无，所有决策已在对话中确认
