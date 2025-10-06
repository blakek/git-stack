// tests/stack.test.ts
import {
  buildStackIndex,
  collectBranchAndDescendants,
  findRootForBranch,
  printForest,
  printPruned,
} from "@/lib/stack";
import { describe, expect, it } from "bun:test";

function captureConsole(fn: () => void): string[] {
  const lines: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.join(" "));
  };
  try {
    fn();
  } finally {
    console.log = original;
  }
  return lines;
}

describe("stack index", () => {
  it("builds parents/children/roots", () => {
    // main -> feature-1 -> feature-2; main -> temp-test-1
    const lookup = new Map([
      ["feature-1", "main"],
      ["feature-2", "feature-1"],
      ["temp-test-1", "main"],
    ]);
    const { parents, children, roots } = buildStackIndex(lookup);

    expect(parents.get("feature-1")).toBe("main");
    expect(parents.get("feature-2")).toBe("feature-1");
    expect(parents.get("temp-test-1")).toBe("main");

    expect(children.get("main")).toBeDefined();
    expect(children.get("main")!.has("feature-1")).toBe(true);
    expect(children.get("main")!.has("temp-test-1")).toBe(true);
    expect(children.get("feature-1")!.has("feature-2")).toBe(true);

    // Roots should include 'main' (no parent given)
    expect(roots.has("main")).toBe(true);
  });

  it("finds root for a branch", () => {
    const lookup = new Map([
      ["a", "main"],
      ["b", "a"],
      ["c", "b"],
    ]);
    const { parents } = buildStackIndex(lookup);
    expect(findRootForBranch("c", parents)).toBe("main");
    expect(findRootForBranch("a", parents)).toBe("main");
    expect(findRootForBranch("main", parents)).toBe("main"); // implicitly a root
    expect(findRootForBranch("zzz", parents)).toBeUndefined();
  });

  it("collects descendants", () => {
    const lookup = new Map([
      ["f1", "main"],
      ["f2", "f1"],
      ["f3", "f2"],
      ["other", "main"],
    ]);
    const { children } = buildStackIndex(lookup);
    const allow = collectBranchAndDescendants("f2", children);
    expect(allow.has("f2")).toBe(true);
    expect(allow.has("f3")).toBe(true);
    expect(allow.has("f1")).toBe(false);
    expect(allow.has("other")).toBe(false);
  });
});

describe("printing", () => {
  it("prints full forest (all)", () => {
    const lookup = new Map([
      ["feature-1", "main"],
      ["feature-2", "feature-1"],
      ["temp-test-1", "main"],
    ]);
    const { children, roots } = buildStackIndex(lookup);

    const lines = captureConsole(() => {
      printForest(roots, children, "feature-1");
    });

    // Basic structural checks
    expect(lines.join("\n")).toContain("main");
    expect(lines.join("\n")).toContain("feature-1 *");
    expect(lines.join("\n")).toContain("└─ feature-2");
    expect(lines.join("\n")).toContain("temp-test-1");
  });

  it("prints pruned stack (path + descendants)", () => {
    const lookup = new Map([
      ["feature-1", "main"],
      ["feature-2", "feature-1"],
      ["feature-2-2", "feature-2"],
      ["feature-3", "feature-2"],
      ["temp-test-1", "main"],
    ]);
    const { parents, children, roots } = buildStackIndex(lookup);
    const root = [...roots].find((r) => r === "main")!;

    // allowed = ancestors(root→feature-2) ∪ descendants(feature-2)
    const allow = new Set<string>([
      "main",
      "feature-1",
      "feature-2",
      "feature-2-2",
      "feature-3",
    ]);

    const lines = captureConsole(() => {
      printPruned(root, allow, children, "feature-1");
    });

    const output = lines.join("\n");
    // Should not include sibling under main that isn't on the path or descendant
    expect(output).not.toContain("temp-test-1");
    // Should show path + descendants
    expect(output).toContain("main");
    expect(output).toContain("feature-1 *");
    expect(output).toContain("feature-2");
    expect(output).toContain("feature-2-2");
    expect(output).toContain("feature-3");
  });

  it("pruned output excludes siblings not on path or descendants", () => {
    const lookup = new Map([
      ["feature-1", "main"],
      ["feature-2", "feature-1"],
      ["temp-test-1", "main"],
    ]);
    const { parents, children, roots } = buildStackIndex(lookup);
    const root = [...roots].find((r) => r === "main")!;

    // Simulate allow set for listing feature-1 (should include main, feature-1, feature-2)
    const allow = new Set<string>(["main", "feature-1", "feature-2"]);
    const lines = captureConsole(() => {
      printPruned(root, allow, children, "feature-1");
    });
    const output = lines.join("\n");
    expect(output).toContain("main");
    expect(output).toContain("feature-1 *");
    expect(output).toContain("feature-2");
    expect(output).not.toContain("temp-test-1");
  });

  it("pruned output does not duplicate descendant subtrees", () => {
    const lookup = new Map([
      ["feature-1", "main"],
      ["feature-2", "feature-1"],
      ["feature-2-2", "feature-2"],
      ["feature-3", "feature-2"],
      ["temp-test-1", "main"],
    ]);
    const { children, roots } = buildStackIndex(lookup);
    const root = [...roots].find((r) => r === "main")!;
    const allow = new Set<string>([
      "main",
      "feature-1",
      "feature-2",
      "feature-2-2",
      "feature-3",
    ]);
    const lines = captureConsole(() => {
      printPruned(root, allow, children, "feature-1");
    });
    const output = lines.join("\n");
    // Count occurrences of each branch name (without tree glyphs) to ensure they appear only once (except formatting markers)
    const counts: Record<string, number> = {};
    const targets = [
      "feature-1",
      "feature-2",
      "feature-2-2",
      "feature-3",
    ] as const;
    for (const t of targets) counts[t] = 0;
    for (const line of lines) {
      // Strip tree glyphs, split on spaces, take first token (branch name)
      const cleaned = line
        .replace(/[│├└─]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!cleaned) continue;
      const first: string = cleaned.split(" ")[0] ?? "";
      if (first && Object.prototype.hasOwnProperty.call(counts, first)) {
        counts[first]! += 1;
      }
    }
    expect(counts["feature-1"]).toBe(1);
    expect(counts["feature-2"]).toBe(1);
    expect(counts["feature-2-2"]).toBe(1);
    expect(counts["feature-3"]).toBe(1);
  });
});
