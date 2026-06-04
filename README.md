# webppt

用 HTML 文件写演示文稿，在浏览器里展示。每张幻灯片就是一个普通的 `.html` 文件。

## 快速开始

**前置条件**：Node.js 18+，pnpm

```bash
# 克隆并安装依赖
pnpm install

# 构建 core 运行时（首次或修改 core 后运行）
pnpm build:core
```

启动开发服务器：

```bash
npx tsx packages/webppt-cli/bin/webppt.ts <演示文稿目录>

# 示例
npx tsx packages/webppt-cli/bin/webppt.ts examples/basic
```

浏览器打开 `http://localhost:39200`。

## 操作方式

| 操作                | 说明       |
| ------------------- | ---------- |
| `→` / `↓` / `Space` | 下一张     |
| `←` / `↑`           | 上一张     |
| 左右滑动            | 移动端翻页 |

## 目录结构

一个演示文稿目录包含若干 `.html` 文件：

```
my-deck/
  01.html          # 幻灯片（按文件名字母序自动发现）
  02.html
  03.html
  _overlay.html    # 前景层（页码、Logo 等），可选
  _underlay.html   # 背景装饰层，可选
  deckthis.config.ts # 配置文件，可选
```

- `_` 前缀文件不会被当作普通幻灯片，用于 overlay / underlay
- 配置文件为 `deckthis.config.ts`，使用 `defineConfig` 导出

## 配置（deckthis.config.ts）

```ts
import { defineConfig } from "webppt-cli";

export default defineConfig({
  // 自定义幻灯片顺序（接收自动发现的列表，返回最终顺序）
  order: (discovered) => {
    const intro = discovered.find((s) => s === "/intro.html");
    const rest = discovered.filter((s) => s !== "/intro.html");
    return intro ? [intro, ...rest] : discovered;
  },

  // 额外静态资源目录（绝对路径，按请求路径回退查找）
  assets: ["/path/to/theme-assets"],

  // 在每张幻灯片 HTML 被服务前转换（不含 overlay/underlay）
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

## 插件

插件是一个普通函数，接收用户配置，返回合并后的配置对象：

```ts
function myTheme(userConfig = {}) {
  return {
    overlay: "/_theme/overlay.html",
    assets: ["/path/to/_theme"],
    order: (discovered) => [
      "/_theme/cover.html",
      ...(userConfig.order ? userConfig.order(discovered) : discovered),
      "/_theme/thanks.html",
    ],
    beforeEach: async (html, ctx) => {
      let result = userConfig.beforeEach ? await userConfig.beforeEach(html, ctx) : html;
      return result.replace("</head>", '<link rel="stylesheet" href="/_theme/theme.css"></head>');
    },
  };
}

export default myTheme({
  // 传入用户自己的配置，插件负责包裹
});
```

插件约定：

- 插件文件放在 `_plugin/` 等 `_` 前缀目录下，不会被当作幻灯片
- 插件是纯函数，不感知框架内部，只做配置变换
- 需要包裹 `order` / `beforeEach` 时，先调用用户版本再追加插件逻辑

## 示例

```bash
# 最简示例（3 张幻灯片）
npx tsx packages/webppt-cli/bin/webppt.ts examples/basic

# 演示 defineConfig 所有能力（order / assets / beforeEach / overlay / underlay）
npx tsx packages/webppt-cli/bin/webppt.ts examples/with-config

# 演示插件机制（simpleTheme 插件封装 cover + thanks 页、全局 CSS）
npx tsx packages/webppt-cli/bin/webppt.ts examples/with-plugin
```

## 开发

```bash
# 运行所有测试
pnpm test

# 只测试 core
pnpm test:core

# 只测试 cli
pnpm test:cli

# 修改 core.ts 后重新构建（dev server 读取 webppt-core/dist）
pnpm build:core
```

## 项目结构

```
packages/
  webppt-core/     # 浏览器端运行时（SlideDeck）
    src/core.ts    # iframe 布局、键盘/触摸导航、overlay/underlay
    src/wrapper.ts # IIFE 入口，fetch /__webppt/config 后初始化
  webppt-cli/      # 开发服务器 + CLI
    src/cli.ts     # CLI 入口，buildSlidesConfig
    src/dev-server.ts  # Hono 服务器，SSE 热更新，assets/beforeEach
    src/load-config.ts # 加载 deckthis.config.ts 并动态 import
    src/types.ts   # DeckthisConfig、defineConfig
examples/
  basic/           # 最简示例
  with-config/     # defineConfig 示例
  with-plugin/     # 插件示例
```

## 问题

- overlay/underlay 支持数据传递和刷新
- 支持导出为 pptx 格式
