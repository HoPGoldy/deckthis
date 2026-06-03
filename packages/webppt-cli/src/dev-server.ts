import { Hono } from "hono";
import { serve } from "@hono/node-server";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { WebPPTConfig, ResolvedConfig, BeforeEachFn } from "./types";
import { getShellHtml } from "./shell";
import { createFileWatcher } from "./file-watcher";

export interface DevServerOptions {
  folder: string;
  port: number;
  getConfig(): ResolvedConfig;
  getPluginConfig?(): Pick<WebPPTConfig, "assets" | "beforeEach">;
  onFileChange?(): void | Promise<void>;
}

const vendorDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../vendor");

export async function startDevServer(options: DevServerOptions): Promise<() => Promise<void>> {
  const { folder, port, getConfig, getPluginConfig, onFileChange } = options;

  const app = new Hono();
  const sseClients = new Set<(data: string) => void>();

  // ── File watcher ───────────────────────────────────────────────────────────
  const watcher = createFileWatcher(folder);

  watcher.onChange(async () => {
    await onFileChange?.();
    console.log(`[webppt] File changed, reloading ${sseClients.size} client(s)...`);
    sseClients.forEach((send) => send("reload"));
  });

  // ── Routes ─────────────────────────────────────────────────────────────────

  app.get("/", (c) => {
    return c.html(getShellHtml());
  });

  app.get("/__sse", (c) => {
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    const send = (data: string) => {
      writer.write(encoder.encode(`data: ${data}\n\n`)).catch(() => {
        sseClients.delete(send);
      });
    };

    sseClients.add(send);

    c.req.raw.signal?.addEventListener("abort", () => {
      sseClients.delete(send);
      writer.close().catch(() => {});
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  });

  app.get("/__webppt/config", (c) => {
    return c.json(getConfig());
  });

  app.get("/__webppt/:file{.+}", async (c) => {
    const file = c.req.param("file");
    const filePath = path.join(vendorDir, file);
    try {
      const content = await fs.readFile(filePath);
      const ext = path.extname(file);
      const mimeType = ext === ".js" ? "application/javascript" : "text/plain";
      return new Response(content, { headers: { "Content-Type": mimeType } });
    } catch {
      return c.notFound();
    }
  });

  app.get("/*", async (c) => {
    const pathname = new URL(c.req.url).pathname;
    const filePath = path.join(folder, pathname);
    const mimeTypes: Record<string, string> = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".mjs": "application/javascript",
      ".css": "text/css",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".json": "application/json",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
    };

    const resolvedConfig = getConfig();
    const pluginConfig = getPluginConfig?.() ?? {};
    const slideSet = new Set(resolvedConfig.slides);

    // Build asset map: basename → absolute path
    const assetMap = new Map<string, string>();
    for (const assetPath of pluginConfig.assets ?? []) {
      assetMap.set(path.basename(assetPath), assetPath);
    }

    const applyBeforeEach = async (
      html: string,
      fp: string,
      beforeEach: BeforeEachFn | undefined,
    ): Promise<string> => {
      if (!beforeEach || !slideSet.has(pathname)) return html;
      return beforeEach(html, { filename: path.basename(fp), filepath: fp });
    };

    const contentType = (fp: string) => mimeTypes[path.extname(fp)] ?? "application/octet-stream";

    // 1. Try user folder first
    try {
      const content = await fs.readFile(filePath);
      const basename = path.basename(filePath);

      // Warn if an asset would have been shadowed
      if (assetMap.has(basename)) {
        console.warn(`\x1b[33m[webppt] ⚠ asset "${basename}" 被工作目录同名文件覆盖\x1b[0m`);
      }

      const html = content.toString("utf-8");
      const result = await applyBeforeEach(html, filePath, pluginConfig.beforeEach);
      return new Response(result, { headers: { "Content-Type": contentType(filePath) } });
    } catch {
      // Fall through to assets
    }

    // 2. Try assets
    const assetFile = assetMap.get(path.basename(pathname));
    if (assetFile) {
      try {
        const content = await fs.readFile(assetFile);
        const html = content.toString("utf-8");
        const result = await applyBeforeEach(html, assetFile, pluginConfig.beforeEach);
        return new Response(result, { headers: { "Content-Type": contentType(assetFile) } });
      } catch {
        // Fall through to 404
      }
    }

    return c.notFound();
  });

  // ── Start server ───────────────────────────────────────────────────────────
  const server = serve({ fetch: app.fetch, port });

  await new Promise<void>((resolve, reject) => {
    server.on("listening", resolve);
    server.on("error", reject);
  });

  return async () => {
    await watcher.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  };
}
