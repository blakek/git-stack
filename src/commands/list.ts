import {
  defineArgs,
  getCurrentBranch,
  getFullStackLookup,
  isInGitRepo,
  type Command,
} from "@/lib";
import * as Tree from "@/lib/tree";

const args = defineArgs([
  {
    alias: "a",
    description: "List all stacks",
    name: "all",
    required: false,
    type: "boolean",
  },
  {
    description: "Show the stacks containing the specified branch",
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

    const branch = args.branch || (await getCurrentBranch());

    const stackLookup = await getFullStackLookup();
    const { nodes, roots, errors } = Tree.buildStackGraph(stackLookup);

    if (args.all) {
      Tree.printStacks(roots, nodes, branch);
      return;
    }

    if (!branch) {
      throw new Error(
        "Could not determine current branch. Please specify one."
      );
    }

    const root = Tree.findRootOf(branch, nodes);
    if (!root) {
      throw new Error(`Branch "${branch}" is not part of a stack.`);
    }

    Tree.printStacks([root], nodes, branch);

    if (errors.length > 0) {
      console.warn("Warnings:");
      for (const error of errors) {
        console.warn(`  - ${error}`);
      }
      console.warn("");
    }
  },
};
