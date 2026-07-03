import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as net from "node:net";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawn, type ChildProcess } from "node:child_process";
import { buildSlidesConfig } from "./load-config";
import { registerDemoCommand } from "./demo";
import { registerSkillCommand } from "./skill";
import { createFileWatcher } from "./file-watcher";
export { defineConfig } from "./types";
export type { DeckthisConfig, BeforeEachFn, BeforeEachContext } from "./types";
export { getDeckDir } from "./types";
export { buildSlidesConfig } from "./load-config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerPath = path.join(__dirname, "worker.js");
const exportWorkerPath = path.join(__dirname, "export-worker.js");
const _require = createRequire(import.meta.url);
const tsxEsmPath = _require.resolve("tsx/esm");

function spawnWorker(folder: string, port: number): ChildProcess {
  return spawn(
    process.execPath,
    ["--import", tsxEsmPath, workerPath, "--folder", folder, "--port", String(port)],
    { stdio: "inherit" },
  );
}

async function findFreePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`[deckthis] Port ${startPort} in use, trying ${startPort + 1}...`);
        resolve(findFreePort(startPort + 1));
      } else {
        reject(err);
      }
    });
    server.listen(startPort, () => server.close(() => resolve(startPort)));
  });
}

async function ensureEsmPackageJson(): Promise<void> {
  const pkgPath = path.join(process.cwd(), "package.json");
  try {
    const raw = await fs.readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(raw);
    if (pkg.type === "module") return;
    pkg.type = "module";
    await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    console.warn(
      '\x1b[33m[deckthis] Added "type": "module" to package.json (required for config loading)\x1b[0m',
    );
  } catch {
    // No package.json found, skip
  }
}

export async function runCli(argv = process.argv): Promise<void> {
  const { Command } = await import("commander");
  const program = new Command();

  program.name("deckthis").description("Web presentation tool").version("0.0.1");

  await registerDemoCommand(program);
  await registerSkillCommand(program);

  program
    .command("export")
    .description("Export presentation to PPTX")
    .argument("<folder>", "Presentation folder path")
    .option("-o, --output <path>", "Output .pptx file path", "presentation.pptx")
    .option("--width <number>", "Viewport width in pixels")
    .option("--height <number>", "Viewport height in pixels")
    .option("--scale <number>", "Screenshot device scale factor")
    .option("--wait <number>", "Delay before screenshot capture in milliseconds")
    .action(
      async (
        folderArg: string,
        opts: { output: string; width?: string; height?: string; scale?: string; wait?: string },
      ) => {
        const folder = path.resolve(folderArg);
        await ensureEsmPackageJson();
        const childArgs = [
          "--import",
          tsxEsmPath,
          exportWorkerPath,
          "--folder",
          folder,
          "--output",
          opts.output,
        ];

        if (opts.width) childArgs.push("--width", opts.width);
        if (opts.height) childArgs.push("--height", opts.height);
        if (opts.scale) childArgs.push("--scale", opts.scale);
        if (opts.wait) childArgs.push("--wait", opts.wait);

        const child = spawn(process.execPath, childArgs, { stdio: "inherit" });
        await new Promise<void>((resolve, reject) => {
          child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`Exit ${code}`))));
          child.on("error", reject);
        });
      },
    );

  program
    .argument("<folder>", "Presentation folder path")
    .option("--port <number>", "Starting port", "39200")
    .action(async (folderArg: string, opts: { port: string }) => {
      const folder = path.resolve(folderArg);
      await ensureEsmPackageJson();

      // Validate folder
      try {
        await fs.access(folder);
      } catch {
        console.error(`[deckthis] Folder not found: ${folder}`);
        process.exit(1);
      }

      const port = await findFreePort(parseInt(opts.port, 10));
      let child = spawnWorker(folder, port);

      // Restart child on any file change — new process = fresh module cache
      const watcher = createFileWatcher(folder);
      watcher.onChange(() => {
        console.log("[deckthis] File changed, restarting...");
        child.kill();
        child = spawnWorker(folder, port);
      });

      const cleanup = async () => {
        child.kill();
        await watcher.close();
      };
      process.once("SIGINT", async () => {
        await cleanup();
        process.exit(0);
      });
      process.once("SIGTERM", async () => {
        await cleanup();
        process.exit(0);
      });
    });

  await program.parseAsync(argv);
}
