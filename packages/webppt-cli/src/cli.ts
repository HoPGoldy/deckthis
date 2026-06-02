import * as fs from "node:fs/promises";
import * as path from "node:path";
import { loadConfig } from "./load-config.js";
import { startDevServer } from "./dev-server.js";
import type { WebPPTConfig } from "./types.js";

export async function buildSlidesConfig(folder: string, config: WebPPTConfig | null): Promise<WebPPTConfig> {
  const entries = await fs.readdir(folder);
  const htmlFiles = entries.filter((f) => f.endsWith(".html") && !f.startsWith("_")).sort();

  let slides: string[];
  if (config?.order && config.order.length > 0) {
    const ordered = config.order.map((f) => (f.startsWith("/") ? f.slice(1) : f));
    const remaining = htmlFiles.filter((f) => !ordered.includes(f));
    slides = [...ordered, ...remaining].map((f) => `/${f}`);
  } else {
    slides = htmlFiles.map((f) => `/${f}`);
  }

  const underlayUrl =
    config?.underlay ?? (entries.includes("_underlay.html") ? "/_underlay.html" : undefined);
  const overlayUrl = config?.overlay ?? (entries.includes("_overlay.html") ? "/_overlay.html" : undefined);

  return {
    slides,
    ...(underlayUrl ? { underlay: underlayUrl } : {}),
    ...(overlayUrl ? { overlay: overlayUrl } : {}),
  };
}

export async function runCli(argv = process.argv): Promise<void> {
  const { Command } = await import("commander");
  const program = new Command();

  program.name("webppt").description("Web presentation tool").version("0.0.1");

  program
    .command("dev")
    .description("Start development server")
    .requiredOption("-c, --content <folder>", "Presentation folder path")
    .option("--port <number>", "Port to listen on", "3000")
    .action(async (opts: { content: string; port: string }) => {
      const folder = path.resolve(opts.content);
      const port = parseInt(opts.port, 10);

      // Validate folder
      try {
        await fs.access(folder);
      } catch {
        console.error(`[webppt] Folder not found: ${folder}`);
        process.exit(1);
      }

      const config = await loadConfig(folder);
      let currentConfig = await buildSlidesConfig(folder, config);

      try {
        await startDevServer({
          folder,
          port,
          getConfig: () => currentConfig,
          onFileChange: async () => {
            const updatedConfig = await loadConfig(folder);
            currentConfig = await buildSlidesConfig(folder, updatedConfig);
          },
        });

        console.log(`[webppt] Ready → http://localhost:${port}`);
      } catch (err: unknown) {
        const nodeErr = err as NodeJS.ErrnoException;
        if (nodeErr.code === "EADDRINUSE") {
          console.error(`[webppt] Port ${port} is already in use`);
          process.exit(1);
        }
        throw err;
      }
    });

  await program.parseAsync(argv);
}
