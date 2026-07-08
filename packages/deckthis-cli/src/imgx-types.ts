export type Provider = "openai" | "azure";

export const SUPPORTED_SIZES = ["1024x1024", "1792x1024", "1024x1792"] as const;

export type SupportedSize = (typeof SUPPORTED_SIZES)[number];

export interface AppConfig {
  provider: Provider;
  baseUrl: string;
  apiKey: string;
  model: string;
  deployment?: string;
  apiVersion?: string;
}

export interface CommandOptions {
  size: SupportedSize;
  outPath?: string;
}

export interface ImageResult {
  bytes: Buffer;
}
