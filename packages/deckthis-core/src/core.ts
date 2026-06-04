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

const SLIDE_SEARCH_PARAM = "slide";

function getInitialSlideIndex(slideCount: number): number {
  const raw = new URLSearchParams(window.location.search).get(SLIDE_SEARCH_PARAM);
  const parsed = Number.parseInt(raw ?? "", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 0;
  }

  return Math.min(parsed - 1, Math.max(slideCount - 1, 0));
}

function syncSlideIndexToUrl(index: number): void {
  const url = new URL(window.location.href);

  if (index <= 0) {
    url.searchParams.delete(SLIDE_SEARCH_PARAM);
  } else {
    url.searchParams.set(SLIDE_SEARCH_PARAM, String(index + 1));
  }

  window.history.replaceState(window.history.state, "", url.toString());
}

/**
 * Collects all `deckthis:*` meta tags from a slide iframe as a key-value object.
 * Falls back to `<title>` for the `title` key if no `deckthis:title` meta is present.
 */
export function collectSlideData(iframe: HTMLIFrameElement): Record<string, string> {
  const doc = iframe.contentDocument;
  if (!doc) return {};

  const PREFIX = "deckthis:";
  const data: Record<string, string> = {};

  doc.querySelectorAll<HTMLMetaElement>(`meta[name^="${PREFIX}"]`).forEach((el) => {
    const key = el.getAttribute("name")!.slice(PREFIX.length);
    data[key] = el.getAttribute("content") ?? "";
  });

  if (!data.title && doc.title) {
    data.title = doc.title;
  }

  return data;
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
  let underlayEl: HTMLIFrameElement | null = null;
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
    underlayEl = el;
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
      pointerEvents: "none",
    });
    deckEl.appendChild(iframe);
    return iframe;
  });

  // ── Overlay ───────────────────────────────────────────────────────────────
  let overlayEl: HTMLIFrameElement | null = null;
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
      pointerEvents: "none",
    });
    deckEl.appendChild(el);
    overlayEl = el;
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
      iframe.style.pointerEvents = i === index ? "auto" : "none";
    });
  }

  function preload(index: number): void {
    setSrcIfNeeded(index - 1);
    setSrcIfNeeded(index);
    setSrcIfNeeded(index + 1);
  }

  // ── State ─────────────────────────────────────────────────────────────────
  let currentIndex = getInitialSlideIndex(slides.length);

  const debugEnabled = true;
  const debug = (...args: unknown[]): void => {
    if (!debugEnabled) return;
    console.log("[deckthis-debug]", ...args);
  };

  function broadcastSlideChange(index: number, iframe: HTMLIFrameElement): void {
    const data = collectSlideData(iframe);
    const msg = { type: "deckthis:slide-change", ...data, current: index + 1, total: slides.length };
    debug("broadcastSlideChange", {
      index,
      data,
      hasOverlay: !!overlayEl,
      overlayContentWindow: !!overlayEl?.contentWindow,
      hasUnderlay: !!underlayEl,
    });
    overlayEl?.contentWindow?.postMessage(msg, "*");
    underlayEl?.contentWindow?.postMessage(msg, "*");
  }

  function goto(index: number): void {
    if (index < 0 || index >= slides.length) {
      debug("goto blocked", {
        currentIndex,
        requestedIndex: index,
        slideCount: slides.length,
      });
      return;
    }

    debug("goto", {
      from: currentIndex,
      to: index,
      url: slides[index],
    });

    currentIndex = index;
    showSlide(currentIndex);
    preload(currentIndex);
    syncSlideIndexToUrl(currentIndex);

    // Broadcast slide metadata to overlay / underlay
    const iframe = slideEls[index];
    if (iframe.contentDocument?.readyState === "complete") {
      broadcastSlideChange(index, iframe);
    } else {
      iframe.addEventListener("load", () => broadcastSlideChange(index, iframe), { once: true });
    }
  }

  // ── Keyboard handler (attached to any document that has focus) ───────────
  function describeActiveElement(doc: Document): string {
    const el = doc.activeElement;
    if (!el) return "none";
    const id = el.id ? `#${el.id}` : "";
    const cls = el.className && typeof el.className === "string" ? `.${el.className}` : "";
    return `${el.tagName}${id}${cls}`;
  }

  function handleKeydown(e: KeyboardEvent): void {
    debug("keydown", {
      key: e.key,
      repeat: e.repeat,
      targetTag: (e.target as Element | null)?.tagName,
      defaultPreventedBefore: e.defaultPrevented,
      currentIndex,
      shellActiveElement: describeActiveElement(document),
    });

    if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
      e.preventDefault();
      debug("navigate next", { from: currentIndex, to: currentIndex + 1 });
      goto(currentIndex + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      debug("navigate prev", { from: currentIndex, to: currentIndex - 1 });
      goto(currentIndex - 1);
    } else {
      debug("keydown ignored", { key: e.key });
    }
  }

  // Attach to the shell document
  document.addEventListener("keydown", handleKeydown, { signal });
  document.addEventListener(
    "keydown",
    (e: KeyboardEvent) => {
      debug("keydown capture(shell)", {
        key: e.key,
        targetTag: (e.target as Element | null)?.tagName,
        defaultPrevented: e.defaultPrevented,
        shellActiveElement: describeActiveElement(document),
        hasFocus: document.hasFocus(),
        visibilityState: document.visibilityState,
      });
    },
    { signal, capture: true },
  );

  window.addEventListener(
    "focus",
    () => {
      debug("window focus", {
        shellActiveElement: describeActiveElement(document),
        hasFocus: document.hasFocus(),
        visibilityState: document.visibilityState,
      });
    },
    { signal },
  );

  window.addEventListener(
    "blur",
    () => {
      debug("window blur", {
        shellActiveElement: describeActiveElement(document),
        hasFocus: document.hasFocus(),
        visibilityState: document.visibilityState,
      });
    },
    { signal },
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      debug("visibilitychange", {
        visibilityState: document.visibilityState,
        shellActiveElement: describeActiveElement(document),
      });
    },
    { signal },
  );

  document.addEventListener(
    "focusin",
    (e: FocusEvent) => {
      debug("focusin(shell)", {
        targetTag: (e.target as Element | null)?.tagName,
        shellActiveElement: describeActiveElement(document),
      });
    },
    { signal },
  );

  document.addEventListener(
    "focusout",
    (e: FocusEvent) => {
      debug("focusout(shell)", {
        targetTag: (e.target as Element | null)?.tagName,
        shellActiveElement: describeActiveElement(document),
      });
    },
    { signal },
  );

  debug("keydown listener attached", { scope: "shell-document" });

  // Forward keyboard events from each slide iframe's document (same-origin).
  // The load listener must be registered BEFORE src is set so we never miss the event.
  slideEls.forEach((iframe) => {
    iframe.addEventListener(
      "load",
      () => {
        try {
          debug("iframe load", {
            src: iframe.getAttribute("src"),
            shellActiveElement: describeActiveElement(document),
          });

          iframe.addEventListener(
            "focus",
            () => {
              debug("iframe focus", {
                src: iframe.getAttribute("src"),
                shellActiveElement: describeActiveElement(document),
              });
            },
            { signal },
          );

          iframe.contentWindow?.addEventListener(
            "focus",
            () => {
              debug("iframe window focus", {
                src: iframe.getAttribute("src"),
              });
            },
            { signal },
          );

          iframe.contentDocument?.addEventListener(
            "focusin",
            (e: FocusEvent) => {
              debug("focusin(iframe-doc)", {
                src: iframe.getAttribute("src"),
                targetTag: (e.target as Element | null)?.tagName,
                iframeActiveElement: describeActiveElement(iframe.contentDocument as Document),
              });
            },
            { signal },
          );

          iframe.contentDocument?.addEventListener(
            "keydown",
            (e: KeyboardEvent) => {
              debug("keydown capture(iframe-doc)", {
                src: iframe.getAttribute("src"),
                key: e.key,
                targetTag: (e.target as Element | null)?.tagName,
                defaultPrevented: e.defaultPrevented,
                iframeActiveElement: describeActiveElement(iframe.contentDocument as Document),
              });
            },
            { signal, capture: true },
          );

          iframe.contentDocument?.addEventListener("keydown", handleKeydown, { signal });
          debug("keydown listener attached", {
            scope: "slide-iframe-document",
            src: iframe.getAttribute("src"),
          });
        } catch {
          // cross-origin frame – skip
          debug("keydown listener attach failed", {
            scope: "slide-iframe-document",
            src: iframe.getAttribute("src"),
            reason: "cross-origin",
          });
        }
      },
      { signal },
    );
  });

  // Initial setup – must come AFTER load listeners so we don't miss the load event
  preload(currentIndex);
  showSlide(currentIndex);
  syncSlideIndexToUrl(currentIndex);

  // When overlay first loads, send current slide data (covers initial page load)
  overlayEl?.addEventListener(
    "load",
    () => {
      const iframe = slideEls[currentIndex];
      if (iframe.contentDocument?.readyState === "complete") {
        broadcastSlideChange(currentIndex, iframe);
      } else {
        iframe.addEventListener("load", () => broadcastSlideChange(currentIndex, iframe), {
          once: true,
        });
      }
    },
    { signal, once: true },
  );

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
