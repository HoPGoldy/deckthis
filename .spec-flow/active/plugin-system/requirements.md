# Requirements：主题插件系统

## 功能需求

### FR-001 自动检测 overlay/underlay

- 当工作目录下存在 `_overlay.html` 时，系统应自动将其作为 overlay 应用
- 当工作目录下存在 `_underlay.html` 时，系统应自动将其作为 underlay 应用
- `_overlay.html` / `_underlay.html` 通过已有的 `_` 前缀规则自动排除在幻灯片列表之外
- 当 `WebPPTConfig.overlay` / `WebPPTConfig.underlay` 显式指定时，覆盖自动检测结果

### FR-002 `order` 函数形式

- `WebPPTConfig.order` 类型变更为 `(discovered: string[]) => string[]`，移除原来的 `string[]` 形式
- `discovered` 参数为框架自动发现的幻灯片 URL 列表（以 `/` 开头，已排除保留文件）
- 当 `order` 未指定时，使用自动发现的列表（按文件名排序）

### FR-003 `assets` 静态资源挂载

- `WebPPTConfig.assets` 类型为 `string[]`，每项为 Node.js 文件系统绝对路径
- 每个 asset 文件以 `/<basename>` 的 URL 路径挂载到 dev server
- 当 asset 文件的 basename 与工作目录下的同名文件冲突时：
  - 用户工作目录文件优先返回
  - CLI 控制台输出黄色警告，格式：`[webppt] ⚠ asset "<basename>" 被工作目录同名文件覆盖`

### FR-004 `beforeEach` 钩子

- `WebPPTConfig.beforeEach` 类型为 `(html: string, ctx: BeforeEachContext) => string | Promise<string>`
- `BeforeEachContext` 包含：`filename: string`（如 `01.html`）、`filepath: string`（绝对路径）
- 当请求的路径对应一个幻灯片时（在 `ResolvedConfig.slides` 中），dev server 在返回 HTML 前执行 `beforeEach`
- `beforeEach` 仅作用于幻灯片文件，不作用于 overlay/underlay/assets

### FR-005 插件机制（约定，无框架代码）

- 插件是一个函数，入参自定义，返回值为 `WebPPTConfig`
- 用户在 `index.ts` 中调用插件函数，将返回值作为 `defineConfig` 的入参
- `defineConfig` 保持现有行为（identity 函数），类型更新以匹配新字段

## 非功能需求

### NFR-001 性能

- `beforeEach` 为请求时按需执行，不做预编译缓存（保持简单）

### NFR-002 兼容性

- 移除 `order: string[]` 形式为破坏性变更，需在 CHANGELOG 中注明
- 现有无 `order` 字段的配置文件完全兼容

## 验收标准

| ID     | 标准                                                                   |
| ------ | ---------------------------------------------------------------------- |
| AC-001 | 工作目录含 `overlay.html` 时，浏览器加载页面后存在 overlay iframe      |
| AC-002 | `overlay.html` 不出现在幻灯片列表中                                    |
| AC-003 | `order: (s) => ['cover.html', ...s, 'thanks.html']` 时，幻灯片顺序正确 |
| AC-004 | asset 冲突时，控制台输出黄色警告，用户文件被返回                       |
| AC-005 | `beforeEach` 注入的 `<link>` 标签在幻灯片 iframe 内生效                |
| AC-006 | `beforeEach` 不作用于 overlay/underlay                                 |
