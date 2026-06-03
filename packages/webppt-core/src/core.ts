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
  let currentIndex = 0;

  const debugEnabled = true;
  const debug = (...args: unknown[]): void => {
    if (!debugEnabled) return;
    console.log("[webppt-debug]", ...args);
  };

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
