import { Hono } from "hono";
import { serve } from "@hono/node-server";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { WebPPTConfig } from "./types.js";
import { getShellHtml } from "./shell.js";
import { createFileWatcher } from "./file-watcher.js";

export interface DevServerOptions {
  folder: string;
  port: number;
  getConfig(): WebPPTConfig;
  onFileChange?(): void | Promise<void>;
}

const vendorDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../vendor");

export async function startDevServer(options: DevServerOptions): Promise<() => Promise<void>> {
  const { folder, port, getConfig, onFileChange } = options;

  const app = new Hono();
  const sseClients = new Set<(data: string) => void>();

  // ── File watcher ───────────────────────────────────────────────────────────
  const watcher = createFileWatcher(folder);

  watcher.onChange(async () => {
    await onFileChange?.();
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
    try {
      const content = await fs.readFile(filePath);
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
      const contentType = mimeTypes[path.extname(filePath)] ?? "application/octet-stream";
      return new Response(content, { headers: { "Content-Type": contentType } });
    } catch {
      return c.notFound();
    }
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
