import { addCommand } from "./add";
import { versionCommand } from "./version";

export const commands = [addCommand, versionCommand] as const;

export const commandMap = new Map(
  commands.map((command) => [command.name, command])
);
