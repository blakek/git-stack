import {
  buildStackIndex,
  collectBranchAndDescendants,
  defineArgs,
  findRootForBranch,
  getCurrentBranch,
  getFullStackLookup,
  isInGitRepo,
  printForest,
  printPruned,
  type Command,
} from "@/lib";

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
    const { parents, children, roots } = buildStackIndex(stackLookup);

    if (args.all) {
      printForest(roots, children, branch);
      return;
    }

    if (!branch) {
      throw new Error(
        "Could not determine current branch. Please specify one."
      );
    }

    const root = findRootForBranch(branch, parents);
    if (!root) {
      throw new Error(`Branch "${branch}" is not part of a stack.`);
    }

    const descendants = collectBranchAndDescendants(root, children);

    const allow = new Set<string>([...descendants]);
    // Walk up to root, adding ancestors
    let cursor: string | undefined = root;
    while (cursor && cursor !== root) {
      const parent = parents.get(cursor);
      if (!parent) break;
      allow.add(parent);
      cursor = parent;
    }
    allow.add(root);

    printPruned(root, allow, children, branch);
  },
};
