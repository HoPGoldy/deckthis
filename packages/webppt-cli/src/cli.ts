import * as fs from "node:fs/promises";
import * as path from "node:path";
import { loadConfig } from "./load-config";
import { startDevServer } from "./dev-server";
import type { WebPPTConfig, ResolvedConfig } from "./types";

export async function buildSlidesConfig(
  folder: string,
  config: WebPPTConfig | null,
): Promise<ResolvedConfig> {
  const entries = await fs.readdir(folder);
  const htmlFiles = entries.filter((f: string) => f.endsWith(".html") && !f.startsWith("_")).sort();

  let slides: string[];
  if (config?.order) {
    const discovered = htmlFiles.map((f: string) => `/${f}`);
    slides = config.order(discovered);
  } else {
    slides = htmlFiles.map((f: string) => `/${f}`);
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

  program
    .name("webppt")
    .description("Web presentation tool")
    .version("0.0.1")
    .argument("<folder>", "Presentation folder path")
    .option("--port <number>", "Starting port", "39200")
    .action(async (folderArg: string, opts: { port: string }) => {
      const folder = path.resolve(folderArg);
      let port = parseInt(opts.port, 10);

      // Validate folder
      try {
        await fs.access(folder);
      } catch {
        console.error(`[webppt] Folder not found: ${folder}`);
        process.exit(1);
      }

      const config = await loadConfig(folder);
      let currentConfig = await buildSlidesConfig(folder, config);
      let currentPluginConfig = { assets: config?.assets, beforeEach: config?.beforeEach };

      // Try ports in sequence until one is available
      while (true) {
        try {
          await startDevServer({
            folder,
            port,
            getConfig: () => currentConfig,
            getPluginConfig: () => currentPluginConfig,
            onFileChange: async () => {
              const updatedConfig = await loadConfig(folder);
              currentConfig = await buildSlidesConfig(folder, updatedConfig);
              currentPluginConfig = {
                assets: updatedConfig?.assets,
                beforeEach: updatedConfig?.beforeEach,
              };
            },
          });
          console.log(`[webppt] Ready → http://localhost:${port}`);
          break;
        } catch (err: unknown) {
          const nodeErr = err as NodeJS.ErrnoException & { code?: string };
          if (nodeErr.code === "EADDRINUSE") {
            console.warn(`[webppt] Port ${port} in use, trying ${port + 1}...`);
            port++;
          } else {
            throw err;
          }
        }
      }
    });

  await program.parseAsync(argv);
}
