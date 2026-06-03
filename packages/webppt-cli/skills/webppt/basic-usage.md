# 基本使用

## 目录结构约定

```
my-talk/
  01.html        ← slide 1（按文件名字母序自动排序）
  02.html        ← slide 2
  03.html        ← slide 3
  _underlay.html ← 可选，自动检测（下层 iframe）
  _overlay.html  ← 可选，自动检测（上层 iframe）
  index.ts       ← 可选，自定义配置
  theme.css      ← 可选，自定义样式
```

- 文件名以 `_` 开头的 HTML 文件**不会**被当作 slide
- slide 默认按文件名字母升序排列，可通过 `order` 配置覆盖

## Slide HTML 最小结构

每张 slide 是完整的独立 HTML 页面，全屏展示：

```html
<!DOCTYPE html>
<html lang="zh">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Slide 标题</title>
    <style>
      body {
        margin: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: #1a1a2e;
        color: #eaeaea;
        font-family: system-ui, sans-serif;
      }
    </style>
  </head>
  <body>
    <h1>内容</h1>
  </body>
</html>
```

## 启动 Dev Server

```bash
# 启动，自动选择从 39200 开始的可用端口
webppt ./my-talk

# 指定端口
webppt ./my-talk --port 3000
```

启动后浏览器访问输出的 URL（如 `http://localhost:39200`）。

## 键盘快捷键

| 按键                       | 操作         |
| -------------------------- | ------------ |
| `→` / `Space` / `PageDown` | 下一张       |
| `←` / `PageUp`             | 上一张       |
| 数字键（如 `3`）+ `Enter`  | 跳转到指定页 |

## SlideDeck 运行时 API（浏览器端）

webppt 注入的 `SlideDeck` 实例暴露在全局，可在 overlay/underlay 中使用：

```javascript
// 在 overlay.html 或 underlay.html 中
const deck = window.parent.__webppt_deck; // 非正式 API，以实际注入为准
deck.next();
deck.prev();
deck.goto(2); // 跳转到第 3 张（0-based）
deck.current(); // 返回当前 index
```
