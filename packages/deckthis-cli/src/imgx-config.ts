import type { AppConfig, Provider } from "./imgx-types";

function getSetupGuide(): string {
  return [
    "Please add the following environment variables to your profile file (for example: ~/.zshrc), then reload it and run the command again.",
    "",
    "After editing your profile, run:",
    "source ~/.zshrc",
    "",
    "OpenAI:",
    'export DECKTHIS_IMG_PROVIDER="openai"',
    'export DECKTHIS_IMG_BASE_URL="https://api.openai.com/v1"',
    'export DECKTHIS_IMG_API_KEY="<your-openai-api-key>"',
    'export DECKTHIS_IMG_MODEL="gpt-image-1"',
    "",
    "Azure:",
    'export DECKTHIS_IMG_PROVIDER="azure"',
    'export DECKTHIS_IMG_BASE_URL="https://<resource>.cognitiveservices.azure.com"',
    'export DECKTHIS_IMG_API_KEY="<your-azure-openai-key>"',
    'export DECKTHIS_IMG_MODEL="gpt-image-2"',
    'export DECKTHIS_IMG_DEPLOYMENT="gpt-image-2"',
    'export DECKTHIS_IMG_API_VERSION="2025-04-01-preview"',
  ].join("\n");
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}\n\n${getSetupGuide()}`);
  }
  return value;
}

function getProvider(): Provider {
  const provider = requireEnv("DECKTHIS_IMG_PROVIDER");
  if (provider !== "openai" && provider !== "azure") {
    throw new Error(`Unsupported DECKTHIS_IMG_PROVIDER: ${provider}\n\n${getSetupGuide()}`);
  }
  return provider;
}

export function loadImgxConfig(): AppConfig {
  const provider = getProvider();
  const baseUrl = requireEnv("DECKTHIS_IMG_BASE_URL").replace(/\/$/, "");
  const apiKey = requireEnv("DECKTHIS_IMG_API_KEY");
  const model = requireEnv("DECKTHIS_IMG_MODEL");

  if (provider === "openai") {
    return {
      provider,
      baseUrl,
      apiKey,
      model,
    };
  }

  return {
    provider,
    baseUrl,
    apiKey,
    model,
    deployment: requireEnv("DECKTHIS_IMG_DEPLOYMENT"),
    apiVersion: process.env.DECKTHIS_IMG_API_VERSION?.trim() || "2025-04-01-preview",
  };
}
