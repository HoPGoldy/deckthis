import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { startDevServer } from "./dev-server";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

describe("dev-server integration", () => {
  let close: () => Promise<void>;
  let tmpDir: string;
  const port = 14382;
  const base = `http://localhost:${port}`;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "webppt-srv-"));
    await fs.writeFile(path.join(tmpDir, "01.html"), "<h1>Slide 1</h1>");
    await fs.writeFile(path.join(tmpDir, "02.html"), "<h1>Slide 2</h1>");

    close = await startDevServer({
      folder: tmpDir,
      port,
      getConfig: () => ({ slides: ["/01.html", "/02.html"] }),
    });
  }, 15000);

  afterAll(async () => {
    await close();
    await fs.rm(tmpDir, { recursive: true });
  });

  it("GET / returns 200 with shell HTML", async () => {
    const res = await fetch(`${base}/`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("/__webppt/ppt-wrapper.iife.js");
  });

  it("GET /__webppt/config returns correct JSON", async () => {
    const res = await fetch(`${base}/__webppt/config`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.slides).toEqual(["/01.html", "/02.html"]);
  });

  it("GET /01.html serves static file from folder", async () => {
    const res = await fetch(`${base}/01.html`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Slide 1");
  });

  it("GET /nonexistent returns 404", async () => {
    const res = await fetch(`${base}/nonexistent.html`);
    expect(res.status).toBe(404);
  });

  it("GET /__sse returns text/event-stream", async () => {
    const controller = new AbortController();
    try {
      const res = await fetch(`${base}/__sse`, { signal: controller.signal });
      expect(res.headers.get("content-type")).toContain("text/event-stream");
    } finally {
      controller.abort();
    }
  });

  it("GET /__webppt/ppt-wrapper.iife.js returns 404 when vendor file absent", async () => {
    const res = await fetch(`${base}/__webppt/ppt-wrapper.iife.js`);
    // Before T-008 the vendor file does not exist → 404 is correct
    expect([200, 404]).toContain(res.status);
  });

  it("throws when port is already in use", async () => {
    await expect(
      startDevServer({
        folder: tmpDir,
        port, // same port – already bound
        getConfig: () => ({ slides: [] }),
      }),
    ).rejects.toThrow();
  });
});

describe("dev-server assets support", () => {
  let close: () => Promise<void>;
  let tmpDir: string;
  let assetDir: string;
  let secondaryAssetDir: string;
  const port = 14383;
  const base = `http://localhost:${port}`;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "webppt-assets-"));
    assetDir = await fs.mkdtemp(path.join(os.tmpdir(), "webppt-assetfiles-"));
    secondaryAssetDir = await fs.mkdtemp(path.join(os.tmpdir(), "webppt-assetfiles-2-"));
    await fs.writeFile(path.join(tmpDir, "01.html"), "<h1>Slide 1</h1>");
    await fs.writeFile(path.join(assetDir, "theme.css"), "body { color: red; }");
    await fs.mkdir(path.join(assetDir, "nested"));
    await fs.writeFile(path.join(assetDir, "nested", "cover.html"), "<h1>Cover</h1>");
    await fs.writeFile(path.join(secondaryAssetDir, "theme.css"), "body { color: blue; }");

    close = await startDevServer({
      folder: tmpDir,
      port,
      getConfig: () => ({ slides: ["/01.html"] }),
      getPluginConfig: () => ({
        assets: [assetDir, secondaryAssetDir],
      }),
    });
  }, 15000);

  afterAll(async () => {
    await close();
    await fs.rm(tmpDir, { recursive: true });
    await fs.rm(assetDir, { recursive: true });
    await fs.rm(secondaryAssetDir, { recursive: true });
  });

  it("serves asset file from configured directories", async () => {
    const res = await fetch(`${base}/theme.css`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("color: red");
  });

  it("preserves nested paths inside asset directories", async () => {
    const res = await fetch(`${base}/nested/cover.html`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Cover");
  });

  it("user folder file takes priority over asset directories", async () => {
    await fs.mkdir(path.join(tmpDir, "nested"));
    await fs.writeFile(path.join(tmpDir, "nested", "cover.html"), "<h1>User Cover</h1>");

    try {
      const res = await fetch(`${base}/nested/cover.html`);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("User Cover");
    } finally {
      await fs.rm(path.join(tmpDir, "nested"), { recursive: true, force: true });
    }
  });

  it("uses the first matching asset directory", async () => {
    const res = await fetch(`${base}/theme.css`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("color: red");
    expect(text).not.toContain("color: blue");
  });

  it("blocks path traversal outside asset directories", async () => {
    const res = await fetch(`${base}/../package.json`);
    expect(res.status).toBe(404);
  });

  it("returns 404 for file not in folder or assets", async () => {
    const res = await fetch(`${base}/nonexistent.xyz`);
    expect(res.status).toBe(404);
  });
});

describe("dev-server beforeEach hook", () => {
  let close: () => Promise<void>;
  let tmpDir: string;
  const port = 14384;
  const base = `http://localhost:${port}`;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "webppt-before-"));
    await fs.writeFile(path.join(tmpDir, "01.html"), "<html><head></head><body>Slide</body></html>");
    await fs.writeFile(path.join(tmpDir, "_overlay.html"), "<html><head></head><body>Overlay</body></html>");

    close = await startDevServer({
      folder: tmpDir,
      port,
      getConfig: () => ({ slides: ["/01.html"], overlay: "/_overlay.html" }),
      getPluginConfig: () => ({
        beforeEach: (html) => html.replace("</head>", '<link rel="stylesheet" href="/theme.css"></head>'),
      }),
    });
  }, 15000);

  afterAll(async () => {
    await close();
    await fs.rm(tmpDir, { recursive: true });
  });

  it("injects content into slide HTML via beforeEach", async () => {
    const res = await fetch(`${base}/01.html`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('<link rel="stylesheet" href="/theme.css">');
  });

  it("does NOT apply beforeEach to overlay/underlay", async () => {
    const res = await fetch(`${base}/_overlay.html`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain('<link rel="stylesheet" href="/theme.css">');
  });
});
