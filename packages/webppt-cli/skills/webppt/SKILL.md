# webppt Skill

**webppt** 是一个基于 Web 的演示工具。每张幻灯片是一个独立的 HTML 文件，由 webppt dev server 托管并以 iframe 形式组合成演示文稿。

## 核心概念

- **slide** — 普通 HTML 文件（如 `01.html`、`02.html`），文件名以 `_` 开头的会被忽略
- **deck folder** — 存放所有 slide HTML 的目录，即 `webppt <folder>` 所指向的目录
- **deckthis.config.ts** — 可选的配置文件，放在 deck folder 根目录，用于自定义顺序、主题、插件等
- **overlay / underlay** — 覆盖在所有 slide 上方/下方的 iframe，用于全局 UI（页码、背景等）

## CLI 快速参考

```bash
webppt <folder>              # 启动 dev server（默认端口 39200）
webppt <folder> --port 3000  # 指定端口
webppt demo list             # 列出内置 demo
webppt demo <name>           # 复制 demo 到当前目录
webppt skill                 # 复制本 skill 到指定目录
```

## 子文档索引

| 文档                                       | 内容                                                        |
| ------------------------------------------ | ----------------------------------------------------------- |
| [basic-usage.md](basic-usage.md)           | Slide HTML 结构、键盘快捷键、目录约定                       |
| [configuration.md](configuration.md)       | `deckthis.config.ts` 配置 API、`defineConfig`、所有选项详解 |
| [overlay-underlay.md](overlay-underlay.md) | overlay / underlay iframe 机制与通信                        |
| [theme-creation.md](theme-creation.md)     | CSS 主题、`beforeEach` 注入、静态资源挂载                   |
| [plugin-creation.md](plugin-creation.md)   | 可复用插件函数模式（如 `simpleTheme`）                      |

## 包结构

```
webppt-cli    ← CLI 工具，包含 dev server、config loader、子命令
webppt-core   ← 浏览器端 SlideDeck 运行时（打包为 IIFE 注入页面）
```
