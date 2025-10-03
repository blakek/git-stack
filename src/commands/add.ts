import {
  branchExists,
  defineArgs,
  getCurrentBranch,
  getStackParent,
  isInGitRepo,
  setStackParent,
  type Command,
} from "@/lib";
import { $ } from "bun";

const args = defineArgs([
  {
    description: "Name of the branch to create",
    isPositional: true,
    name: "name",
    required: true,
    type: "string",
  },
  {
    description: "Parent/base to branch from (defaults to current branch)",
    isPositional: true,
    name: "parent",
    required: false,
    type: "string",
  },
  {
    alias: "n",
    description: "Print what would be done without making any changes",
    isPositional: false,
    name: "dry-run",
    required: false,
    type: "boolean",
  },
]);

export const addCommand: Command<typeof args> = {
  args,
  description: "Create a new branch on top of current",
  name: "add",
  run: async (args) => {
    const name = args.name;
    const exists = await branchExists(name);
    const metadataParent = await getStackParent(name);
    const parent = args.parent || (await getCurrentBranch());

    if (!(await isInGitRepo())) {
      throw new Error("Not in a git repository");
    }

    if (!parent) {
      throw new Error(
        "Could not determine parent branch. Please specify it explicitly."
      );
    }

    // Error if the branch already exists _and_ already has metadata
    if (exists && metadataParent && metadataParent !== parent) {
      throw new Error(
        `Branch "${name}" already exists and is part of a different stack. Try "git switch ${name}" instead.`
      );
    }

    // Create the branch
    if (!exists) {
      if (args["dry-run"]) {
        console.log(`Would create branch "${name}".`);
      } else {
        await $`git branch ${name} ${parent || ""}`.quiet();
      }
    }

    // Set the stack parent metadata
    if (args["dry-run"]) {
      console.log(`Would set stack parent of "${name}" to "${parent}".`);
    } else {
      await setStackParent(name, parent);
    }

    if (args["dry-run"]) {
      console.log(`Would switch to branch "${name}".`);
    } else {
      await $`git switch ${name}`.quiet();
    }
  },
};
