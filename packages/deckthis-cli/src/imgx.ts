import { loadImgxConfig } from "./imgx-config";
import { writePng } from "./imgx-output";
import { editImage, generateImage } from "./imgx-providers";
import { SUPPORTED_SIZES, type SupportedSize } from "./imgx-types";

function parseSize(value: string | undefined): SupportedSize {
  const size = (value || "1024x1024") as SupportedSize;
  if (!SUPPORTED_SIZES.includes(size)) {
    throw new Error(`Unsupported size: ${value}. Allowed values: ${SUPPORTED_SIZES.join(", ")}`);
  }
  return size;
}

const sizeHelp = `Image size (${SUPPORTED_SIZES.join(" | ")}, default: 1024x1024)`;
const outHelp = "Output PNG path (optional, default: ./output-<timestamp>.png)";

export async function registerImgxCommand(program: import("commander").Command): Promise<void> {
  program
    .command("img-gen")
    .description("Generate a PNG image from a prompt")
    .argument("<prompt>", "Prompt text")
    .option("--size <size>", sizeHelp)
    .option("--out <path>", outHelp)
    .action(async (prompt: string, options: { size?: string; out?: string }) => {
      try {
        const config = loadImgxConfig();
        console.log("Generating image, this may take some time...");
        const result = await generateImage(config, prompt, parseSize(options.size));
        const outPath = writePng(result.bytes, options.out);
        console.log(outPath);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  program
    .command("img-edit")
    .description("Edit an existing PNG image with a prompt")
    .argument("<image>", "Input image path")
    .argument("<prompt>", "Prompt text")
    .option("--size <size>", sizeHelp)
    .option("--out <path>", outHelp)
    .action(async (imagePath: string, prompt: string, options: { size?: string; out?: string }) => {
      try {
        const config = loadImgxConfig();
        console.log("Generating image, this may take some time...");
        const result = await editImage(config, imagePath, prompt, parseSize(options.size));
        const outPath = writePng(result.bytes, options.out);
        console.log(outPath);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
