/**
 * Child process entry point for the export command.
 *
 * Spawned by cli.ts with:
 *   node --import tsx/esm dist/export-worker.js --folder <path> --output <path> [--width N] [--height N] [--scale N]
 *
 * tsx/esm registers a Node.js loader hook so that dynamic import() of .ts config
 * files works natively (e.g. deckthis.config.ts).
 */
import { exportToPptx } from "./export.js";

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = args.indexOf(name);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const folder = getArg("--folder");
const output = getArg("--output");

if (!folder || !output) {
  console.error("[deckthis] export-worker: missing --folder or --output");
  process.exit(1);
}

const width = getArg("--width");
const height = getArg("--height");
const scale = getArg("--scale");

await exportToPptx({
  folder,
  output,
  width: width ? parseInt(width, 10) : undefined,
  height: height ? parseInt(height, 10) : undefined,
  scale: scale ? parseFloat(scale) : undefined,
});
