export type BeforeEachContext = {
  /** Filename relative to the folder, e.g. "01.html" */
  filename: string;
  /** Absolute path to the file on disk */
  filepath: string;
};

export type BeforeEachFn = (html: string, ctx: BeforeEachContext) => string | Promise<string>;

export interface DeckthisConfig {
  /** Controls slide order. Receives auto-discovered slides, returns the final ordered list. */
  order?: (discovered: string[]) => string[];
  /** Underlay iframe URL. Auto-detected as /_underlay.html if omitted. */
  underlay?: string;
  /** Overlay iframe URL. Auto-detected as /_overlay.html if omitted. */
  overlay?: string;
  /** Default export viewport. CLI --width/--height take precedence over these values. */
  export?: {
    width?: number;
    height?: number;
    /** Delay before screenshot capture in milliseconds. CLI --wait takes precedence. */
    wait?: number;
  };
  /** Absolute paths to extra directories used as static asset fallbacks. */
  assets?: string[];
  /** Transform each slide's HTML before serving. Not applied to overlay/underlay. */
  beforeEach?: BeforeEachFn;
}

/** Resolved config passed to the browser (slides list is fully resolved). */
export interface ResolvedConfig {
  slides: string[];
  underlay?: string;
  overlay?: string;
}

/** Identity function that provides TypeScript type inference for config objects. */
export function defineConfig(config: DeckthisConfig): DeckthisConfig {
  return config;
}

/**
 * Returns the absolute path of the deck folder being served.
 * Only valid when called inside a deckthis.config.ts file loaded by deckthis.
 */
export function getDeckDir(): string {
  const dir = process.env.DECKTHIS_DECK_DIR;
  if (!dir) throw new Error("[deckthis] getDeckDir() must be called inside a deckthis config file.");
  return dir;
}
