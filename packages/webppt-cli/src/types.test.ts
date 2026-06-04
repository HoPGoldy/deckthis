import { describe, it, expect } from "vitest";
import { defineConfig } from "./types";

describe("defineConfig", () => {
  it("returns the exact same object reference", () => {
    const config = { slides: ["/a.html"] };
    // @ts-expect-error – slides is not part of DeckthisConfig but testing identity
    expect(defineConfig(config as never)).toBe(config);
  });

  it("accepts an empty config", () => {
    expect(defineConfig({})).toEqual({});
  });

  it("preserves underlay and overlay fields", () => {
    const config = {
      underlay: "/_underlay.html",
      overlay: "/_overlay.html",
    };
    expect(defineConfig(config)).toEqual(config);
  });

  it("preserves order function", () => {
    const order = (discovered: string[]) => discovered;
    const config = { order };
    expect(defineConfig(config).order).toBe(order);
  });

  it("preserves assets array", () => {
    const config = { assets: ["/abs/path/theme.css"] };
    expect(defineConfig(config)).toEqual(config);
  });

  it("preserves beforeEach function", () => {
    const beforeEach = (html: string) => html;
    const config = { beforeEach };
    expect(defineConfig(config).beforeEach).toBe(beforeEach);
  });
});
