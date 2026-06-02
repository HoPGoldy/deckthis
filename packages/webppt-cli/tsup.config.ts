import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    webppt: "bin/webppt.ts",
    cli: "src/cli.ts",
  },
  format: ["esm"],
  target: "node18",
  bundle: true,
  splitting: false,
  clean: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
