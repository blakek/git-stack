import { addCommand } from "./add";
import { cleanCommand } from "./clean";
import { graphCommand } from "./graph";
import { rebaseCommand } from "./rebase";
import { versionCommand } from "./version";

export const commands = [
  addCommand,
  cleanCommand,
  graphCommand,
  rebaseCommand,
  versionCommand,
] as const;

export const commandMap = new Map(
  commands.map((command) => [command.name, command])
);
