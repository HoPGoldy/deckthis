# Overlay 与 Underlay

## 概念

webppt 支持两层"全局 iframe"叠加在所有 slide 上：

```
┌─────────────────────────────┐
│  overlay  (z-index 最高)     │  ← _overlay.html，pointer-events: none
│  ┌─────────────────────────┐│
│  │  slide iframe (当前页)   ││  ← 当前 slide（pointer-events: auto）
│  └─────────────────────────┘│
│  underlay (z-index 最低)     │  ← _underlay.html，pointer-events: none
└─────────────────────────────┘
```

- **overlay**：覆盖在 slide 上方，常用于页码、进度条、logo 等 HUD 元素
- **underlay**：位于 slide 下方，常用于全局背景、动画背景

## 自动检测

放置 `_underlay.html` 或 `_overlay.html` 在 deck folder 根目录，webppt 自动挂载，无需 `index.ts`。

## overlay 最小模板

```html
<!DOCTYPE html>
<html lang="zh">
  <head>
    <meta charset="UTF-8" />
    <style>
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      html,
      body {
        width: 100%;
        height: 100%;
      }
      body {
        display: flex;
        align-items: flex-end;
        justify-content: flex-end;
        padding: 1.2rem 1.6rem;
        font-family: system-ui, sans-serif;
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.8rem;
        pointer-events: none; /* 不遮挡 slide 交互 */
      }
    </style>
  </head>
  <body>
    <span id="page-num">1</span>
  </body>
</html>
```

## underlay 最小模板

```html
<!DOCTYPE html>
<html lang="zh">
  <head>
    <meta charset="UTF-8" />
    <style>
      html,
      body {
        margin: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      }
    </style>
  </head>
  <body></body>
</html>
```

## 显式指定路径

当 overlay/underlay 不在默认位置时，在 `index.ts` 中显式指定：

```typescript
import { defineConfig } from "deckthis";

export default defineConfig({
  overlay: "/custom-overlay.html", // 相对于 dev server 根路径
  underlay: "/custom-underlay.html",
});
```

## 注意事项

- overlay / underlay 的 HTML 文件**必须**通过 `assets` 挂载或放置在 deck folder 内才能被 dev server 访问
- `beforeEach` **不作用于** overlay / underlay，只转换 slides
- 两者都是 `pointer-events: none` 的 iframe，不会拦截 slide 上的鼠标事件
