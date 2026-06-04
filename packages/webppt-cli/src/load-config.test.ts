import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "./load-config";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

const CONFIG_FILE_NAME = "deckthis.config.ts";

describe("loadConfig", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "webppt-lc-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true });
  });

  it("returns null when deckthis.config.ts does not exist", async () => {
    const result = await loadConfig(tmpDir);
    expect(result).toBeNull();
  });

  it("loads a simple config with order field", async () => {
    await fs.writeFile(
      path.join(tmpDir, CONFIG_FILE_NAME),
      `import { defineConfig } from 'webppt-cli/types';
export default defineConfig({ order: ['02.html', '01.html'] });`,
    );

    // defineConfig is just identity – write the raw export for test simplicity
    await fs.writeFile(
      path.join(tmpDir, CONFIG_FILE_NAME),
      `export default { order: ['02.html', '01.html'] };`,
    );

    const result = await loadConfig(tmpDir);
    expect(result).toEqual({ order: ["02.html", "01.html"] });
  });

  it("loads a config with underlay and overlay fields", async () => {
    await fs.writeFile(
      path.join(tmpDir, CONFIG_FILE_NAME),
      `export default { underlay: '/_underlay.html', overlay: '/_overlay.html' };`,
    );

    const result = await loadConfig(tmpDir);
    expect(result).toEqual({ underlay: "/_underlay.html", overlay: "/_overlay.html" });
  });

  it("returns null and prints a warning when config has a syntax error", async () => {
    await fs.writeFile(path.join(tmpDir, CONFIG_FILE_NAME), `export default { order: [`);

    const result = await loadConfig(tmpDir);
    expect(result).toBeNull();
  });
});
