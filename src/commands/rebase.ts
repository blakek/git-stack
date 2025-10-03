import {
  defineArgs,
  getCurrentBranch,
  guessMainBranch,
  type Command,
} from "@/lib";
import { $ } from "bun";

const args = defineArgs([
  {
    description: "Parent branch to rebase onto (guesses if not provided)",
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

export const rebaseCommand: Command<typeof args> = {
  args,
  description: "Rebase all stack branches onto the latest parent branch",
  name: "rebase",
  run: async (args) => {
    console.log("hi");
    const parent = args.parent || (await guessMainBranch());
    const currentBranch = await getCurrentBranch();

    if (args["dry-run"]) {
      console.log(
        `Would rebase ${currentBranch} and any child branches onto ${parent}.`
      );
      return;
    }

    await $`git fetch origin`;
    await $`git rebase ${parent} --update-refs --autostash`;
  },
};
