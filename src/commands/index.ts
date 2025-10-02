import { versionCommand } from "./version";

export const commands = [versionCommand] as const;

export const commandMap = new Map(
  commands.map((command) => [command.name, command])
);
