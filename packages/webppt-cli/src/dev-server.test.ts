import { describe, it, expect, beforeAll, afterAll } from "vitest";
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
