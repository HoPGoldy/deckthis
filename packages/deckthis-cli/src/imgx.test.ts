import { describe, expect, it } from "vitest";

import { registerImgxCommand } from "./imgx";

describe("registerImgxCommand", () => {
  it("shows 16:9 as the default size for image commands", async () => {
    const { Command } = await import("commander");
    const program = new Command();

    await registerImgxCommand(program);

    const imgGen = program.commands.find((command) => command.name() === "img-gen");
    const imgEdit = program.commands.find((command) => command.name() === "img-edit");

    expect(imgGen?.options.find((option) => option.long === "--size")?.description).toContain(
      "default: 1792x1024",
    );
    expect(imgEdit?.options.find((option) => option.long === "--size")?.description).toContain(
      "default: 1792x1024",
    );
  });
});
