import { Hono } from "hono";
import { serve } from "@hono/node-server";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { DeckthisConfig, ResolvedConfig, BeforeEachFn } from "./types";
import { getShellHtml } from "./shell";

export interface DevServerOptions {
  folder: string;
  port: number;
  getConfig(): ResolvedConfig;
  getPluginConfig?(): Pick<DeckthisConfig, "assets" | "beforeEach">;
}

const vendorDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../webppt-core/dist");

function resolveAssetPath(rootDir: string, pathname: string): string | null {
  const relativePath = pathname.replace(/^\/+/, "");
  if (!relativePath) return null;

  const candidate = path.resolve(rootDir, relativePath);
  const relativeToRoot = path.relative(rootDir, candidate);
  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    return null;
  }

  return candidate;
}

export async function startDevServer(options: DevServerOptions): Promise<() => Promise<void>> {
  const { folder, port, getConfig, getPluginConfig } = options;

  const app = new Hono();

  // ── Routes ─────────────────────────────────────────────────────────────────

  app.get("/", (c) => {
    return c.html(getShellHtml());
  });

  app.get("/__sse", (c) => {
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();

    c.req.raw.signal?.addEventListener("abort", () => {
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
    const assetDirs = pluginConfig.assets ?? [];

    const applyBeforeEach = async (
      html: string,
      fp: string,
      beforeEach: BeforeEachFn | undefined,
    ): Promise<string> => {
      if (!beforeEach || !slideSet.has(pathname)) return html;
      return beforeEach(html, { filename: path.basename(fp), filepath: fp });
    };

    const contentType = (fp: string) => mimeTypes[path.extname(fp)] ?? "application/octet-stream";

    const isHtml = (fp: string) => path.extname(fp) === ".html";

    // 1. Try user folder first
    try {
      const content = await fs.readFile(filePath);

      if (isHtml(filePath)) {
        const html = content.toString("utf-8");
        const result = await applyBeforeEach(html, filePath, pluginConfig.beforeEach);
        return new Response(result, { headers: { "Content-Type": contentType(filePath) } });
      }
      return new Response(content, { headers: { "Content-Type": contentType(filePath) } });
    } catch {
      // Fall through to assets
    }

    // 2. Try asset directories in declaration order
    for (const assetDir of assetDirs) {
      const assetFile = resolveAssetPath(assetDir, pathname);
      if (!assetFile) continue;

      try {
        const content = await fs.readFile(assetFile);
        if (isHtml(assetFile)) {
          const html = content.toString("utf-8");
          const result = await applyBeforeEach(html, assetFile, pluginConfig.beforeEach);
          return new Response(result, { headers: { "Content-Type": contentType(assetFile) } });
        }
        return new Response(content, { headers: { "Content-Type": contentType(assetFile) } });
      } catch {
        continue;
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
    await new Promise<void>((resolve) => server.close(() => resolve()));
  };
}
