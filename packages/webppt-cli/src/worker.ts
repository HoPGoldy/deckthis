/**
 * Child process entry point.
 *
 * Spawned by cli.ts with:
 *   node --import tsx/esm dist/worker.js --folder <path> --port <number>
 *
 * tsx/esm registers a Node.js loader hook so that dynamic import() of .ts files
 * works natively, and import.meta.url correctly reflects each source file's own path.
 */
import { loadConfig, buildSlidesConfig } from "./load-config.js";
import { startDevServer } from "./dev-server.js";

const args = process.argv.slice(2);
const folderIdx = args.indexOf("--folder");
const portIdx = args.indexOf("--port");

if (folderIdx === -1 || portIdx === -1) {
  console.error("[webppt] worker: missing --folder or --port");
  process.exit(1);
}

const folder = args[folderIdx + 1];
const port = parseInt(args[portIdx + 1], 10);

// Expose deck dir so getDeckDir() works inside user config files
process.env.WEBPPT_DECK_DIR = folder;

const config = await loadConfig(folder);
const slidesConfig = await buildSlidesConfig(folder, config);

await startDevServer({
  folder,
  port,
  getConfig: () => slidesConfig,
  getPluginConfig: () => ({ assets: config?.assets, beforeEach: config?.beforeEach }),
});

console.log(`[webppt] Ready → http://localhost:${port}`);
