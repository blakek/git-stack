import type { Argument, ParsedArgs, RunArgs } from "@/types";

export function parseArguments(
  inputArgs: string[],
  commandArgs: Argument[]
): RunArgs<typeof commandArgs> {
  const { flags = [], positionals = [] } = Object.groupBy(commandArgs, (arg) =>
    arg.isPositional ? "positionals" : "flags"
  );

  const parsed: ParsedArgs = {};
  let positionalIndex = 0;

  for (let i = 0; i < inputArgs.length; i++) {
    const arg = inputArgs[i];

    if (arg?.startsWith("--")) {
      const flag = arg.slice(2);
      const commandArg = flags.find((arg) => arg.name === flag);

      if (commandArg) {
        const value = commandArg.type === "boolean" ? true : inputArgs[i + 1];
        parsed[flag] = value;
        if (commandArg.type !== "boolean") i++; // Skip next if it's a value
      } else {
        console.warn(`Unknown flag: ${flag}`);
      }

      continue;
    }

    const commandArg = positionals[positionalIndex];
    if (!commandArg) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    parsed[commandArg.name] = arg;
    positionalIndex++;
  }

  // Add default values for missing arguments
  commandArgs.forEach((arg) => {
    if (arg.required && !parsed[arg.name]) {
      if (arg.default) {
        parsed[arg.name] = arg.default;
      } else if (arg.required) {
        throw new Error(
          `${arg.isPositional ? "positional" : ""} argument "${
            arg.name
          }" is required but not provided.`
        );
      }
    }
  });

  return parsed as RunArgs<typeof commandArgs>;
}
