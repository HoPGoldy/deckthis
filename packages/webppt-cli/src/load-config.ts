import * as esbuild from "esbuild";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import type { WebPPTConfig } from "./types";

// Resolve the cli entry point relative to this file (works both in src/ via tsx and in dist/)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// In dist/ the built file is cli.js; in src/ via tsx it's cli.ts — try .js first, fall back to .ts
const _cliJs = path.resolve(__dirname, "cli.js");
const _cliTs = path.resolve(__dirname, "cli.ts");
const CLI_ENTRY = (await fs
  .access(_cliJs)
  .then(() => true)
  .catch(() => false))
  ? _cliJs
  : _cliTs;

export async function loadConfig(folder: string): Promise<WebPPTConfig | null> {
  const configPath = path.join(folder, "index.ts");

  // Check if config file exists
  try {
    await fs.access(configPath);
  } catch {
    return null;
  }

  let tmpFile: string | null = null;
  try {
    tmpFile = path.join(os.tmpdir(), `webppt-${crypto.randomUUID()}.mjs`);

    // Expose deck dir to config files via getDeckDir()
    process.env.WEBPPT_DECK_DIR = folder;

    await esbuild.build({
      entryPoints: [configPath],
      bundle: true,
      format: "esm",
      platform: "node",
      outfile: tmpFile,
      absWorkingDir: folder,
      alias: { "webppt-cli": CLI_ENTRY },
    });

    const mod = await import(tmpFile);
    return (mod.default ?? mod) as WebPPTConfig;
  } catch (err) {
    console.warn("[webppt] Failed to load config:", err);
    return null;
  } finally {
    if (tmpFile) {
      await fs.unlink(tmpFile).catch(() => {});
    }
  }
}
