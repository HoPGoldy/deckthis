import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SlideDeck } from "./core.js";

const TEST_URL = "http://localhost/";

describe("SlideDeck", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    window.location.href = TEST_URL;
  });

  afterEach(() => {
    document.body.removeChild(container);
    window.location.href = TEST_URL;
  });

  // ── DOM structure ──────────────────────────────────────────────────────────

  describe("DOM structure", () => {
    it("creates .sd-deck inside container", () => {
      const deck = SlideDeck({ slides: ["/a.html", "/b.html"], el: container });
      expect(container.querySelector(".sd-deck")).not.toBeNull();
      deck.destroy();
    });

    it("creates correct number of .sd-slide iframes", () => {
      const deck = SlideDeck({ slides: ["/a.html", "/b.html", "/c.html"], el: container });
      expect(container.querySelectorAll(".sd-slide").length).toBe(3);
      deck.destroy();
    });

    it("does NOT create .sd-underlay when underlay is omitted", () => {
      const deck = SlideDeck({ slides: ["/a.html"], el: container });
      expect(container.querySelector(".sd-underlay")).toBeNull();
      deck.destroy();
    });

    it("creates .sd-underlay with correct src when underlay is provided", () => {
      const deck = SlideDeck({ slides: ["/a.html"], el: container, underlay: "/_underlay.html" });
      const el = container.querySelector<HTMLIFrameElement>(".sd-underlay");
      expect(el).not.toBeNull();
      expect(el!.getAttribute("src")).toBe("/_underlay.html");
      deck.destroy();
    });

    it("does NOT create .sd-overlay when overlay is omitted", () => {
      const deck = SlideDeck({ slides: ["/a.html"], el: container });
      expect(container.querySelector(".sd-overlay")).toBeNull();
      deck.destroy();
    });

    it("creates .sd-overlay with correct src when overlay is provided", () => {
      const deck = SlideDeck({ slides: ["/a.html"], el: container, overlay: "/_overlay.html" });
      const el = container.querySelector<HTMLIFrameElement>(".sd-overlay");
      expect(el).not.toBeNull();
      expect(el!.getAttribute("src")).toBe("/_overlay.html");
      deck.destroy();
    });
  });

  // ── Preloading strategy ────────────────────────────────────────────────────

  describe("src preloading", () => {
    it("sets src for the first slide on init", () => {
      const deck = SlideDeck({ slides: ["/a.html", "/b.html", "/c.html"], el: container });
      const slides = container.querySelectorAll<HTMLIFrameElement>(".sd-slide");
      expect(slides[0].getAttribute("src")).toBe("/a.html");
      deck.destroy();
    });

    it("sets src for the next slide (preload) on init", () => {
      const deck = SlideDeck({ slides: ["/a.html", "/b.html", "/c.html"], el: container });
      const slides = container.querySelectorAll<HTMLIFrameElement>(".sd-slide");
      expect(slides[1].getAttribute("src")).toBe("/b.html");
      deck.destroy();
    });

    it("does NOT set src for slides beyond next on init", () => {
      const deck = SlideDeck({ slides: ["/a.html", "/b.html", "/c.html", "/d.html"], el: container });
      const slides = container.querySelectorAll<HTMLIFrameElement>(".sd-slide");
      expect(slides[2].getAttribute("src")).toBeNull();
      expect(slides[3].getAttribute("src")).toBeNull();
      deck.destroy();
    });

    it("sets src for the new next slide after navigation", () => {
      const deck = SlideDeck({ slides: ["/a.html", "/b.html", "/c.html", "/d.html"], el: container });
      deck.next(); // now at 1; should preload index 2
      const slides = container.querySelectorAll<HTMLIFrameElement>(".sd-slide");
      expect(slides[2].getAttribute("src")).toBe("/c.html");
      expect(slides[3].getAttribute("src")).toBeNull();
      deck.destroy();
    });

    it("does NOT reset already-loaded src when navigating back", () => {
      const deck = SlideDeck({ slides: ["/a.html", "/b.html", "/c.html"], el: container });
      const slides = container.querySelectorAll<HTMLIFrameElement>(".sd-slide");
      const originalSrc = slides[0].getAttribute("src");
      deck.next();
      deck.prev();
      expect(slides[0].getAttribute("src")).toBe(originalSrc);
      deck.destroy();
    });
  });

  // ── Opacity / visibility ───────────────────────────────────────────────────

  describe("opacity", () => {
    it("first slide starts with opacity 1", () => {
      const deck = SlideDeck({ slides: ["/a.html", "/b.html", "/c.html"], el: container });
      const slides = container.querySelectorAll<HTMLIFrameElement>(".sd-slide");
      expect(slides[0].style.opacity).toBe("1");
      deck.destroy();
    });

    it("other slides start with opacity 0", () => {
      const deck = SlideDeck({ slides: ["/a.html", "/b.html", "/c.html"], el: container });
      const slides = container.querySelectorAll<HTMLIFrameElement>(".sd-slide");
      expect(slides[1].style.opacity).toBe("0");
      expect(slides[2].style.opacity).toBe("0");
      deck.destroy();
    });

    it("updates opacity after next()", () => {
      const deck = SlideDeck({ slides: ["/a.html", "/b.html", "/c.html"], el: container });
      deck.next();
      const slides = container.querySelectorAll<HTMLIFrameElement>(".sd-slide");
      expect(slides[0].style.opacity).toBe("0");
      expect(slides[1].style.opacity).toBe("1");
      expect(slides[2].style.opacity).toBe("0");
      deck.destroy();
    });
  });

  // ── Navigation API ─────────────────────────────────────────────────────────

  describe("navigation", () => {
    it("current() returns 0 initially", () => {
      const deck = SlideDeck({ slides: ["/a.html", "/b.html"], el: container });
      expect(deck.current()).toBe(0);
      deck.destroy();
    });

    it("next() advances current index", () => {
      const deck = SlideDeck({ slides: ["/a.html", "/b.html", "/c.html"], el: container });
      deck.next();
      expect(deck.current()).toBe(1);
      deck.destroy();
    });

    it("next() is a no-op at last slide", () => {
      const deck = SlideDeck({ slides: ["/a.html", "/b.html"], el: container });
      deck.next();
      deck.next();
      expect(deck.current()).toBe(1);
      deck.destroy();
    });

    it("prev() is a no-op at first slide", () => {
      const deck = SlideDeck({ slides: ["/a.html", "/b.html"], el: container });
      deck.prev();
      expect(deck.current()).toBe(0);
      deck.destroy();
    });

    it("goto() jumps to specified index", () => {
      const deck = SlideDeck({ slides: ["/a.html", "/b.html", "/c.html"], el: container });
      deck.goto(2);
      expect(deck.current()).toBe(2);
      deck.destroy();
    });

    it("goto() is a no-op for out-of-range index", () => {
      const deck = SlideDeck({ slides: ["/a.html", "/b.html"], el: container });
      deck.goto(-1);
      expect(deck.current()).toBe(0);
      deck.goto(5);
      expect(deck.current()).toBe(0);
      deck.destroy();
    });

    it("initializes from the slide search param", () => {
      window.location.href = `${TEST_URL}?slide=2`;

      const deck = SlideDeck({ slides: ["/a.html", "/b.html", "/c.html"], el: container });

      expect(deck.current()).toBe(1);

      const slides = container.querySelectorAll<HTMLIFrameElement>(".sd-slide");
      expect(slides[0].style.opacity).toBe("0");
      expect(slides[1].style.opacity).toBe("1");
      expect(slides[2].style.opacity).toBe("0");
      deck.destroy();
    });

    it("clamps an out-of-range slide search param to the last slide", () => {
      window.location.href = `${TEST_URL}?slide=99`;
      const replaceStateSpy = vi.spyOn(window.history, "replaceState");

      const deck = SlideDeck({ slides: ["/a.html", "/b.html", "/c.html"], el: container });

      expect(deck.current()).toBe(2);
      expect(replaceStateSpy).toHaveBeenLastCalledWith(window.history.state, "", `${TEST_URL}?slide=3`);
      deck.destroy();
    });

    it("updates the slide search param after navigation", () => {
      const replaceStateSpy = vi.spyOn(window.history, "replaceState");
      const deck = SlideDeck({ slides: ["/a.html", "/b.html", "/c.html"], el: container });

      deck.next();
      expect(replaceStateSpy).toHaveBeenLastCalledWith(window.history.state, "", `${TEST_URL}?slide=2`);

      deck.goto(2);
      expect(replaceStateSpy).toHaveBeenLastCalledWith(window.history.state, "", `${TEST_URL}?slide=3`);

      deck.prev();
      expect(replaceStateSpy).toHaveBeenLastCalledWith(window.history.state, "", `${TEST_URL}?slide=2`);

      deck.goto(0);
      expect(replaceStateSpy).toHaveBeenLastCalledWith(window.history.state, "", TEST_URL);
      deck.destroy();
    });

    it("removes an invalid slide search param during initialization", () => {
      window.location.href = `${TEST_URL}?slide=abc&mode=present#intro`;
      const replaceStateSpy = vi.spyOn(window.history, "replaceState");

      const deck = SlideDeck({ slides: ["/a.html", "/b.html"], el: container });

      expect(deck.current()).toBe(0);
      expect(replaceStateSpy).toHaveBeenLastCalledWith(
        window.history.state,
        "",
        `${TEST_URL}?mode=present#intro`,
      );
      deck.destroy();
    });
  });

  // ── Interactions ───────────────────────────────────────────────────────────

  describe("keyboard interaction", () => {
    it("ArrowRight calls next()", () => {
      const deck = SlideDeck({ slides: ["/a.html", "/b.html", "/c.html"], el: container });
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      expect(deck.current()).toBe(1);
      deck.destroy();
    });

    it("ArrowLeft calls prev()", () => {
      const deck = SlideDeck({ slides: ["/a.html", "/b.html", "/c.html"], el: container });
      deck.goto(1);
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
      expect(deck.current()).toBe(0);
      deck.destroy();
    });

    it("Space calls next()", () => {
      const deck = SlideDeck({ slides: ["/a.html", "/b.html"], el: container });
      document.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
      expect(deck.current()).toBe(1);
      deck.destroy();
    });

    it("ArrowDown calls next()", () => {
      const deck = SlideDeck({ slides: ["/a.html", "/b.html"], el: container });
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      expect(deck.current()).toBe(1);
      deck.destroy();
    });

    it("ArrowUp calls prev()", () => {
      const deck = SlideDeck({ slides: ["/a.html", "/b.html"], el: container });
      deck.goto(1);
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
      expect(deck.current()).toBe(0);
      deck.destroy();
    });

    it("keyboard listener is removed after destroy()", () => {
      const deck = SlideDeck({ slides: ["/a.html", "/b.html"], el: container });
      deck.destroy();
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      // No error thrown – just verifying listener was cleaned up
    });

    it("keyboard event on iframe contentDocument also navigates", () => {
      const deck = SlideDeck({ slides: ["/a.html", "/b.html", "/c.html"], el: container });
      const slideIframe = container.querySelector<HTMLIFrameElement>(".sd-slide")!;
      // Simulate the iframe load event so the forwarding listener is attached
      slideIframe.dispatchEvent(new Event("load"));
      // Now fire a keydown on the iframe's contentDocument
      slideIframe.contentDocument!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
      expect(deck.current()).toBe(1);
      deck.destroy();
    });
  });

  describe("touch interaction", () => {
    it("swipe left (deltaX < -50) calls next()", () => {
      const deck = SlideDeck({ slides: ["/a.html", "/b.html"], el: container });
      const deckEl = container.querySelector<HTMLElement>(".sd-deck")!;

      deckEl.dispatchEvent(
        new TouchEvent("touchstart", {
          bubbles: true,
          touches: [new Touch({ identifier: 1, target: deckEl, clientX: 300, clientY: 0 })],
        }),
      );
      deckEl.dispatchEvent(
        new TouchEvent("touchend", {
          bubbles: true,
          changedTouches: [new Touch({ identifier: 1, target: deckEl, clientX: 200, clientY: 0 })],
        }),
      );

      expect(deck.current()).toBe(1);
      deck.destroy();
    });

    it("swipe right (deltaX > 50) calls prev()", () => {
      const deck = SlideDeck({ slides: ["/a.html", "/b.html"], el: container });
      deck.goto(1);
      const deckEl = container.querySelector<HTMLElement>(".sd-deck")!;

      deckEl.dispatchEvent(
        new TouchEvent("touchstart", {
          bubbles: true,
          touches: [new Touch({ identifier: 1, target: deckEl, clientX: 200, clientY: 0 })],
        }),
      );
      deckEl.dispatchEvent(
        new TouchEvent("touchend", {
          bubbles: true,
          changedTouches: [new Touch({ identifier: 1, target: deckEl, clientX: 300, clientY: 0 })],
        }),
      );

      expect(deck.current()).toBe(0);
      deck.destroy();
    });

    it("swipe shorter than 50px does nothing", () => {
      const deck = SlideDeck({ slides: ["/a.html", "/b.html"], el: container });
      const deckEl = container.querySelector<HTMLElement>(".sd-deck")!;

      deckEl.dispatchEvent(
        new TouchEvent("touchstart", {
          bubbles: true,
          touches: [new Touch({ identifier: 1, target: deckEl, clientX: 200, clientY: 0 })],
        }),
      );
      deckEl.dispatchEvent(
        new TouchEvent("touchend", {
          bubbles: true,
          changedTouches: [new Touch({ identifier: 1, target: deckEl, clientX: 170, clientY: 0 })],
        }),
      );

      expect(deck.current()).toBe(0);
      deck.destroy();
    });
  });

  // ── destroy ────────────────────────────────────────────────────────────────

  describe("destroy", () => {
    it("removes .sd-deck from the container", () => {
      const deck = SlideDeck({ slides: ["/a.html"], el: container });
      deck.destroy();
      expect(container.querySelector(".sd-deck")).toBeNull();
    });
  });
});
