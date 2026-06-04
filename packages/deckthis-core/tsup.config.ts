import { defineConfig } from "tsup";

export default defineConfig({
  entry: { "ppt-wrapper": "src/wrapper.ts" },
  outDir: "dist",
  format: ["iife"],
  globalName: "__deckthisWrapper",
  platform: "browser",
  bundle: true,
  minify: false,
  clean: true,
  outExtension: () => ({ js: ".iife.js" }),
  onSuccess: "sh scripts/copy-to-vendor.sh",
});
