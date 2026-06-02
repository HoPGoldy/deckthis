# 任务：webppt

## 阶段一：项目脚手架

- [ ] ⏳ **T-001** 初始化 monorepo 结构（Low）
  - 在根目录创建 `packages/webppt-core/` 和 `packages/webppt-cli/` 目录
  - 根目录 `package.json` 配置 `workspaces`
  - 创建 `pnpm-workspace.yaml`（声明 `packages/*`）
  - 影响文件：`package.json`、`pnpm-workspace.yaml`

- [ ] ⏳ **T-002** 初始化 `webppt-core` 包（Low）
  - 创建 `packages/webppt-core/package.json`（name, version, 标记 `private: true`）
  - 创建 `packages/webppt-core/tsup.config.ts`（构建 `wrapper.ts` → `dist/ppt-wrapper.iife.js`，IIFE 自执行）
  - 创建 `packages/webppt-core/tsconfig.json`
  - 影响文件：`packages/webppt-core/package.json`、`tsup.config.ts`、`tsconfig.json`

- [ ] ⏳ **T-003** 初始化 `webppt-cli` 包（Low）
  - 创建 `packages/webppt-cli/package.json`（name, bin 字段指向 `bin/webppt.ts`）
  - 创建 `packages/webppt-cli/tsconfig.json`
  - 影响文件：`packages/webppt-cli/package.json`、`tsconfig.json`

- [ ] ⏳ **T-004** 安装依赖（Low）
  - 使用 **pnpm** 安装（根目录运行 `pnpm install`）
  - `webppt-core` devDeps：`tsup`, `typescript`, `vitest`, `@vitest/coverage-v8`, `happy-dom`
  - `webppt-cli` deps：`hono`, `@hono/node-server`, `chokidar`, `esbuild`, `commander`；devDeps：`tsx`, `typescript`, `vitest`, `@vitest/coverage-v8`
  - 影响文件：`pnpm-lock.yaml`

## 阶段二：webppt-core 实现

- [ ] ⏳ **T-005** 实现 `SlideDeck` 核心逻辑（Medium）
  - 先写 `packages/webppt-core/src/core.test.ts`（测试 DOM 结构、iframe 数量、underlay/overlay iframe 存在性）
  - 实现 `packages/webppt-core/src/core.ts`（纯核心，不依赖 CLI）
  - DOM 结构：container > underlay-iframe > slide-iframes > overlay-iframe
  - iframe 按需加载策略（当前页 + 前后各一页预加载）
  - underlay/overlay 为可选 iframe，有 URL 时创建
  - 影响文件：`packages/webppt-core/src/core.ts`、`src/core.test.ts`
  - 依赖：T-002

- [ ] ⏳ **T-006** 实现交互逻辑（Low）
  - 先写测试：模拟点击 / 键盘 / touch 事件，断言当前页变化
  - 实现点击翻页、键盘事件（Arrow / Space）、触摸滑动（阈値 50px）
  - 挂载到 container，键盘事件挂载到 document（destroy 清理）
  - 影响文件：`packages/webppt-core/src/core.ts`、`src/core.test.ts`
  - 依赖：T-005

- [ ] ⏳ **T-007** 实现 `wrapper.ts` CLI 桥接层（Low）
  - 先写测试：mock `fetch`，验证 wrapper 调用 `SlideDeck` 时传入正确的 config
  - `wrapper.ts` 导入 `core.ts` 中的 `SlideDeck`，自动 `fetch('/__webppt/config')` 并初始化
  - IIFE 格式，加载后立即执行，无需外部调用
  - 影响文件：`packages/webppt-core/src/wrapper.ts`、`src/wrapper.test.ts`
  - 依赖：T-005

- [ ] ⏳ **T-008** 打包 webppt-core（Low）
  - 运行 `tsup`，验证 `dist/ppt-wrapper.iife.js` 正确生成
  - 将 `dist/ppt-wrapper.iife.js` 复制到 `packages/webppt-cli/vendor/ppt-wrapper.iife.js`
  - 影响文件：`packages/webppt-core/dist/`、`packages/webppt-cli/vendor/ppt-wrapper.iife.js`
  - 依赖：T-005、T-006、T-007

## 阶段三：webppt-cli 实现

- [ ] ⏳ **T-009** 实现 `types.ts` 和 `defineConfig`（Low）
  - 先写测试：验证 `defineConfig` 返回原对象、类型推断正确
  - `WebPPTConfig` 接口：`order?: string[]`、`underlay?: string`、`overlay?: string`
  - `defineConfig` 工具函数（identity function + 类型推断）
  - 影响文件：`packages/webppt-cli/src/types.ts`、`src/types.test.ts`
  - 依赖：T-003

- [ ] ⏳ **T-010** 实现 `load-config.ts`（Medium）
  - 先写测试：有/无 `index.ts`、语法错误、含 underlay/overlay 字段的配置加载验证
  - esbuild.transform TS → ESM
  - 写临时文件 → dynamic import → 删临时文件
  - 文件不存在时返回 null，编译错误时打印警告返回 null
  - 影响文件：`packages/webppt-cli/src/load-config.ts`、`src/load-config.test.ts`
  - 依赖：T-009

- [ ] ⏳ **T-011** 实现 `file-watcher.ts`（Low）
  - 先写测试：创建临时文件触发回调
  - chokidar watch `*.html` + `index.ts`
  - 暴露 `onChange(callback)` 接口
  - 影响文件：`packages/webppt-cli/src/file-watcher.ts`、`src/file-watcher.test.ts`
  - 依赖：T-003

- [ ] ⏳ **T-012** 实现 `shell.ts`（Low）
  - 先写测试：断言输出 HTML 包含 `<script src="/__webppt/ppt-wrapper.iife.js">` 和 SSE 脚本，不包含 fetch 调用和任何配置数据
  - 返回静态 shell.html 字符串（无参数）
  - 内嵌 SSE 热重载脚本
  - 影响文件：`packages/webppt-cli/src/shell.ts`、`src/shell.test.ts`
  - 依赖：T-003

- [ ] ⏳ **T-013** 实现 `dev-server.ts`（Medium）
  - 先写集成测试：断言 `GET /` 返回静态 shell.html、`GET /__webppt/config` 返回正确 JSON、`GET /__webppt/ppt-wrapper.iife.js` 返回 JS、`GET /__sse` 返回 SSE
  - 基于 **Hono.js**，路由：`/` → shell.html，`/__sse` → SSE，`/__webppt/config` → 配置 JSON，`/__webppt/*` → core 静态文件，其余 → folder 静态文件
  - 接受 `port` 参数，捆绑失败时抛出错误
  - 集成 file-watcher，变化时推送 SSE reload
  - 影响文件：`packages/webppt-cli/src/dev-server.ts`、`src/dev-server.test.ts`
  - 依赖：T-011、T-012、T-008

- [ ] ⏳ **T-014** 实现 `cli.ts` 和 `bin/webppt.ts`（Low）
  - 先写测试：验证参数解析、folder 不存在时退出、端口冲突时退出
  - 使用 **commander** 解析 `dev -c <folder> [--port <n>]` 参数
  - 调用 load-config，扫描 HTML 文件，排序（自动识别 \_underlay.html / \_overlay.html 并排除出 slides），启动 dev-server
  - 影响文件：`packages/webppt-cli/src/cli.ts`、`packages/webppt-cli/bin/webppt.ts`、`src/cli.test.ts`
  - 依赖：T-010、T-013

## 阶段四：验收测试

- [ ] ⏳ **T-015** 手动验收 AC-001（Low）
  - 创建 `examples/basic/` 放三个 HTML，运行 `webppt dev -c examples/basic`，验证翻页正常
  - 影响文件：`examples/basic/01.html`、`02.html`、`03.html`
  - 依赖：T-014

- [ ] ⏳ **T-016** 手动验收 AC-002（Low）
  - 在 `examples/basic/` 添加 `index.ts`，配置 `order`，验证顺序生效
  - 依赖：T-015

- [ ] ⏳ **T-017** 手动验收 AC-003（Low）
  - 修改任意 slide HTML 文件，验证浏览器自动刷新
  - 依赖：T-016

- [ ] ⏳ **T-018** 手动验收 AC-004（Low）
  - 在 `examples/basic/` 中添加 `_underlay.html` 和 `_overlay.html`，验证两个 iframe 正确渲染且不被 slide 遗盖
  - 依赖：T-017
