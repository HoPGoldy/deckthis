export interface WebPPTConfig {
  /** Explicit slide file order (filenames relative to the content folder). */
  order?: string[];
  /** Underlay iframe URL. Auto-detected as /_underlay.html if omitted. */
  underlay?: string;
  /** Overlay iframe URL. Auto-detected as /_overlay.html if omitted. */
  overlay?: string;
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
