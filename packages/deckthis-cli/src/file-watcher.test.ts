import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createFileWatcher } from "./file-watcher";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

describe("createFileWatcher", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "deckthis-fw-"));
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true });
  });

  it("calls onChange callback when an HTML file is created", async () => {
    const watcher = createFileWatcher(tmpDir);

    const triggered = new Promise<void>((resolve) => {
      watcher.onChange(resolve);
    });

    // Wait for chokidar to initialize
    await new Promise((r) => setTimeout(r, 300));

    await fs.writeFile(path.join(tmpDir, "test.html"), "<h1>Test</h1>");

    await Promise.race([
      triggered,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
    ]);

    await watcher.close();
  }, 15000);

  it("calls onChange callback when a TS file is created", async () => {
    const watcher = createFileWatcher(tmpDir);

    const triggered = new Promise<void>((resolve) => {
      watcher.onChange(resolve);
    });

    await new Promise((r) => setTimeout(r, 300));

    await fs.writeFile(path.join(tmpDir, "deckthis.config.ts"), "export default {}");

    await Promise.race([
      triggered,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
    ]);

    await watcher.close();
  }, 15000);
});
