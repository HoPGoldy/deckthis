# 主题创建

主题由两部分组成：**CSS 文件**（视觉样式）+ **`beforeEach` 注入**（将 CSS 链接到每张 slide）。

## 基本模式

### 1. 创建 `theme.css`

```css
/* theme.css — 放在 deck folder 根目录 */

body {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #0f0f23;
  color: #cdd6f4;
  font-family: "Segoe UI", system-ui, sans-serif;
}

h1 {
  font-size: 3rem;
  font-weight: 700;
  color: #cba6f7;
}

h2 {
  font-size: 2rem;
  color: #89b4fa;
}

p,
li {
  font-size: 1.2rem;
  line-height: 1.7;
  opacity: 0.85;
}

pre,
code {
  background: #1e1e2e;
  border-radius: 6px;
  padding: 0.2em 0.5em;
  font-size: 0.9em;
  color: #a6e3a1;
}
```

### 2. 在 `deckthis.config.ts` 中挂载并注入

```typescript
import { join } from "node:path";
import { defineConfig, getDeckDir } from "deckthis";

const deckRoot = getDeckDir();

export default defineConfig({
  // 将 theme.css 注册为静态资源（basename → /theme.css）
  assets: [join(deckRoot, "theme.css")],

  // 向每张 slide 注入 CSS 链接
  beforeEach: (html) => {
    return html.replace("</head>", '<link rel="stylesheet" href="/theme.css"></head>');
  },
});
```

## 进阶：注入全局脚本

```typescript
beforeEach: (html) => {
  return html
    .replace("</head>", '<link rel="stylesheet" href="/theme.css"></head>')
    .replace("</body>", '<script src="/animations.js"></script></body>');
},
```

## 进阶：按页差异化处理

```typescript
beforeEach: (html, ctx) => {
  // 封面页特殊处理
  if (ctx.filename === "01.html") {
    return html.replace("</head>", '<link rel="stylesheet" href="/cover-theme.css"></head>');
  }
  return html.replace("</head>", '<link rel="stylesheet" href="/theme.css"></head>');
},
```

## 多资源挂载

```typescript
assets: [
  join(deckRoot, "theme.css"),
  join(deckRoot, "fonts", "custom-font.woff2"),
  join(deckRoot, "highlight.min.css"),
  join(deckRoot, "highlight.min.js"),
],
```

> **注意**：`assets` 仅挂载文件的 basename，不保留目录结构。  
> 例如 `fonts/custom-font.woff2` 访问路径是 `/custom-font.woff2`。
