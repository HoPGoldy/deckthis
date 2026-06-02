import { defineConfig } from "tsup";

export default defineConfig({
  entry: { "ppt-wrapper": "src/wrapper.ts" },
  outDir: "dist",
  format: ["iife"],
  globalName: "__webpptWrapper",
  platform: "browser",
  bundle: true,
  minify: false,
  clean: true,
  outExtension: () => ({ js: ".iife.js" }),
});
