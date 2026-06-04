import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// In dist/: __dirname = dist/, skills are at dist/skills/
// Via tsx in src/: __dirname = src/, skills are at src/../skills/
const _skillsInDist = path.resolve(__dirname, "skills");
const _skillsInSrc = path.resolve(__dirname, "../skills");

async function getSkillsDir(): Promise<string> {
  try {
    await fs.access(_skillsInDist);
    return _skillsInDist;
  } catch {
    return _skillsInSrc;
  }
}

export async function copySkill(skillsDir: string, targetBase: string): Promise<void> {
  const src = path.join(skillsDir, "deckthis");
  const dst = path.join(targetBase, "deckthis");

  try {
    await fs.access(dst);
    throw new Error(`Directory "deckthis" already exists in "${targetBase}".`);
  } catch (err: unknown) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code !== "ENOENT") throw err;
    // ENOENT means dst doesn't exist — proceed
  }

  await fs.mkdir(dst, { recursive: true });
  await fs.cp(src, dst, { recursive: true });
}

export async function registerSkillCommand(program: import("commander").Command): Promise<void> {
  program
    .command("skill")
    .description("Copy the deckthis AI coding skill to a local skills directory")
    .action(async () => {
      const skillsDir = await getSkillsDir();

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      let targetSubdir: string;
      try {
        const answer = await rl.question("Install to (default: .agents/skills): ");
        targetSubdir = answer.trim() || ".agents/skills";
      } finally {
        rl.close();
      }

      const targetBase = path.resolve(process.cwd(), targetSubdir);

      try {
        await copySkill(skillsDir, targetBase);
        console.log(`[deckthis] Skill copied to ${path.join(targetSubdir, "deckthis")}/`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[deckthis] ${msg}`);
        process.exit(1);
      }
    });
}
