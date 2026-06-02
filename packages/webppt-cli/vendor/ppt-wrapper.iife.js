"use strict";
var __webpptWrapper = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/wrapper.ts
  var wrapper_exports = {};
  __export(wrapper_exports, {
    init: () => init
  });

  // src/core.ts
  function SlideDeck(options) {
    const { slides, underlay, overlay } = options;
    let container;
    if (!options.el) {
      container = document.body;
    } else if (typeof options.el === "string") {
      const found = document.querySelector(options.el);
      if (!found) throw new Error(`SlideDeck: element "${options.el}" not found`);
      container = found;
    } else {
      container = options.el;
    }
    const abortCtrl = new AbortController();
    const { signal } = abortCtrl;
    const deckEl = document.createElement("div");
    deckEl.className = "sd-deck";
    Object.assign(deckEl.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%"
    });
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
        pointerEvents: "none"
      });
      deckEl.appendChild(el);
    }
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
        transition: "opacity 200ms"
      });
      deckEl.appendChild(iframe);
      return iframe;
    });
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
        zIndex: "10"
      });
      deckEl.appendChild(el);
    }
    container.appendChild(deckEl);
    const loadedIndices = /* @__PURE__ */ new Set();
    function setSrcIfNeeded(index) {
      if (index < 0 || index >= slides.length) return;
      if (loadedIndices.has(index)) return;
      loadedIndices.add(index);
      slideEls[index].setAttribute("src", slides[index]);
    }
    function showSlide(index) {
      slideEls.forEach((iframe, i) => {
        iframe.style.opacity = i === index ? "1" : "0";
      });
    }
    function preload(index) {
      setSrcIfNeeded(index - 1);
      setSrcIfNeeded(index);
      setSrcIfNeeded(index + 1);
    }
    let currentIndex = 0;
    function goto(index) {
      if (index < 0 || index >= slides.length) return;
      currentIndex = index;
      showSlide(currentIndex);
      preload(currentIndex);
    }
    function handleKeydown(e) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        goto(currentIndex + 1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goto(currentIndex - 1);
      }
    }
    document.addEventListener("keydown", handleKeydown, { signal });
    slideEls.forEach((iframe) => {
      iframe.addEventListener(
        "load",
        () => {
          try {
            iframe.contentDocument?.addEventListener("keydown", handleKeydown, { signal });
          } catch {
          }
        },
        { signal }
      );
    });
    preload(0);
    showSlide(0);
    let touchStartX = 0;
    deckEl.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.touches[0].clientX;
      },
      { signal, passive: true }
    );
    deckEl.addEventListener(
      "touchend",
      (e) => {
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        if (deltaX < -50) {
          goto(currentIndex + 1);
        } else if (deltaX > 50) {
          goto(currentIndex - 1);
        }
      },
      { signal }
    );
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
      }
    };
  }

  // src/wrapper.ts
  async function init() {
    const resp = await fetch("/__webppt/config");
    const config = await resp.json();
    SlideDeck(config);
  }
  init();
  return __toCommonJS(wrapper_exports);
})();
