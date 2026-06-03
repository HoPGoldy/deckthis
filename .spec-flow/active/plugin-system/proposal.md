# Proposal：主题插件系统

## 背景

当前 webppt 的每张幻灯片是完全独立的 HTML 文件，样式和内容完全自治。这使得跨幻灯片的统一风格（字体、配色、封面页、致谢页、全局 CSS）需要用户在每个文件中重复编写，维护成本高。

需要一套基础能力层 + 插件机制，让第三方可以发布主题包，用户一行代码即可应用统一风格。

## 目标

- [x] 工作目录下所有文件自动作为静态资源 serve（已有）
- [x] 自动检测工作目录下的 `_overlay.html` / `_underlay.html` 并应用
- [x] `beforeEach` 钩子：在 Node.js 中对每个 slide HTML 执行转换（注入 CSS/JS 等）
- [x] `assets`：插件携带的静态资源可挂载到 dev server，供浏览器访问
- [x] `order` 改为函数形式：`(discovered: string[]) => string[]`，插件可在 slides 列表头尾插入自己的页面
- [x] 插件机制：插件就是"返回 `WebPPTConfig` 的函数"，框架无需特殊支持

## 非目标

- 不提供官方主题包（框架只提供基础能力，主题包由社区发布）
- 不做 `beforeEach` 的自动合并（插件自己负责包装用户传入的 `beforeEach`）
- 不给 `beforeEach` 添加 `isAsset` 上下文（插件开发者可通过 HTML 内容特征自行判断）

## 范围

**In-scope：**

- 修改 `webppt-cli` 的 `types.ts`、`cli.ts`、`dev-server.ts`
- 更新 `defineConfig` 的类型定义
- 添加 assets 冲突警告逻辑

**Out-of-scope：**

- `webppt-core` 无需修改
- 不新增 npm 包

## 风险

| 风险                                      | 缓解措施                             |
| ----------------------------------------- | ------------------------------------ |
| assets 文件名与用户文件冲突，行为不符预期 | 用户目录优先，CLI 输出黄色警告       |
| `beforeEach` 转换破坏 HTML 结构           | 插件开发者责任；框架不做 HTML 校验   |
| `order` 函数中引用的 slides URL 不存在    | 运行时 404，保持现有行为，不额外处理 |
