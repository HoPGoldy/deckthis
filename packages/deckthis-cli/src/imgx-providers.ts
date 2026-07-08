import fs from "node:fs";
import path from "node:path";

import type { AppConfig, ImageResult, SupportedSize } from "./imgx-types";

interface ImageApiResponse {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
}

function buildOpenAiUrl(baseUrl: string, action: "generations" | "edits"): string {
  return `${baseUrl}/images/${action}`;
}

function buildAzureUrl(config: AppConfig, action: "generations" | "edits"): string {
  return `${config.baseUrl}/openai/deployments/${config.deployment}/images/${action}?api-version=${config.apiVersion}`;
}

async function parseImageResponse(response: Response): Promise<ImageResult> {
  const json = (await response.json()) as ImageApiResponse;
  const first = json.data?.[0];

  if (first?.b64_json) {
    return { bytes: Buffer.from(first.b64_json, "base64") };
  }

  if (first?.url) {
    const imageResponse = await fetch(first.url);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image URL: ${imageResponse.status}`);
    }
    return { bytes: Buffer.from(await imageResponse.arrayBuffer()) };
  }

  throw new Error(`Image response did not contain b64_json or url: ${JSON.stringify(json)}`);
}

async function throwApiError(
  response: Response,
  details: Record<string, string | undefined>,
): Promise<never> {
  const body = await response.text();
  const lines = [
    "Image request failed",
    `provider: ${details.provider}`,
    `endpoint: ${details.endpoint}`,
    `status: ${response.status}`,
  ];

  if (details.deployment) {
    lines.push(`deployment: ${details.deployment}`);
  }

  if (details.apiVersion) {
    lines.push(`apiVersion: ${details.apiVersion}`);
  }

  lines.push(`message: ${body}`);
  throw new Error(lines.join("\n"));
}

export async function generateImage(
  config: AppConfig,
  prompt: string,
  size: SupportedSize,
): Promise<ImageResult> {
  if (config.provider === "openai") {
    const endpoint = buildOpenAiUrl(config.baseUrl, "generations");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        prompt,
        size,
      }),
    });

    if (!response.ok) {
      await throwApiError(response, {
        provider: config.provider,
        endpoint,
      });
    }

    return parseImageResponse(response);
  }

  const endpoint = buildAzureUrl(config, "generations");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "api-key": config.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      n: 1,
      size,
      output_format: "png",
    }),
  });

  if (!response.ok) {
    await throwApiError(response, {
      provider: config.provider,
      endpoint,
      deployment: config.deployment,
      apiVersion: config.apiVersion,
    });
  }

  return parseImageResponse(response);
}

export async function editImage(
  config: AppConfig,
  imagePath: string,
  prompt: string,
  size: SupportedSize,
): Promise<ImageResult> {
  const imageBytes = fs.readFileSync(imagePath);
  const imageName = path.basename(imagePath);

  if (config.provider === "openai") {
    const endpoint = buildOpenAiUrl(config.baseUrl, "edits");
    const form = new FormData();
    form.append("model", config.model);
    form.append("prompt", prompt);
    form.append("size", size);
    form.append("image", new Blob([imageBytes], { type: "image/png" }), imageName);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: form,
    });

    if (!response.ok) {
      await throwApiError(response, {
        provider: config.provider,
        endpoint,
      });
    }

    return parseImageResponse(response);
  }

  const endpoint = buildAzureUrl(config, "edits");
  const form = new FormData();
  form.append("image", new Blob([imageBytes], { type: "image/png" }), imageName);
  form.append("prompt", prompt);
  form.append("n", "1");
  form.append("size", size);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "api-key": config.apiKey,
    },
    body: form,
  });

  if (!response.ok) {
    await throwApiError(response, {
      provider: config.provider,
      endpoint,
      deployment: config.deployment,
      apiVersion: config.apiVersion,
    });
  }

  return parseImageResponse(response);
}
