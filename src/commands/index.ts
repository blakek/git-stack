import { addCommand } from "./add";
import { rebaseCommand } from "./rebase";
import { versionCommand } from "./version";

export const commands = [addCommand, rebaseCommand, versionCommand] as const;

export const commandMap = new Map(
  commands.map((command) => [command.name, command])
);
