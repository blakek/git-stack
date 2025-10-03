import { cliName, version } from "@/constants";
import type { Command } from "@/lib";

export const versionCommand: Command = {
  args: [],
  description: "Show the current version",
  name: "version",
  run: () => {
    console.log(`${cliName} version ${version}`);
  },
};
