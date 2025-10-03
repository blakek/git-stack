import { defineArgs, getCurrentBranch, isInGitRepo, type Command } from "@/lib";

const args = defineArgs([
  {
    alias: "a",
    description: "List all stacks",
    name: "all",
    required: false,
    type: "boolean",
  },
  {
    description: "Show the stack starting from the given branch",
    isPositional: true,
    name: "branch",
    required: false,
    type: "string",
  },
]);

export const listCommand: Command<typeof args> = {
  args,
  description: "List branches in the current stack",
  name: "list",
  run: async (args) => {
    if (!(await isInGitRepo())) {
      throw new Error("Not in a git repository");
    }

    if (args.all && args.branch) {
      throw new Error(
        "Cannot use --all and specify a branch at the same time."
      );
    }

    if (args.all) {
      throw new Error("Listing all stacks is not yet implemented.");
    }

    const branch = args.branch || (await getCurrentBranch());

    if (!branch) {
      throw new Error(
        "Could not determine current branch. Please specify one."
      );
    }

    throw new Error("Listing a specific stack is not yet implemented.");
  },
};
