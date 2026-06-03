# 配置（index.ts）

在 deck folder 根目录创建 `index.ts`，webppt 会自动加载。

## 最小示例

```typescript
import { defineConfig } from "deckthis";

export default defineConfig({});
```

## 完整类型定义

```typescript
interface WebPPTConfig {
  order?: (discovered: string[]) => string[];
  underlay?: string;
  overlay?: string;
  assets?: string[];
  beforeEach?: (html: string, ctx: BeforeEachContext) => string | Promise<string>;
}

interface BeforeEachContext {
  filename: string; // 相对文件名，如 "01.html"
  filepath: string; // 磁盘绝对路径
}
```

## 各配置项详解

### `order`

控制幻灯片顺序。接收自动发现的 slide 列表（如 `["/01.html", "/02.html", "/03.html"]`），返回最终顺序。

```typescript
order: (discovered) => {
  // 把 03 提到最前，其余保持原序
  const s03 = discovered.find((s) => s === "/03.html");
  const rest = discovered.filter((s) => s !== "/03.html");
  return s03 ? [s03, ...rest] : discovered;
},
```

### `underlay` / `overlay`

指定下层/上层 iframe 的 URL。省略时自动检测 `_underlay.html` / `_overlay.html`。

```typescript
overlay: "/_overlay.html",   // 显式指定
underlay: "/_underlay.html", // 同上
```

### `assets`

要挂载为静态资源的文件绝对路径数组。文件以其 basename 作为 URL 路径提供服务。

```typescript
import { join } from "node:path";
import { getDeckDir } from "deckthis";

assets: [
  join(getDeckDir(), "theme.css"),      // 访问 /theme.css
  join(getDeckDir(), "logo.png"),       // 访问 /logo.png
],
```

### `beforeEach`

在每张 slide HTML 送达浏览器前执行的转换函数。**不作用于** overlay / underlay。

```typescript
beforeEach: (html, ctx) => {
  console.log("处理:", ctx.filename);
  // 注入全局 CSS
  return html.replace("</head>", '<link rel="stylesheet" href="/theme.css"></head>');
},
```

支持 async：

```typescript
beforeEach: async (html, ctx) => {
  const extra = await fetchSomeData();
  return html.replace("</body>", `<script>window.__data = ${JSON.stringify(extra)}</script></body>`);
},
```

## `getDeckDir()`

返回当前 deck folder 的绝对路径。**只能在 `index.ts` 加载期间调用**（webppt 通过环境变量注入）。

```typescript
import { getDeckDir } from "deckthis";

const deckRoot = getDeckDir();
// 用于拼接 assets 路径
```

## `defineConfig`

恒等函数，仅用于获得 TypeScript 类型推断。

```typescript
export default defineConfig({ ... }); // 等价于直接导出对象，但有类型检查
```
