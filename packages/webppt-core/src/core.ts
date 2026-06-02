export interface SlideDeckOptions {
  /** Mount element. Defaults to document.body. */
  el?: string | HTMLElement;
  /** Ordered list of slide URLs. */
  slides: string[];
  /** Optional underlay iframe URL. */
  underlay?: string;
  /** Optional overlay iframe URL. */
  overlay?: string;
}

export interface SlideDeckInstance {
  next(): void;
  prev(): void;
  goto(index: number): void;
  current(): number;
  destroy(): void;
}

export function SlideDeck(options: SlideDeckOptions): SlideDeckInstance {
  const { slides, underlay, overlay } = options;

  // ── Resolve container ────────────────────────────────────────────────────
  let container: HTMLElement;
  if (!options.el) {
    container = document.body;
  } else if (typeof options.el === "string") {
    const found = document.querySelector<HTMLElement>(options.el);
    if (!found) throw new Error(`SlideDeck: element "${options.el}" not found`);
    container = found;
  } else {
    container = options.el;
  }

  // ── AbortController for cleanup ──────────────────────────────────────────
  const abortCtrl = new AbortController();
  const { signal } = abortCtrl;

  // ── Build deck element ───────────────────────────────────────────────────
  const deckEl = document.createElement("div");
  deckEl.className = "sd-deck";
  Object.assign(deckEl.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
  });

  // ── Underlay ─────────────────────────────────────────────────────────────
  if (underlay) {
    const el = document.createElement("iframe");
    el.className = "sd-underlay";
    el.setAttribute("src", underlay);
    Object.assign(el.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      border: "none",
      zIndex: "0",
      pointerEvents: "none",
    });
    deckEl.appendChild(el);
  }

  // ── Slide iframes ─────────────────────────────────────────────────────────
  const slideEls = slides.map(() => {
    const iframe = document.createElement("iframe");
    iframe.className = "sd-slide";
    Object.assign(iframe.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      border: "none",
      zIndex: "1",
      opacity: "0",
      transition: "opacity 200ms",
    });
    deckEl.appendChild(iframe);
    return iframe;
  });

  // ── Overlay ───────────────────────────────────────────────────────────────
  if (overlay) {
    const el = document.createElement("iframe");
    el.className = "sd-overlay";
    el.setAttribute("src", overlay);
    Object.assign(el.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      border: "none",
      zIndex: "10",
    });
    deckEl.appendChild(el);
  }

  container.appendChild(deckEl);

  // ── Src management ────────────────────────────────────────────────────────
  const loadedIndices = new Set<number>();

  function setSrcIfNeeded(index: number): void {
    if (index < 0 || index >= slides.length) return;
    if (loadedIndices.has(index)) return;
    loadedIndices.add(index);
    slideEls[index].setAttribute("src", slides[index]);
  }

  function showSlide(index: number): void {
    slideEls.forEach((iframe, i) => {
      iframe.style.opacity = i === index ? "1" : "0";
    });
  }

  function preload(index: number): void {
    setSrcIfNeeded(index - 1);
    setSrcIfNeeded(index);
    setSrcIfNeeded(index + 1);
  }

  // ── State ─────────────────────────────────────────────────────────────────
  let currentIndex = 0;

  function goto(index: number): void {
    if (index < 0 || index >= slides.length) return;
    currentIndex = index;
    showSlide(currentIndex);
    preload(currentIndex);
  }

  // ── Keyboard handler (attached to any document that has focus) ───────────
  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
      e.preventDefault();
      goto(currentIndex + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      goto(currentIndex - 1);
    }
  }

  // Attach to the shell document
  document.addEventListener("keydown", handleKeydown, { signal });

  // Forward keyboard events from each slide iframe's document (same-origin).
  // The load listener must be registered BEFORE src is set so we never miss the event.
  slideEls.forEach((iframe) => {
    iframe.addEventListener(
      "load",
      () => {
        try {
          iframe.contentDocument?.addEventListener("keydown", handleKeydown, { signal });
        } catch {
          // cross-origin frame – skip
        }
      },
      { signal },
    );
  });

  // Initial setup – must come AFTER load listeners so we don't miss the load event
  preload(0);
  showSlide(0);

  // ── Touch swipe (threshold 50px) ──────────────────────────────────────────
  let touchStartX = 0;

  deckEl.addEventListener(
    "touchstart",
    (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    },
    { signal, passive: true } as AddEventListenerOptions,
  );

  deckEl.addEventListener(
    "touchend",
    (e: TouchEvent) => {
      const deltaX = e.changedTouches[0].clientX - touchStartX;
      if (deltaX < -50) {
        goto(currentIndex + 1);
      } else if (deltaX > 50) {
        goto(currentIndex - 1);
      }
    },
    { signal },
  );

  // ── Public API ────────────────────────────────────────────────────────────
  return {
    next() {
      goto(currentIndex + 1);
    },
    prev() {
      goto(currentIndex - 1);
    },
    goto,
    current() {
      return currentIndex;
    },
    destroy() {
      abortCtrl.abort();
      deckEl.parentElement?.removeChild(deckEl);
    },
  };
}
