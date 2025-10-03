import { type Command } from "@/lib";
import { $ } from "bun";

export const graphCommand: Command = {
  args: [],
  description: "Show a graphical representation of the branch stack",
  name: "graph",
  run: async () => {
    await $`git log --graph --oneline --all --decorate --color`;
  },
};
