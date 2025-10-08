import { describe, it, expect } from "bun:test";
import { buildStackIndex } from "@/lib/stack";
import { planRebase, PlanError } from "./plan";

async function runPlan(opts: Parameters<typeof planRebase>[0]) {
  return planRebase(opts);
}

describe("planRebase", () => {
  it("plans linear ancestor chain + descendants", async () => {
    // main -> f1 -> f2 -> f3; current f2; f2 has child f3
    const lookup = new Map([
      ["f1", "main"],
      ["f2", "f1"],
      ["f3", "f2"],
    ]);
    const { parents, children } = buildStackIndex(lookup);
    const plan = await runPlan({
      current: "f2",
      parents,
      children,
      flags: {},
      guessBase: async () => "origin/main",
    });
    expect(plan.baseRef).toBe("origin/main");
    const steps = plan.steps.map((s) => `${s.branch}->${s.onto}`);
    // Ancestors: main? (main not in lookup so root detection returns main) path will be [main?, f1, f2]
    // Since main not listed as child we won't have mapping entry; our logic sets root to current if not found -> ancestorPath becomes [f1, f2]? Wait: root detection path logic collects parents via map only.
    // Because main isn't in parents map, ancestorPath will be [f2, f1] reversed => [f1, f2]. That's acceptable.
    // Because main is an implicit root (parent of f1) planner includes it first
    expect(steps[0]).toBe("main->origin/main");
    expect(steps[1]).toBe("f1->main");
    expect(steps[2]).toBe("f2->f1");
    // Descendant f3
    expect(steps[3]).toBe("f3->f2");
  });

  it("honors --from trimming ancestors", async () => {
    const lookup = new Map([
      ["f1", "main"],
      ["f2", "f1"],
      ["f3", "f2"],
    ]);
    const { parents, children } = buildStackIndex(lookup);
    const plan = await runPlan({
      current: "f3",
      parents,
      children,
      flags: { from: "f2" },
      guessBase: async () => "origin/main",
    });
    const steps = plan.steps.map((s) => `${s.branch}->${s.onto}`);
    // Should start at f2
    expect(steps[0]).toBe("f2->origin/main");
    expect(steps[1]).toBe("f3->f2");
  });

  it("errors if --from not ancestor", async () => {
    const lookup = new Map([
      ["f1", "main"],
      ["f2", "f1"],
    ]);
    const { parents, children } = buildStackIndex(lookup);
    await expect(
      runPlan({
        current: "f2",
        parents,
        children,
        flags: { from: "zzz" },
        guessBase: async () => "origin/main",
      })
    ).rejects.toBeInstanceOf(PlanError);
  });

  it("supports --current-only (no descendants)", async () => {
    const lookup = new Map([
      ["f1", "main"],
      ["f2", "f1"],
      ["f3", "f2"],
    ]);
    const { parents, children } = buildStackIndex(lookup);
    const plan = await runPlan({
      current: "f2",
      parents,
      children,
      flags: { currentOnly: true },
      guessBase: async () => "origin/main",
    });
    const steps = plan.steps.map((s) => `${s.branch}->${s.onto}`);
    expect(steps).toEqual(["main->origin/main", "f1->main", "f2->f1"]);
  });

  it("handles standalone branch (no mapping)", async () => {
    const lookup = new Map<string, string>();
    const { parents, children } = buildStackIndex(lookup);
    const plan = await runPlan({
      current: "standalone",
      parents,
      children,
      flags: {},
      guessBase: async () => "origin/main",
    });
    expect(plan.steps).toEqual([{ branch: "standalone", onto: "origin/main" }]);
  });

  it("orders multiple descendants parent-first alphabetically", async () => {
    // structure: root -> a; a -> b, c; c -> d
    const lookup = new Map([
      ["a", "root"],
      ["b", "a"],
      ["c", "a"],
      ["d", "c"],
    ]);
    const { parents, children } = buildStackIndex(lookup);
    const plan = await runPlan({
      current: "a",
      parents,
      children,
      flags: {},
      guessBase: async () => "base",
    });
    const steps = plan.steps.map((s) => s.branch);
    // ancestors: a (only) then descendants: b, c, d (alphabetical within siblings, parent-first ensures c before d)
    // Implicit root appears first
    expect(steps).toEqual(["root", "a", "b", "c", "d"]);
  });
});
