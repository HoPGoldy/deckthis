# deckthis

用 HTML 文件写演示文稿，在浏览器里展示。每张幻灯片就是一个普通的 `.html` 文件——无需框架，无需构建，打开编辑器就能写。

**[English →](README.md)**

## 安装

```bash
npm install -g deckthis
```

或者直接使用，无需安装：

```bash
npx deckthis <目录>
```

## 快速开始

1. 创建一个目录，放入幻灯片 HTML 文件：

```
my-talk/
  01.html
  02.html
  03.html
```

2. 启动开发服务器：

```bash
deckthis my-talk
```

3. 浏览器打开 `http://localhost:39200`。

幻灯片按文件名字母序自动发现。修改任意文件，浏览器自动刷新。

## 操作方式

| 操作                | 说明       |
| ------------------- | ---------- |
| `→` / `↓` / `Space` | 下一张     |
| `←` / `↑`           | 上一张     |
| 左右滑动            | 移动端翻页 |

## 目录结构

```
my-talk/
  01.html              # 幻灯片——按文件名字母序自动发现
  02.html
  03.html
  _overlay.html        # 前景层（页码、Logo 等）——可选
  _underlay.html       # 背景装饰层——可选
  deckthis.config.ts   # 配置文件——可选
```

- `_` 前缀文件不会被当作普通幻灯片，用于 overlay / underlay。
- 配置文件为 `deckthis.config.ts`，使用 `defineConfig` 导出以获得类型提示。

## 配置（`deckthis.config.ts`）

```ts
import { defineConfig } from "deckthis";

export default defineConfig({
  // 自定义幻灯片顺序（接收自动发现的列表，返回最终顺序）
  order: (discovered) => {
    const intro = discovered.find((s) => s === "/intro.html");
    const rest = discovered.filter((s) => s !== "/intro.html");
    return intro ? [intro, ...rest] : discovered;
  },

  // 额外静态资源目录（绝对路径，在 deck folder 之后按顺序回退查找）
  assets: ["/path/to/theme-assets"],

  // 在每张幻灯片 HTML 被服务前转换（不作用于 overlay/underlay）
  beforeEach: (html, ctx) => {
    return html.replace("</head>", '<link rel="stylesheet" href="/theme.css"></head>');
  },

  // 手动指定 overlay / underlay（默认自动检测目录下的 _overlay.html / _underlay.html）
  overlay: "/_overlay.html",
  underlay: "/_underlay.html",
});
```

### 配置项说明

| 字段         | 类型                                       | 说明                                           |
| ------------ | ------------------------------------------ | ---------------------------------------------- |
| `order`      | `(discovered: string[]) => string[]`       | 控制幻灯片顺序，可插入插件提供的额外页         |
| `assets`     | `string[]`                                 | 绝对目录路径列表，按请求路径顺序回退查询       |
| `beforeEach` | `(html, ctx) => string \| Promise<string>` | 每张 slide 的 HTML 转换钩子                    |
| `overlay`    | `string`                                   | 前景 iframe URL，默认自动检测 `_overlay.html`  |
| `underlay`   | `string`                                   | 背景 iframe URL，默认自动检测 `_underlay.html` |

## Overlay 与 Underlay

`_overlay.html` 叠加在所有幻灯片上方（默认禁用鼠标事件），`_underlay.html` 叠加在下方。

每次切换幻灯片，deckthis 会向两个 iframe 广播 `postMessage`：

```ts
window.addEventListener("message", (e) => {
  if (e.data?.type !== "deckthis:slide-change") return;
  const { current, total, title } = e.data;
  // current: 当前页码（从 1 开始）
  // total: 总页数
  // title: 来自 <meta name="deckthis:title"> 或 <title>
});
```

在幻灯片中添加元数据：

```html
<meta name="deckthis:title" content="项目背景" /> <meta name="deckthis:section" content="01" />
```

**`title` 回退规则**：如果没有 `deckthis:title`，自动使用 `<title>` 标签内容。

## 插件

插件是一个普通函数，接收用户配置，返回合并后的配置对象：

```ts
// _plugin/my-theme.ts
import type { DeckthisConfig } from "deckthis";

export function myTheme(userConfig: DeckthisConfig = {}): DeckthisConfig {
  return {
    overlay: "/_plugin/overlay.html",
    assets: ["/path/to/_plugin"],
    order: (discovered) => [
      "/_plugin/cover.html",
      ...(userConfig.order ? userConfig.order(discovered) : discovered),
      "/_plugin/thanks.html",
    ],
    beforeEach: async (html, ctx) => {
      const base = userConfig.beforeEach ? await userConfig.beforeEach(html, ctx) : html;
      return base.replace("</head>", '<link rel="stylesheet" href="/_plugin/theme.css"></head>');
    },
  };
}
```

```ts
// deckthis.config.ts
import { myTheme } from "./_plugin/my-theme";

export default myTheme({
  // 传入自己的配置，插件负责包裹
});
```

**插件约定：**

- 插件文件放在 `_plugin/` 等 `_` 前缀目录下，不会被当作幻灯片。
- 插件是纯函数，不感知框架内部，只做配置变换。
- 需要包裹 `order` / `beforeEach` 时，先调用用户版本再追加插件逻辑。

## CLI 命令

```bash
deckthis <目录>              # 启动 dev server（默认端口 39200）
deckthis <目录> --port 3000  # 指定端口

deckthis demo list           # 列出内置 demo
deckthis demo <name>         # 复制 demo 到当前目录

deckthis skill               # 复制 AI 编程 skill 到指定目录
```

## `getDeckDir()`

在 `deckthis.config.ts` 内调用 `getDeckDir()` 可获取当前 deck folder 的绝对路径，适合动态构建资源路径：

```ts
import { defineConfig, getDeckDir } from "deckthis";
import path from "node:path";

export default defineConfig({
  assets: [path.join(getDeckDir(), "_assets")],
});
```

## 示例

安装后，复制并运行内置 demo：

```bash
deckthis demo basic        # 最简示例，3 张幻灯片
deckthis demo with-config  # 演示所有 defineConfig 选项
deckthis demo with-plugin  # 演示插件模式
cd basic && deckthis .
```

## 开发（monorepo）

```bash
pnpm install

# 构建浏览器运行时（首次运行或修改 core 后需执行）
pnpm build:core

# 运行所有测试
pnpm test

# 只运行某个包的测试
pnpm test:core
pnpm test:cli
```

## 项目结构

```
packages/
  deckthis-core/          # 浏览器端运行时（SlideDeck）
    src/core.ts           # iframe 布局、键盘/触摸导航、overlay/underlay
    src/wrapper.ts        # IIFE 入口，fetch /__deckthis/config 后初始化 SlideDeck
  deckthis-cli/           # 开发服务器 + CLI
    src/cli.ts            # CLI 入口，端口管理，文件监听重启
    src/dev-server.ts     # Hono 服务器，SSE 热更新，assets/beforeEach 管道
    src/load-config.ts    # 动态 import 加载 deckthis.config.ts
    src/types.ts          # DeckthisConfig、defineConfig、getDeckDir
```
