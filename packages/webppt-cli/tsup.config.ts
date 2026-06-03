import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    webppt: "bin/webppt.ts",
    cli: "src/cli.ts",
    index: "src/types.ts",
  },
  format: ["esm"],
  target: "node18",
  bundle: true,
  splitting: false,
  clean: true,
  dts: {
    entry: { index: "src/types.ts" },
  },
  banner: {
    js: "#!/usr/bin/env node",
  },
  onSuccess: "rm -rf dist/demos && cp -r demos dist/demos && rm -rf dist/skills && cp -r skills dist/skills",
});
