import * as esbuild from "esbuild";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as crypto from "node:crypto";
import type { WebPPTConfig } from "./types.js";

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
    const source = await fs.readFile(configPath, "utf-8");

    const result = await esbuild.transform(source, {
      loader: "ts",
      format: "esm",
    });

    tmpFile = path.join(os.tmpdir(), `webppt-${crypto.randomUUID()}.mjs`);
    await fs.writeFile(tmpFile, result.code, "utf-8");

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
