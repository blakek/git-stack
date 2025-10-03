import { defineArgs, isInGitRepo, type Command } from "@/lib";
import { $ } from "bun";

const args = defineArgs([
  {
    alias: "n",
    description: "Print what would be done without making any changes",
    isPositional: false,
    name: "dry-run",
    required: false,
    type: "boolean",
  },
]);

export const cleanCommand: Command<typeof args> = {
  args,
  description: "Clean up metadata for stacks",
  name: "clean",
  run: async (args) => {
    if (!(await isInGitRepo())) {
      throw new Error("Not in a git repository");
    }

    if (args["dry-run"]) {
      console.log("Would run rerere garbage collection.");
    } else {
      await $`git rerere gc`.quiet();
    }

    console.log("TODO: Implement cleaning up stale stack metadata.");
  },
};
