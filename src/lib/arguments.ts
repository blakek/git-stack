import type { DiscriminatedMerge } from "@/types";

interface ArgumentTypeMap {
  string: string;
  number: number;
  boolean: boolean;
}

type ArgumentType = keyof ArgumentTypeMap;
type ArgumentValue<T extends ArgumentType> = ArgumentTypeMap[T];

interface BaseArgument<Name extends string> {
  /**
   * The name of the argument that's passed to the command.
   * For example, to accept a `--branch` argument, the name would be `branch`.
   * Positional arguments should also use a name; it's shown in the help text.
   */
  name: Name;
  /** A description of the argument shown in the help text. */
  description: string;
  /** An optional shorter name for flags (e.g. `b` will allow `-b` as well as `--branch`). */
  alias?: string;
  /** Whether the argument is a positional argument (e.g. `branch`) instead of a flag (e.g. `--branch`). */
  isPositional?: boolean;
  /** Whether the argument is required. If `true`, the command will throw an error if the argument is missing. */
  required?: boolean;
  /** The type of the argument. */
  type: ArgumentType;
}

interface DefaultDetailMap {
  string: { default?: string };
  number: { default?: number };
  boolean: { default?: boolean };
}

export type Argument<Name extends string = string> = DiscriminatedMerge<
  BaseArgument<Name>,
  "type",
  DefaultDetailMap
>;

type Present<A> = A extends { required: true }
  ? true
  : A extends { default: any }
  ? true
  : false;

type NoDefaultIfRequired<A> = A extends { required: true; default: any }
  ? never
  : A;

type ArgToValue<A extends Argument> = ArgumentValue<A["type"]>;

export type RunArgs<T extends readonly Argument[]> = {
  [A in T[number] as A["name"]]: A extends NoDefaultIfRequired<A>
    ? Present<A> extends true
      ? ArgToValue<A>
      : ArgToValue<A> | undefined
    : never;
};

export interface Command<Args extends readonly Argument[] = []> {
  name: string;
  description: string;
  args: Args;
  run: (args: RunArgs<Args>) => Promise<void> | void;
}

/** Helper to define command arguments with proper typing. */
export const defineArgs = <const A extends readonly Argument[]>(a: A) => a;

export function parseArguments<T extends readonly Argument[]>(
  inputArgs: string[],
  commandArgs: T
): RunArgs<T> {
  const { flags = [], positionals = [] } = Object.groupBy(commandArgs, (arg) =>
    arg.isPositional ? "positionals" : "flags"
  );

  const parsed: Record<string, unknown> = {};
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

    if (arg?.startsWith("-")) {
      const alias = arg.slice(1);
      const commandArg = flags.find((arg) => arg.alias === alias);

      if (commandArg) {
        const value = commandArg.type === "boolean" ? true : inputArgs[i + 1];
        parsed[commandArg.name] = value;
        if (commandArg.type !== "boolean") i++; // Skip next if it's a value
      } else {
        console.warn(`Unknown flag alias: ${alias}`);
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

  return parsed as RunArgs<T>;
}
