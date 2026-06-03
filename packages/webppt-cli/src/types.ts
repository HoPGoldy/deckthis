export type BeforeEachContext = {
  /** Filename relative to the folder, e.g. "01.html" */
  filename: string;
  /** Absolute path to the file on disk */
  filepath: string;
};

export type BeforeEachFn = (html: string, ctx: BeforeEachContext) => string | Promise<string>;

export interface WebPPTConfig {
  /** Controls slide order. Receives auto-discovered slides, returns the final ordered list. */
  order?: (discovered: string[]) => string[];
  /** Underlay iframe URL. Auto-detected as /_underlay.html if omitted. */
  underlay?: string;
  /** Overlay iframe URL. Auto-detected as /_overlay.html if omitted. */
  overlay?: string;
  /** Absolute paths to extra files served as static assets (basename → URL). */
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
export function defineConfig(config: WebPPTConfig): WebPPTConfig {
  return config;
}
