import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { DeckthisConfig, ResolvedConfig } from "./types";

const CONFIG_FILE_NAME = "deckthis.config.ts";

export async function buildSlidesConfig(
  folder: string,
  config: DeckthisConfig | null,
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

export async function loadConfig(folder: string): Promise<DeckthisConfig | null> {
  const configPath = path.join(folder, CONFIG_FILE_NAME);

  try {
    await fs.access(configPath);
  } catch {
    return null;
  }

  try {
    // tsx/esm is registered by the parent via --import, so .ts files are importable directly.
    const url = `file://${configPath.replace(/\\/g, "/")}`;
    const mod = await import(url);
    return (mod.default ?? mod) as DeckthisConfig;
  } catch (err) {
    console.warn("[deckthis] Failed to load config:", err);
    return null;
  }
}
