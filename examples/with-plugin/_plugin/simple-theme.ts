/**
 * simpleTheme — 一个 webppt 主题插件示例
 *
 * 用法（index.ts）：
 *   import { simpleTheme } from './_plugin/simple-theme.js'
 *   export default simpleTheme({ title: 'My Talk', thanks: '谢谢大家' })
 *
 * 插件是一个普通函数，入参自定义，返回标准 WebPPTConfig。
 * 内部通过 wrap 用户传入的配置来叠加自己的逻辑。
 */

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface SimpleThemeOptions {
  /** 封面页标题 */
  title?: string;
  /** 封面页副标题 */
  subtitle?: string;
  /** 致谢页文字 */
  thanks?: string;
  /** 致谢页副文字 */
  thanksSub?: string;
  /** 用户额外的 WebPPTConfig，插件会将自己的逻辑叠加在上面 */
  config?: {
    order?: (discovered: string[]) => string[];
    underlay?: string;
    overlay?: string;
    assets?: string[];
    beforeEach?: (html: string, ctx: { filename: string; filepath: string }) => string | Promise<string>;
  };
}

export function simpleTheme(options: SimpleThemeOptions = {}) {
  const { title, subtitle, thanks, thanksSub, config: userConfig = {} } = options;

  // 把封面/致谢页的参数通过 data-* 属性注入到 HTML
  const injectPageData = (html: string, data: Record<string, string>): string => {
    const attrs = Object.entries(data)
      .map(([k, v]) => `data-${k}="${v.replace(/"/g, "&quot;")}"`)
      .join(" ");
    return html.replace("<body>", `<body ${attrs}>`);
  };

  return {
    // overlay 优先使用用户指定的，否则用插件默认
    overlay: userConfig.overlay ?? "/overlay.html",

    // 插件携带的静态资源：CSS + 封面 + 致谢 + overlay
    assets: [
      ...(userConfig.assets ?? []),
      join(__dirname, "simple-theme.css"),
      join(__dirname, "cover.html"),
      join(__dirname, "thanks.html"),
      join(__dirname, "overlay.html"),
    ],

    // 在发现的 slides 头尾插入封面和致谢页
    order: (discovered) => {
      const ordered = userConfig.order ? userConfig.order(discovered) : discovered;
      return ["/cover.html", ...ordered, "/thanks.html"];
    },

    // 向每张幻灯片注入主题 CSS，并执行用户自己的 beforeEach
    beforeEach: async (html, ctx) => {
      // 先执行用户的 beforeEach（如果有）
      let result = userConfig.beforeEach ? await userConfig.beforeEach(html, ctx) : html;

      // 注入主题 CSS
      result = result.replace("</head>", '<link rel="stylesheet" href="/simple-theme.css"></head>');

      // 为封面/致谢页注入 data-* 参数
      if (ctx.filename === "cover.html" && (title || subtitle)) {
        result = injectPageData(result, {
          ...(title ? { title } : {}),
          ...(subtitle ? { subtitle } : {}),
        });
      }
      if (ctx.filename === "thanks.html" && (thanks || thanksSub)) {
        result = injectPageData(result, {
          ...(thanks ? { thanks } : {}),
          ...(thanksSub ? { "thanks-sub": thanksSub } : {}),
        });
      }

      return result;
    },
  };
}
