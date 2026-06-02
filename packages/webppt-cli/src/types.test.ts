import { describe, it, expect } from "vitest";
import { defineConfig } from "./types";

describe("defineConfig", () => {
  it("returns the exact same object reference", () => {
    const config = { slides: ["/a.html"] };
    // @ts-expect-error – slides is not part of WebPPTConfig but testing identity
    expect(defineConfig(config as never)).toBe(config);
  });

  it("accepts an empty config", () => {
    expect(defineConfig({})).toEqual({});
  });

  it("preserves order, underlay and overlay fields", () => {
    const config = {
      order: ["02.html", "01.html"],
      underlay: "/_underlay.html",
      overlay: "/_overlay.html",
    };
    expect(defineConfig(config)).toEqual(config);
  });
});
