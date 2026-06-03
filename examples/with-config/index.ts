import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as fs from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const defineConfig = (config) => config;

function resolveDeckRoot(): string {
  // loadConfig executes this file from a temp module. Resolve the real deck folder from argv.
  const folderArg = process.argv.find((arg) => {
    if (!arg) return false;
    const abs = join(process.cwd(), arg);
    return fs.existsSync(join(abs, "index.ts"));
  });

  if (!folderArg) return __dirname;
  return join(process.cwd(), folderArg);
}

const deckRoot = resolveDeckRoot();

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
