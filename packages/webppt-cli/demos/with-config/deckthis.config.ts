import { join } from "node:path";
import { defineConfig, getDeckDir } from "deckthis";

const deckRoot = getDeckDir();

export default defineConfig({
  // 1. 自定义幻灯片顺序：把 03 提到最前，其余自动追加
  order: (discovered) => {
    const s03 = discovered.find((s) => s === "/03.html");
    const rest = discovered.filter((s) => s !== "/03.html");
    return s03 ? [s03, ...rest] : discovered;
  },

  // 2. 把本目录下的 theme.css 作为静态资源挂载
  assets: [join(deckRoot, "theme.css")],

  // 3. 向每张幻灯片注入全局 CSS（beforeEach 仅作用于 slides，不含 overlay/underlay）
  beforeEach: (html) => {
    return html.replace("</head>", '<link rel="stylesheet" href="/theme.css"></head>');
  },

  // 4. overlay / underlay 由工作目录下的 _overlay.html / _underlay.html 自动检测，无需声明
});
