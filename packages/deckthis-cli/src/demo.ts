import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// In dist/: __dirname = dist/, demos are at dist/demos/
// Via tsx in src/: __dirname = src/, demos are at src/../demos/
const _demosInDist = path.resolve(__dirname, "demos");
const _demosInSrc = path.resolve(__dirname, "../demos");

async function getDemosDir(): Promise<string> {
  try {
    await fs.access(_demosInDist);
    return _demosInDist;
  } catch {
    return _demosInSrc;
  }
}

export async function listDemos(demosDir: string): Promise<string[]> {
  const entries = await fs.readdir(demosDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

export async function copyDemo(demosDir: string, name: string, targetBase: string): Promise<void> {
  const src = path.join(demosDir, name);
  const dst = path.join(targetBase, name);

  try {
    await fs.access(src);
  } catch {
    throw new Error(`Demo "${name}" not found. Run \`deckthis demo list\` to see available demos.`);
  }

  try {
    await fs.access(dst);
    // If we reach here, dst exists — that's an error
    throw new Error(`Directory "${name}" already exists in the current folder.`);
  } catch (err: unknown) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code !== "ENOENT") throw err;
    // ENOENT means dst doesn't exist — proceed
  }

  await fs.cp(src, dst, { recursive: true });
}

export async function registerDemoCommand(program: import("commander").Command): Promise<void> {
  const { Command } = await import("commander");

  const demoCmd = new Command("demo")
    .description('Copy a demo to the current directory. Use "list" to show available demos.')
    .argument("<name>", 'Demo name to copy, or "list" to show all demos')
    .action(async (name: string) => {
      const demosDir = await getDemosDir();

      if (name === "list") {
        const names = await listDemos(demosDir);
        if (names.length === 0) {
          console.log("No demos available.");
        } else {
          console.log("Available demos:");
          for (const n of names) console.log(`  ${n}`);
        }
        return;
      }

      try {
        await copyDemo(demosDir, name, process.cwd());
        console.log(`[deckthis] Demo "${name}" copied to ./${name}`);
        console.log(`[deckthis] Run it with:`);
        console.log(`  cd ${name} && deckthis .`);
      } catch (err: unknown) {
        console.error(`[deckthis] ${(err as Error).message}`);
        process.exit(1);
      }
    });

  program.addCommand(demoCmd);
}
