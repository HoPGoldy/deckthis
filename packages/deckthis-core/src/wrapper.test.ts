import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("wrapper", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches /__deckthis/config and calls SlideDeck with the config", async () => {
    const mockSlideDeck = vi.fn().mockReturnValue({ destroy: vi.fn() });
    vi.doMock("./core.js", () => ({ SlideDeck: mockSlideDeck }));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ slides: ["/a.html", "/b.html"] }),
      }),
    );

    const { init } = await import("./wrapper.js");
    await init();

    expect(globalThis.fetch).toHaveBeenCalledWith("/__deckthis/config");
    expect(mockSlideDeck).toHaveBeenCalledWith({ slides: ["/a.html", "/b.html"] });
  });

  it("passes underlay and overlay fields to SlideDeck when present", async () => {
    const mockSlideDeck = vi.fn().mockReturnValue({ destroy: vi.fn() });
    vi.doMock("./core.js", () => ({ SlideDeck: mockSlideDeck }));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            slides: ["/01.html"],
            underlay: "/_underlay.html",
            overlay: "/_overlay.html",
          }),
      }),
    );

    const { init } = await import("./wrapper.js");
    await init();

    expect(mockSlideDeck).toHaveBeenCalledWith({
      slides: ["/01.html"],
      underlay: "/_underlay.html",
      overlay: "/_overlay.html",
    });
  });
});
