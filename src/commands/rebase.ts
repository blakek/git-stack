import {
  defineArgs,
  getCurrentBranch,
  getFullStackLookup,
  buildStackIndex,
  maybeFetchOrigin,
  planRebase,
  executePlan,
  type Command,
  PlanError,
} from "@/lib";

// We intentionally do not import guessMainBranch directly so planner can inject it.

const args = defineArgs([
  {
    alias: "n",
    description: "Print the rebase plan without executing",
    name: "dry-run",
    type: "boolean",
  },
  {
    description: "Explicit base ref to rebase onto (overrides guess)",
    name: "onto",
    type: "string",
  },
  {
    description: "Ancestor at which to start (trim earlier ancestors)",
    name: "from",
    type: "string",
  },
  {
    description: "Only rebase the ancestor path (no descendants)",
    name: "current-only",
    type: "boolean",
  },
]);

export const rebaseCommand: Command<typeof args> = {
  args,
  description:
    "Rebase the current stack: ancestors (root→current) then descendants (unless --current-only)",
  name: "rebase",
  run: async (argv) => {
    const current = await getCurrentBranch();
    if (!current) {
      throw new Error("Could not determine current branch (detached HEAD?)");
    }

    const stackLookup = await getFullStackLookup();
    const { parents, children } = buildStackIndex(stackLookup);

    try {
      const plan = await planRebase({
        current,
        parents,
        children,
        flags: {
          onto: argv.onto || undefined,
          from: argv.from || undefined,
          currentOnly: !!argv["current-only"],
        },
        guessBase: async () => argv.onto || "" || (await (await import("@/lib")).guessMainBranch()),
      });

      const dryRun = !!argv["dry-run"]; // print plan only
      await executePlan({
        plan,
        dryRun,
        fetch: maybeFetchOrigin,
        getCurrentBranch: () => getCurrentBranch(),
      });
    } catch (e) {
      if (e instanceof PlanError) {
        throw e; // propagate with message
      }
      throw e;
    }
  },
};
