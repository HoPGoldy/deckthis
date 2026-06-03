# with-config demo

演示 `index.ts` 配置文件的全部能力：自定义幻灯片顺序、全局样式注入、overlay / underlay。

## 使用方法

```bash
webppt demo with-config   # 复制到当前目录
cd with-config
webppt .
```

## 文件说明

```
with-config/
  index.ts          # 配置文件，使用 defineConfig 导出
  theme.css         # 全局主题样式（由 beforeEach 注入到每张幻灯片）
  _overlay.html     # 前景层（右下角 demo 标签），以 _ 开头自动被识别
  _underlay.html    # 背景装饰层（网格背景），以 _ 开头自动被识别
  01.html ~ 04.html # 幻灯片内容
```

## index.ts 说明

- **`order`**：把 `03.html` 排到最前面，其余保持自动发现的顺序
- **`assets`**：把 `theme.css` 注册为静态资源，使其可通过 `/theme.css` 访问
- **`beforeEach`**：向每张幻灯片的 `<head>` 注入 `<link rel="stylesheet">`
- overlay / underlay 由 `_overlay.html` / `_underlay.html` 自动检测，无需在 `index.ts` 里声明

`getDeckDir()` 由 webppt 在加载配置时注入，返回当前 deck 目录的绝对路径，
用于构造 `assets` 中的文件路径。
