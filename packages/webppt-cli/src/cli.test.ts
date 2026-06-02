import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { buildSlidesConfig } from "./cli";

describe("buildSlidesConfig", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "webppt-cli-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true });
  });

  it("returns slides sorted alphabetically when no config.order", async () => {
    await fs.writeFile(path.join(tmpDir, "02.html"), "");
    await fs.writeFile(path.join(tmpDir, "01.html"), "");

    const result = await buildSlidesConfig(tmpDir, null);
    expect(result.slides).toEqual(["/01.html", "/02.html"]);
  });

  it("excludes _underlay.html and _overlay.html from slides", async () => {
    await fs.writeFile(path.join(tmpDir, "01.html"), "");
    await fs.writeFile(path.join(tmpDir, "_underlay.html"), "");
    await fs.writeFile(path.join(tmpDir, "_overlay.html"), "");

    const result = await buildSlidesConfig(tmpDir, null);
    expect(result.slides).toEqual(["/01.html"]);
  });

  it("auto-detects _underlay.html and sets underlay URL", async () => {
    await fs.writeFile(path.join(tmpDir, "01.html"), "");
    await fs.writeFile(path.join(tmpDir, "_underlay.html"), "");

    const result = await buildSlidesConfig(tmpDir, null);
    expect(result.underlay).toBe("/_underlay.html");
  });

  it("auto-detects _overlay.html and sets overlay URL", async () => {
    await fs.writeFile(path.join(tmpDir, "01.html"), "");
    await fs.writeFile(path.join(tmpDir, "_overlay.html"), "");

    const result = await buildSlidesConfig(tmpDir, null);
    expect(result.overlay).toBe("/_overlay.html");
  });

  it("respects config.order for slide ordering", async () => {
    await fs.writeFile(path.join(tmpDir, "01.html"), "");
    await fs.writeFile(path.join(tmpDir, "02.html"), "");
    await fs.writeFile(path.join(tmpDir, "03.html"), "");

    const result = await buildSlidesConfig(tmpDir, { order: ["03.html", "01.html"] });
    expect(result.slides).toEqual(["/03.html", "/01.html", "/02.html"]);
  });

  it("uses config.underlay over auto-detection", async () => {
    await fs.writeFile(path.join(tmpDir, "01.html"), "");
    await fs.writeFile(path.join(tmpDir, "_underlay.html"), "");

    const result = await buildSlidesConfig(tmpDir, { underlay: "/custom-underlay.html" });
    expect(result.underlay).toBe("/custom-underlay.html");
  });
});

describe("runCli argument validation", () => {
  beforeEach(() => {
    vi.spyOn(process, "exit").mockImplementation((code?: string | number) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exits with code 1 when content folder does not exist", async () => {
    const { runCli } = await import("./cli");
    await expect(runCli(["node", "webppt", "dev", "-c", "/absolutely/nonexistent/path/xyz"])).rejects.toThrow(
      "process.exit(1)",
    );
  });
});
