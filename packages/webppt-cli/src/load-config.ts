import * as esbuild from "esbuild";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { createRequire } from "node:module";
import type { WebPPTConfig } from "./types";

export async function loadConfig(folder: string): Promise<WebPPTConfig | null> {
  const configPath = path.join(folder, "index.ts");

  // Check if config file exists
  try {
    await fs.access(configPath);
  } catch {
    return null;
  }

  // Resolve the node_modules/ that contains deckthis by requiring its package.json
  // from the deck folder. This works regardless of where the CLI itself was invoked
  // from (dev, global install, npx, etc.), and the output file sits next to deckthis
  // so Node.js can resolve it at runtime.
  let nodeModulesDir: string;
  try {
    const _require = createRequire(path.join(folder, "__placeholder__.js"));
    const pkgJson = _require.resolve("deckthis/package.json");
    nodeModulesDir = path.dirname(path.dirname(pkgJson)); // .../node_modules/
  } catch {
    nodeModulesDir = path.join(folder, "node_modules");
  }
  const outDir = path.join(nodeModulesDir, ".deckthis");
  const outFile = path.join(outDir, `config-${crypto.randomUUID()}.mjs`);

  try {
    await fs.mkdir(outDir, { recursive: true });

    // Expose deck dir to config files via getDeckDir()
    process.env.WEBPPT_DECK_DIR = folder;

    await esbuild.build({
      entryPoints: [configPath],
      bundle: true,
      format: "esm",
      platform: "node",
      outfile: outFile,
      absWorkingDir: folder,
      external: ["deckthis"],
    });

    const mod = await import(outFile);
    return (mod.default ?? mod) as WebPPTConfig;
  } catch (err) {
    console.warn("[webppt] Failed to load config:", err);
    return null;
  } finally {
    await fs.unlink(outFile).catch(() => {});
  }
}
