# deckthis — monorepo

This is the development monorepo for [deckthis](packages/deckthis-cli/README.md), a tool for building presentations with plain HTML files.

## Packages

| Package | Description |
| ------- | ----------- |
| [`deckthis`](packages/deckthis-cli) | CLI + dev server — the published npm package |
| [`deckthis-core`](packages/deckthis-core) | Browser runtime (SlideDeck) — bundled into deckthis, not published separately |

## Development

```bash
pnpm install

# Build browser runtime (required before first run or after editing core)
pnpm build:core

# Run all tests
pnpm test
```
