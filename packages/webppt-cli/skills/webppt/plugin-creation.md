# 插件创建

webppt 插件是一个普通的 TypeScript 函数：接受自定义参数，返回标准 `WebPPTConfig`。  
这让主题和功能可以被打包、复用，并通过组合叠加到用户配置上。

## 插件函数签名

```typescript
import type { WebPPTConfig } from "deckthis";

// 插件 = 返回 WebPPTConfig 的函数
function myPlugin(options: MyOptions): WebPPTConfig {
  return {
    /* ... */
  };
}
```

## 完整示例：`simpleTheme` 插件

```typescript
// _plugin/simple-theme.ts

import { join } from "node:path";
import { getDeckDir } from "deckthis";
import type { WebPPTConfig } from "deckthis";

export interface SimpleThemeOptions {
  title?: string;
  subtitle?: string;
  thanks?: string;
  thanksSub?: string;
  /** 用户额外配置，插件会将自己的逻辑叠加在上面 */
  config?: WebPPTConfig;
}

export function simpleTheme(options: SimpleThemeOptions = {}): WebPPTConfig {
  const { title, subtitle, thanks, thanksSub, config: userConfig = {} } = options;

  // 将参数注入到 HTML 的 data-* 属性
  const injectPageData = (html: string, data: Record<string, string>): string => {
    const attrs = Object.entries(data)
      .map(([k, v]) => `data-${k}="${v.replace(/"/g, "&quot;")}"`)
      .join(" ");
    return html.replace("<body>", `<body ${attrs}>`);
  };

  return {
    overlay: userConfig.overlay ?? "/overlay.html",

    assets: [
      ...(userConfig.assets ?? []),
      join(getDeckDir(), "_plugin", "simple-theme.css"),
      join(getDeckDir(), "_plugin", "cover.html"),
      join(getDeckDir(), "_plugin", "thanks.html"),
      join(getDeckDir(), "_plugin", "overlay.html"),
    ],

    order: userConfig.order,

    beforeEach: async (html, ctx) => {
      // 先应用用户的 beforeEach
      let result = userConfig.beforeEach ? await userConfig.beforeEach(html, ctx) : html;

      // 插件逻辑：注入主题 CSS
      result = result.replace("</head>", '<link rel="stylesheet" href="/simple-theme.css"></head>');

      // 为封面页注入参数
      if (ctx.filename === "cover.html" && (title || subtitle)) {
        result = injectPageData(result, {
          ...(title ? { title } : {}),
          ...(subtitle ? { subtitle } : {}),
        });
      }

      return result;
    },
  };
}
```

## 在 `index.ts` 中使用插件

```typescript
// index.ts
import { simpleTheme } from "./_plugin/simple-theme.js";

export default simpleTheme({
  title: "我的演讲",
  subtitle: "副标题",
  thanks: "谢谢！",
  thanksSub: "github.com/me/my-talk",
});
```

## 插件组合技巧

### 插件叠加（多插件合并）

```typescript
import { defineConfig } from "deckthis";

function mergeConfigs(a: WebPPTConfig, b: WebPPTConfig): WebPPTConfig {
  return {
    ...a,
    ...b,
    assets: [...(a.assets ?? []), ...(b.assets ?? [])],
    beforeEach: async (html, ctx) => {
      const r1 = a.beforeEach ? await a.beforeEach(html, ctx) : html;
      return b.beforeEach ? await b.beforeEach(r1, ctx) : r1;
    },
  };
}

export default mergeConfigs(simpleTheme({ title: "My Talk" }), codeHighlightPlugin());
```

### 插件携带 `cover.html` 模板示例

```html
<!-- _plugin/cover.html — 封面页 HTML，通过 data-* 接收参数 -->
<!DOCTYPE html>
<html lang="zh">
  <head>
    <meta charset="UTF-8" />
    <link rel="stylesheet" href="/simple-theme.css" />
  </head>
  <body>
    <div class="cover">
      <h1 id="title"></h1>
      <p id="subtitle"></p>
    </div>
    <script>
      // 从 data-* 属性读取参数
      const el = document.body;
      document.getElementById("title").textContent = el.dataset.title ?? "";
      document.getElementById("subtitle").textContent = el.dataset.subtitle ?? "";
    </script>
  </body>
</html>
```

## 注意事项

- `getDeckDir()` 只能在模块加载期间（顶层或同步调用链）使用，不能延迟到异步回调中
- 插件携带的 `assets` 文件使用 **basename** 作为 URL，避免同名冲突
- `beforeEach` 中调用 `userConfig.beforeEach` 时要 `await`，因为用户可能返回 Promise
