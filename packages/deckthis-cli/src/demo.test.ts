import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { listDemos, copyDemo } from "./demo";

describe("listDemos", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "deckthis-list-"));
    await fs.mkdir(path.join(tmpDir, "alpha"));
    await fs.mkdir(path.join(tmpDir, "beta"));
    await fs.writeFile(path.join(tmpDir, "not-a-dir.txt"), "");
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true });
  });

  it("returns sorted directory names", async () => {
    const result = await listDemos(tmpDir);
    expect(result).toEqual(["alpha", "beta"]);
  });

  it("excludes non-directory entries", async () => {
    const result = await listDemos(tmpDir);
    expect(result).not.toContain("not-a-dir.txt");
  });
});

describe("copyDemo", () => {
  let demosDir: string;
  let targetDir: string;

  beforeAll(async () => {
    demosDir = await fs.mkdtemp(path.join(os.tmpdir(), "deckthis-demos-"));
    targetDir = await fs.mkdtemp(path.join(os.tmpdir(), "deckthis-target-"));

    await fs.mkdir(path.join(demosDir, "sample"));
    await fs.writeFile(path.join(demosDir, "sample", "01.html"), "<h1>slide</h1>");
  });

  afterAll(async () => {
    await fs.rm(demosDir, { recursive: true });
    await fs.rm(targetDir, { recursive: true });
  });

  it("copies demo files to target directory", async () => {
    await copyDemo(demosDir, "sample", targetDir);
    const content = await fs.readFile(path.join(targetDir, "sample", "01.html"), "utf-8");
    expect(content).toBe("<h1>slide</h1>");
  });

  it("throws when demo name does not exist", async () => {
    await expect(copyDemo(demosDir, "nonexistent", targetDir)).rejects.toThrow(
      'Demo "nonexistent" not found',
    );
  });

  it("throws when target directory already exists", async () => {
    // sample was already copied in the first test
    await expect(copyDemo(demosDir, "sample", targetDir)).rejects.toThrow("already exists");
  });
});
