# deckthis

Write presentations as plain HTML files. Each slide is a standalone `.html` file — no framework, no build step, just open your editor.

**[中文文档 →](README.zh.md)**

## Installation

```bash
npm install -g deckthis
```

Or run without installing:

```bash
npx deckthis <folder>
```

## Quick Start

1. Create a folder and add slide HTML files:

```
my-talk/
  01.html
  02.html
  03.html
```

2. Start the dev server:

```bash
deckthis my-talk
```

3. Open `http://localhost:39200` in your browser.

Slides are served in alphabetical filename order. Edit any file and the browser reloads automatically.

## Navigation

| Input               | Action         |
| ------------------- | -------------- |
| `→` / `↓` / `Space` | Next slide     |
| `←` / `↑`           | Previous slide |
| Swipe left/right    | Mobile nav     |

## Deck Folder Structure

```
my-talk/
  01.html              # Slides — discovered alphabetically
  02.html
  03.html
  _overlay.html        # Foreground layer (page numbers, logo…) — optional
  _underlay.html       # Background decoration layer — optional
  deckthis.config.ts   # Config file — optional
```

- Files prefixed with `_` are excluded from the slide list and used as overlay / underlay.
- The config file is named `deckthis.config.ts` and uses `defineConfig` for type safety.

## Configuration (`deckthis.config.ts`)

```ts
import { defineConfig } from "deckthis";

export default defineConfig({
  // Control slide order — receives the auto-discovered list, returns the final order
  order: (discovered) => {
    const intro = discovered.find((s) => s === "/intro.html");
    const rest = discovered.filter((s) => s !== "/intro.html");
    return intro ? [intro, ...rest] : discovered;
  },

  // Extra static asset directories (absolute paths, searched in order after the deck folder)
  assets: ["/path/to/theme-assets"],

  // Transform each slide's HTML before it is served (not applied to overlay/underlay)
  beforeEach: (html, ctx) => {
    return html.replace("</head>", '<link rel="stylesheet" href="/theme.css"></head>');
  },

  // Explicitly set overlay / underlay (defaults to auto-detecting _overlay.html / _underlay.html)
  overlay: "/_overlay.html",
  underlay: "/_underlay.html",
});
```

### Config Reference

| Field        | Type                                       | Description                                                   |
| ------------ | ------------------------------------------ | ------------------------------------------------------------- |
| `order`      | `(discovered: string[]) => string[]`       | Customize slide order; can insert plugin-provided extra pages |
| `assets`     | `string[]`                                 | Absolute directory paths for static asset fallback lookup     |
| `beforeEach` | `(html, ctx) => string \| Promise<string>` | Transform a slide's HTML before serving                       |
| `overlay`    | `string`                                   | Foreground iframe URL; auto-detected from `_overlay.html`     |
| `underlay`   | `string`                                   | Background iframe URL; auto-detected from `_underlay.html`    |

## Overlay & Underlay

`_overlay.html` sits above all slides (pointer-events disabled by default), `_underlay.html` sits below.

On every slide change, deckthis broadcasts a `postMessage` to both frames:

```ts
window.addEventListener("message", (e) => {
  if (e.data?.type !== "deckthis:slide-change") return;
  const { current, total, title } = e.data;
  // current: 1-based slide number
  // total: total slide count
  // title: from <meta name="deckthis:title"> or <title>
});
```

Add metadata to any slide:

```html
<meta name="deckthis:title" content="Introduction" /> <meta name="deckthis:section" content="01" />
```

## Plugins

A plugin is a plain function that wraps user config and returns a merged config:

```ts
// _plugin/my-theme.ts
import type { DeckthisConfig } from "deckthis";

export function myTheme(userConfig: DeckthisConfig = {}): DeckthisConfig {
  return {
    overlay: "/_plugin/overlay.html",
    assets: ["/path/to/_plugin"],
    order: (discovered) => [
      "/_plugin/cover.html",
      ...(userConfig.order ? userConfig.order(discovered) : discovered),
      "/_plugin/thanks.html",
    ],
    beforeEach: async (html, ctx) => {
      const base = userConfig.beforeEach ? await userConfig.beforeEach(html, ctx) : html;
      return base.replace("</head>", '<link rel="stylesheet" href="/_plugin/theme.css"></head>');
    },
  };
}
```

```ts
// deckthis.config.ts
import { myTheme } from "./_plugin/my-theme";

export default myTheme({
  // pass your own config; the plugin wraps it
});
```

**Plugin conventions:**

- Place plugin files under a `_`-prefixed directory (e.g. `_plugin/`) so they are not treated as slides.
- Plugins are pure functions — they only transform config, with no knowledge of deckthis internals.
- When wrapping `order` or `beforeEach`, call the user's version first, then apply plugin logic.

## CLI Commands

```bash
deckthis <folder>              # Start dev server (default port 39200)
deckthis <folder> --port 3000  # Use a custom port

deckthis demo list             # List built-in demos
deckthis demo <name>           # Copy a demo to the current directory

deckthis skill                 # Copy the AI coding skill to a skills directory

deckthis export <folder>                        # Export to PPTX (presentation.pptx)
deckthis export <folder> -o my-talk.pptx        # Custom output path
deckthis export <folder> --width 1920 --height 1080  # Viewport size (default: 1920×1080)
deckthis export <folder> --scale 2              # Higher resolution screenshots
deckthis export <folder> --wait 3000            # Wait longer before each screenshot
```

### Exporting to PPTX

The `export` command captures each slide at full resolution and packages them into a `.pptx` file. Each slide becomes a full-bleed image in the deck, preserving your CSS, fonts, and all three rendering layers (underlay + slide + overlay).

`export` requires `playwright-chromium` to be installed in your project. Install it once:

```bash
npm install -D playwright-chromium
npx playwright install chromium
```

Then export:

```bash
deckthis export my-talk -o my-talk.pptx
```

You can tune export timing with `--wait <ms>` when a deck needs extra time for CSS transitions or delayed overlay updates. The default is `1500`, so you usually do not need to set it explicitly.

You can also provide default export settings in `deckthis.config.ts`:

```ts
import { defineConfig } from "deckthis";

export default defineConfig({
  export: {
    width: 1504,
    height: 831,
    wait: 3000,
  },
});
```

CLI flags take precedence over `config.export`.

## `getDeckDir()`

Inside `deckthis.config.ts`, call `getDeckDir()` to get the absolute path of the deck folder. Useful for constructing asset paths dynamically:

```ts
import { defineConfig, getDeckDir } from "deckthis";
import path from "node:path";

export default defineConfig({
  assets: [path.join(getDeckDir(), "_assets")],
});
```

## Examples

After installing, copy and run the built-in demos:

```bash
deckthis demo basic        # Three slides, minimal setup
deckthis demo with-config  # Demonstrates all defineConfig options
deckthis demo with-plugin  # Demonstrates the plugin pattern
cd basic && deckthis .
```

## Development (monorepo)

```bash
pnpm install

# Build the browser runtime (required before first run or after editing core)
pnpm build:core

# Run all tests
pnpm test

# Run tests for a specific package
pnpm test:core
pnpm test:cli
```

## Project Structure

```
packages/
  deckthis-core/          # Browser runtime (SlideDeck)
    src/core.ts           # iframe layout, keyboard/touch navigation, overlay/underlay
    src/wrapper.ts        # IIFE entry — fetches /__deckthis/config and initialises SlideDeck
  deckthis-cli/           # Dev server + CLI
    src/cli.ts            # CLI entry, port management, file-watch restart
    src/dev-server.ts     # Hono server, SSE hot-reload, assets/beforeEach pipeline
    src/load-config.ts    # Loads deckthis.config.ts via dynamic import
    src/types.ts          # DeckthisConfig, defineConfig, getDeckDir
```
