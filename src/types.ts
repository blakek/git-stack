type ArgumentType = string | number | boolean;

export interface Argument<T extends ArgumentType = string> {
  /**
   * The name of the argument that's passed to the command.
   * For example, to accept a `--branch` argument, the name would be `branch`.
   * Positional arguments should also use a name; it's shown in the help text.
   */
  name: string;
  /** A description of the argument shown in the help text. */
  description: string;
  /** An optional shorter name for flags (e.g. `b` will allow `-b` as well as `--branch`). */
  alias?: string;
  /** Whether the argument is a positional argument (e.g. `branch`) instead of a flag (e.g. `--branch`). */
  isPositional?: boolean;
  /** Whether the argument is required. If `true`, the command will throw an error if the argument is missing. */
  required: boolean;
  /** Allows specifying a default value for the argument. This is mutually exclusive with `required`. */
  default?: T;
  /** The type of the argument. */
  type?: T;
}

export type RunArgs<T extends Argument[]> = {
  [K in T[number]["name"]]: T[number]["type"];
};

export interface Command<Args extends Argument[] = []> {
  name: string;
  description: string;
  args: Args;
  run: (args: RunArgs<Args>) => Promise<void> | void;
}

export interface ParsedArgs {
  [key: string]: any;
}
