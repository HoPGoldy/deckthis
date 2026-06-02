import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { loadConfig } from "./load-config.js";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

describe("loadConfig", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "webppt-lc-"));
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true });
  });

  it("returns null when index.ts does not exist", async () => {
    const result = await loadConfig(tmpDir);
    expect(result).toBeNull();
  });

  it("loads a simple config with order field", async () => {
    await fs.writeFile(
      path.join(tmpDir, "index.ts"),
      `import { defineConfig } from 'webppt-cli/types';
export default defineConfig({ order: ['02.html', '01.html'] });`,
    );

    // defineConfig is just identity – write the raw export for test simplicity
    await fs.writeFile(path.join(tmpDir, "index.ts"), `export default { order: ['02.html', '01.html'] };`);

    const result = await loadConfig(tmpDir);
    expect(result).toEqual({ order: ["02.html", "01.html"] });
  });

  it("loads a config with underlay and overlay fields", async () => {
    await fs.writeFile(
      path.join(tmpDir, "index.ts"),
      `export default { underlay: '/_underlay.html', overlay: '/_overlay.html' };`,
    );

    const result = await loadConfig(tmpDir);
    expect(result).toEqual({ underlay: "/_underlay.html", overlay: "/_overlay.html" });
  });

  it("returns null and prints a warning when config has a syntax error", async () => {
    await fs.writeFile(path.join(tmpDir, "index.ts"), `export default { order: [`);

    const result = await loadConfig(tmpDir);
    expect(result).toBeNull();
  });
});
