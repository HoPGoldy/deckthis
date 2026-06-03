function simpleTheme(options = {}) {
  const {
    title,
    subtitle,
    thanks,
    thanksSub,
    config: userConfig = {},
  } = options as {
    title?: string;
    subtitle?: string;
    thanks?: string;
    thanksSub?: string;
    config?: {
      order?: (discovered: string[]) => string[];
      underlay?: string;
      overlay?: string;
      assets?: string[];
      beforeEach?: (html: string, ctx: { filename: string; filepath: string }) => string | Promise<string>;
    };
  };

  const injectPageData = (html: string, data: Record<string, string>): string => {
    const attrs = Object.entries(data)
      .map(([k, v]) => `data-${k}="${v.replace(/"/g, "&quot;")}"`)
      .join(" ");
    return html.replace("<body>", `<body ${attrs}>`);
  };

  return {
    overlay: userConfig.overlay ?? "/_plugin/overlay.html",
    order: (discovered: string[]) => {
      const ordered = userConfig.order ? userConfig.order(discovered) : discovered;
      return ["/_plugin/cover.html", ...ordered, "/_plugin/thanks.html"];
    },
    beforeEach: async (html: string, ctx: { filename: string; filepath: string }) => {
      let result = userConfig.beforeEach ? await userConfig.beforeEach(html, ctx) : html;
      result = result.replace("</head>", '<link rel="stylesheet" href="/_plugin/simple-theme.css"></head>');

      if (ctx.filename === "cover.html" && ctx.filepath.includes("/_plugin/") && (title || subtitle)) {
        result = injectPageData(result, {
          ...(title ? { title } : {}),
          ...(subtitle ? { subtitle } : {}),
        });
      }
      if (ctx.filename === "thanks.html" && ctx.filepath.includes("/_plugin/") && (thanks || thanksSub)) {
        result = injectPageData(result, {
          ...(thanks ? { thanks } : {}),
          ...(thanksSub ? { "thanks-sub": thanksSub } : {}),
        });
      }

      return result;
    },
  };
}

export default simpleTheme({
  title: "webppt 插件机制",
  subtitle: "用 simpleTheme 快速套用统一主题",
  thanks: "谢谢！",
  thanksSub: "github.com/your-org/webppt",

  // 用户自己的额外配置，插件会叠加在它上面
  config: {
    // 例：额外的 beforeEach，在插件注入之后执行
    // beforeEach: (html) => html.replace('</body>', '<script src="/custom.js"></script></body>'),
  },
});
