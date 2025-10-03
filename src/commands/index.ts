import { addCommand } from "./add";
import { cleanCommand } from "./clean";
import { graphCommand } from "./graph";
import { listCommand } from "./list";
import { rebaseCommand } from "./rebase";
import { versionCommand } from "./version";

export const commands = [
  addCommand,
  cleanCommand,
  graphCommand,
  listCommand,
  rebaseCommand,
  versionCommand,
] as const;

export const commandMap = new Map(
  commands.map((command) => [command.name, command])
);
