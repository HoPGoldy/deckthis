import { describe, it, expect } from "vitest";
import { getShellHtml } from "./shell";

describe("getShellHtml", () => {
  it("includes the ppt-wrapper IIFE script tag", () => {
    const html = getShellHtml();
    expect(html).toContain('src="/__webppt/ppt-wrapper.iife.js"');
  });

  it("includes the SSE EventSource script", () => {
    const html = getShellHtml();
    expect(html).toContain('new EventSource("/__sse")');
    expect(html).toContain("location.reload()");
  });

  it("does NOT contain a fetch() call", () => {
    const html = getShellHtml();
    expect(html).not.toContain("fetch(");
  });

  it("does NOT embed any configuration data", () => {
    const html = getShellHtml();
    expect(html).not.toContain("slides");
    expect(html).not.toContain("webppt/config");
  });

  it("returns the same string on every call", () => {
    expect(getShellHtml()).toBe(getShellHtml());
  });
});
