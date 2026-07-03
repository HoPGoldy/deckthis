import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as net from "node:net";
import { createRequire } from "node:module";
import { loadConfig, buildSlidesConfig } from "./load-config.js";
import { startDevServer } from "./dev-server.js";

export interface ExportOptions {
  /** Absolute path to the presentation folder */
  folder: string;
  /** Output .pptx file path */
  output: string;
  /** Viewport width in pixels (default: 1920) */
  width?: number;
  /** Viewport height in pixels (default: 1080) */
  height?: number;
  /** Device scale factor / screenshot resolution (default: 1) */
  scale?: number;
  /** Delay before screenshot capture in milliseconds (default: 1500) */
  wait?: number;
}

async function findFreePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        resolve(findFreePort(startPort + 1));
      } else {
        reject(err);
      }
    });
    server.listen(startPort, () => server.close(() => resolve(startPort)));
  });
}

async function loadPlaywright(folder: string) {
  // Resolve playwright-chromium from the deck folder or CWD (where user installed it),
  // rather than from deckthis-cli's own node_modules.
  // Use createRequire (CJS-style) to load it, which correctly handles CJS module exports.
  const searchRoots = [folder, process.cwd()];

  for (const root of searchRoots) {
    try {
      const require = createRequire(path.join(root, "package.json"));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pw = require("playwright-chromium") as any;
      if (pw?.chromium) return pw as { chromium: import("playwright-chromium").BrowserType };
    } catch {
      // try next location
    }
  }

  console.error(
    [
      "",
      "[deckthis] Export requires playwright-chromium, which is not installed.",
      "Please install it in your presentation folder:",
      "",
      "  npm install -D playwright-chromium",
      "  npx playwright install chromium",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

export async function exportToPptx(options: ExportOptions): Promise<void> {
  const { folder, output, scale = 1 } = options;

  // Validate folder
  try {
    await fs.access(folder);
  } catch {
    console.error(`[deckthis] Folder not found: ${folder}`);
    process.exit(1);
  }

  process.env.DECKTHIS_DECK_DIR = folder;

  const config = await loadConfig(folder);
  const width = options.width ?? config?.export?.width ?? 1920;
  const height = options.height ?? config?.export?.height ?? 1080;
  const wait = options.wait ?? config?.export?.wait ?? 1500;
  const slidesConfig = await buildSlidesConfig(folder, config);
  const { slides } = slidesConfig;

  if (slides.length === 0) {
    console.error("[deckthis] No slides found in folder.");
    process.exit(1);
  }

  console.log(`[deckthis] Found ${slides.length} slide(s). Starting export...`);

  // Start dev server
  const port = await findFreePort(39300);
  const stopServer = await startDevServer({
    folder,
    port,
    getConfig: () => slidesConfig,
    getPluginConfig: () => ({ assets: config?.assets, beforeEach: config?.beforeEach }),
  });

  const baseUrl = `http://localhost:${port}`;

  // Load playwright (optional peer dependency)
  const { chromium } = await loadPlaywright(folder);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: scale,
  });

  const pngBuffers: Buffer[] = [];

  try {
    console.log(`[deckthis] Capturing slides via ${baseUrl} ...`);

    // Open the shell page once — it renders all three layers (underlay + slide + overlay)
    const page = await context.newPage();

    for (let i = 0; i < slides.length; i++) {
      // Navigate to shell with ?slide=N (1-based)
      // Use "load" instead of "networkidle" — the shell has a persistent SSE connection
      // (/__sse for live reload) which prevents networkidle from ever firing.
      await page.goto(`${baseUrl}/?slide=${i + 1}`, { waitUntil: "load" });

      // Wait for all iframes (underlay, slide, overlay) to finish loading
      await page.evaluate(() =>
        Promise.all(
          Array.from(document.querySelectorAll("iframe")).map(
            (iframe) =>
              new Promise<void>((resolve) => {
                if (iframe.contentDocument?.readyState === "complete") {
                  resolve();
                } else {
                  iframe.addEventListener("load", () => resolve(), { once: true });
                }
              }),
          ),
        ),
      );

      // Wait for fonts in the top-level document and all same-origin iframes
      await page.evaluate(async () => {
        await document.fonts.ready;
        for (const iframe of Array.from(document.querySelectorAll("iframe"))) {
          try {
            await iframe.contentDocument?.fonts?.ready;
          } catch {
            // cross-origin or not yet loaded — skip
          }
        }
      });

      // Allow CSS transitions (e.g. slide opacity fade-in, overlay title appearance)
      // to complete before capturing the screenshot.
      await page.waitForTimeout(wait);

      const buffer = await page.screenshot({ type: "png" });
      pngBuffers.push(buffer);

      console.log(`[deckthis]  ✓ ${i + 1}/${slides.length} ${slides[i]}`);
    }

    await page.close();
  } finally {
    await browser.close();
    await stopServer();
  }

  // Build PPTX
  console.log("[deckthis] Building PPTX...");
  // Use createRequire to load the CJS build of pptxgenjs, avoiding ESM cycle errors on Node 20+
  const _require = createRequire(import.meta.url);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const PptxGenJS = (_require("pptxgenjs") as any).default ?? _require("pptxgenjs");
  const pptx = new PptxGenJS();

  // pptxgenjs uses inches at 96 dpi
  const slideWidthIn = width / 96;
  const slideHeightIn = height / 96;

  pptx.defineLayout({
    name: `${width}x${height}`,
    width: slideWidthIn,
    height: slideHeightIn,
  });
  pptx.layout = `${width}x${height}`;

  for (const buffer of pngBuffers) {
    const slide = pptx.addSlide();
    slide.background = {
      data: `data:image/png;base64,${buffer.toString("base64")}`,
    };
  }

  const pptxBuffer = await pptx.write({ outputType: "nodebuffer" });
  const outPath = path.resolve(output);
  await fs.writeFile(outPath, pptxBuffer as Buffer);

  console.log(`[deckthis] PPTX saved to: ${outPath}`);
}
