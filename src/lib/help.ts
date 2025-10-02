import { commandMap, commands } from "@/commands";
import { cliName, gitCliName } from "@/constants";
import type { Argument, Command } from "@/types";
import { render } from "@blakek/scratchpad";
import { bold, dim, italic, reset } from "./terminal";

const header = (text: string) => `${bold}${text}${reset}`;

function getArgumentRepresentation(arg: Argument): string {
  const defaultText = arg.default
    ? ` ${dim}(default: ${arg.default})${reset}`
    : "";

  if (arg.isPositional) {
    return arg.required ? `<${arg.name}>` : `[${arg.name}${defaultText}]`;
  }

  const flag = arg.alias ? `-${arg.alias}, --${arg.name}` : `--${arg.name}`;

  if (arg.required) {
    return flag;
  } else {
    return `[${flag}${defaultText}]`;
  }
}

function logTopLevelHelp() {
  const helpText = render(
    `
    ${italic}${cliName}${reset} - Utilities for working with "stacked" git branches

    ${header("USAGE")}
      ${gitCliName} <command> [options]

    ${header("COMMANDS")}
    {{#commands}}
      - {{name}}: {{description}}
    {{/commands}}`,
    { commands }
  );

  return console.log(helpText);
}

function logCommandHelp(command: Command) {
  const argsRepresentation = command.args
    .map(getArgumentRepresentation)
    .join(" ");

  let helpText = render(
    `
    {{command.description}}

    ${header("USAGE")}
      ${gitCliName} {{command.name}} {{argsRepresentation}}`,
    { command, argsRepresentation }
  );

  if (command.args.length > 0) {
    helpText += "\n\n";

    helpText += render(
      `
      ${header("OPTIONS")}
      {{#command.args}}
        - {{name}}: {{description}}
      {{/command.args}}`,
      { command }
    );
  }

  return console.log(helpText);
}

function isHelpArgument(arg: string): boolean {
  return arg === "help" || arg === "-h" || arg === "--help";
}

export function displayHelp(commandName?: string, args: string[] = []) {
  const isTopLevelHelp =
    !commandName || (isHelpArgument(commandName) && args.length === 0);

  if (isTopLevelHelp) {
    logTopLevelHelp();
    return;
  }

  const subcommand = isHelpArgument(commandName) ? args[0] : commandName;

  // Help was requested for a command
  const command = commandMap.get(subcommand ?? "");

  if (!command) {
    console.error(`Unknown command: ${subcommand}`);
    logTopLevelHelp();
    process.exit(1);
  }

  logCommandHelp(command as Command);
}

export function wasHelpRequested(args: string[]): boolean {
  if (args.length === 0) {
    return false;
  }

  return args.some(isHelpArgument);
}
