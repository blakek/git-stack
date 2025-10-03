import { addCommand } from "./add";
import { graphCommand } from "./graph";
import { rebaseCommand } from "./rebase";
import { versionCommand } from "./version";

export const commands = [
  addCommand,
  graphCommand,
  rebaseCommand,
  versionCommand,
] as const;

export const commandMap = new Map(
  commands.map((command) => [command.name, command])
);
