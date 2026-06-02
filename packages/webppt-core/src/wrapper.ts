import { SlideDeck } from "./core.js";

/** Exported for testing. Called automatically at module load (IIFE). */
export async function init(): Promise<void> {
  const resp = await fetch("/__webppt/config");
  const config = await resp.json();
  SlideDeck(config);
}

// Auto-execute when loaded as IIFE in the browser
init();
