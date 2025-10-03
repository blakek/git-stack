import { branchExists, defineArgs, isInGitRepo, type Command } from "@/lib";
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

    if (!(await isInGitRepo())) {
      if (args["dry-run"]) {
        console.log("Would fail because no git repository was found.");
        return;
      }

      throw new Error("Not in a git repository");
    }

    if (await branchExists(name)) {
      if (args["dry-run"]) {
        console.log(`Would fail because branch "${name}" already exists.`);
        return;
      }

      throw new Error(`Branch "${name}" already exists`);
    }

    if (args["dry-run"]) {
      console.log(`Would create branch "${name}".`);
      return;
    }

    await $`git switch -c ${name}`;
  },
};
