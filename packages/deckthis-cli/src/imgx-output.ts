import fs from "node:fs";
import path from "node:path";

export function resolveOutputPath(outPath?: string): string {
  if (outPath) {
    return outPath;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return path.join(process.cwd(), `output-${timestamp}.png`);
}

export function writePng(bytes: Buffer, outPath?: string): string {
  const targetPath = resolveOutputPath(outPath);
  fs.writeFileSync(targetPath, bytes);
  return targetPath;
}
