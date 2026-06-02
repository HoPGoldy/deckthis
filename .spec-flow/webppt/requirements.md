# 需求：webppt

## 开发方法

**MD-001** 采用 TDD：每个功能模块先写 vitest 测试，测试通过后再提交实现代码。没有测试的功能不得合并。

## 功能需求

### webppt-core（浏览器包）

**FR-001** `SlideDeck(options)` 接受配置对象，挂载到指定 DOM 容器上

**FR-002** 每张 slide 通过独立 `<iframe>` 渲染，样式完全隔离

**FR-003** 采用预加载策略：初始化时即为当前页及前后各一页的 iframe 赋予 `src`，其余 iframe `src` 为空。切页时通过 CSS `transition: opacity 200ms` 实现淡入淡出。已赋值过的 `src` 不重置（避免重新加载）。预留：后期页内动画可监听 `window` 上的 `message` 事件，通过 `will-show` 信号启动入场动画（本期框架层不发送该信号）

**FR-004** 支持以下交互触发翻页：

- 点击页面主体区域 → 下一页
- 键盘 `ArrowRight` / `Space` → 下一页
- 键盘 `ArrowLeft` → 上一页
- 触摸左滑 → 下一页，右滑 → 上一页

**FR-005** 全局底层插槽（`underlay`）：独立 `<iframe>`，z-index 最低，位于所有 slide iframe 之下，用于背景图、纹理等

**FR-005a** `underlay` 第一优先读取 `index.ts` 中的 `underlay` 字段（文件路径）；若无配置则自动扫描 `<folder>/_underlay.html`；若不存在则不渲染底层 iframe

**FR-006** 全局顶层插槽（`overlay`）：独立 `<iframe>`，z-index 最高，位于所有 slide iframe 之上，用于 logo、导航按钮等

**FR-006a** `overlay` 第一优先读取 `index.ts` 中的 `overlay` 字段（文件路径）；若无配置则自动扫描 `<folder>/_overlay.html`；若不存在则不渲染顶层 iframe

**FR-007** ~~默认顶层插槽内置页码显示和按钮~~ 本期移除

**FR-008** `SlideDeck` 暴露命令式 API：`next()`、`prev()`、`goto(index)`、`current()`

**FR-009** `webppt-core` 分为两个模块：

- **`core.ts`**：纯粹的 `SlideDeck` 实现，接受 `SlideDeckOptions` 配置，不依赖 CLI
- **`wrapper.ts`**：CLI 桥接层，自动 `fetch('/__webppt/config')` 并调用 `SlideDeck`
- tsup 构建 `wrapper.ts` → IIFE（`dist/ppt-wrapper.iife.js`）；**webppt-core 不作为独立 npm 包发布**；打包产物以方案 B 形式复制到 `webppt-cli/vendor/` 随 CLI 一起分发

### webppt-cli

**FR-010** `webppt dev -c <folder> [--port <n>]` 启动 dev server，默认端口 `3000`；`--port` 可指定任意端口，端口被占用时打印错误并退出

**FR-011** 当 `<folder>` 缺少 `index.ts` 时，直接扫描文件夹下所有 `*.html` 文件作为 slides

**FR-012** 文件按文件名字母升序排序

**FR-013** 当 `<folder>/index.ts` 存在时，通过 esbuild transform + dynamic import 加载配置

**FR-014** `index.ts` 支持 `order`、`underlay`、`overlay` 字段：

- `order?: string[]`：覆盖默认字母序排列
- `underlay?: string`：显式指定 underlay HTML 文件路径（相对于 `<folder>`）
- `overlay?: string`：显式指定 overlay HTML 文件路径（相对于 `<folder>`）

**FR-015** `defineConfig(config)` 工具函数由包导出，提供 TypeScript 类型推断

**FR-016** dev server 提供 `GET /__webppt/config` 接口，返回当前有效配置的 JSON：`{ slides: string[], underlay?: string, overlay?: string }`

**FR-016a** `shell.html` 为完全静态模板，仅包含加载 `ppt-wrapper.iife.js` 的 `<script src>` 和 SSE 热重载脚本。配置获取与 `SlideDeck` 初始化均由 wrapper IIFE 自动完成，shell.html 不含任何与配置相关的逻辑

**FR-017** 当 `<folder>` 下任意 `*.html` 文件或 `index.ts` 发生变化时，通过 SSE 通知浏览器自动刷新

**FR-018** dev server 静态托管 `<folder>` 目录，所有 slide 内的相对路径资源（图片等）可正常访问

## 非功能需求

**NFR-001** `webppt-core` IIFE 包体积 < 10KB gzip

**NFR-002** dev server 启动时间 < 1s（不含 config TS 编译）

**NFR-003** 翻页响应时间 < 16ms（单帧内完成 DOM 操作）

**NFR-004** 每个实现模块必须有对应的 vitest 测试覆盖

## 验收标准

**AC-001** 在 `<folder>` 下放置 `01.html`、`02.html`、`03.html`，运行 `webppt dev -c <folder>`，浏览器打开后显示 `01.html` 内容，点击可依次翻页

**AC-002** 添加 `index.ts` 配置 `order: ['03.html', '01.html', '02.html']`，重启后页面顺序按配置显示

**AC-003** 修改任意 slide HTML 文件后，浏览器自动刷新

**AC-004** 全局底层插槽和顶层插槽的 HTML 内容正确渲染，不被 slide iframe 遮挡
