import type { ChildrenMap, ParentsMap } from "@/lib/stack";
import { findRootForBranch } from "@/lib/stack";

export interface PlanFlags {
  onto?: string; // explicit base
  from?: string; // partial ancestor root
  currentOnly?: boolean; // limit to ancestors only
}

export interface RebaseStep {
  branch: string;
  onto: string; // target parent ref
}

export interface RebasePlan {
  baseRef: string; // resolved base (guessed or provided)
  steps: RebaseStep[];
}

export class PlanError extends Error {}

/**
 * Plan a stack rebase. Pure (aside from provided guessBase async fn).
 * Ordering: ancestor path root→…→current, then descendants of current (if not currentOnly)
 * Each step includes the branch and the ref it should be rebased onto.
 */
export async function planRebase(options: {
  current: string;
  parents: ParentsMap;
  children: ChildrenMap;
  flags: PlanFlags;
  guessBase: () => Promise<string>;
}): Promise<RebasePlan> {
  const { current, parents, children, flags, guessBase } = options;

  const baseRef = flags.onto || (await guessBase());

  // Build ancestor chain root→...→current
  const root = findRootForBranch(current, parents) || current; // standalone if not found

  if (flags.from && flags.from !== root) {
    // Validate that --from is an ancestor of current
    const chain: string[] = [];
    let cursor: string | undefined = current;
    const visited = new Set<string>();
    while (cursor && !visited.has(cursor)) {
      chain.push(cursor);
      visited.add(cursor);
      const p = parents.get(cursor);
      if (!p) break;
      cursor = p;
    }
    if (!chain.includes(flags.from)) {
      throw new PlanError(
        `--from ${flags.from} is not an ancestor of ${current}`
      );
    }
  }

  // Build full ancestor path root→...→current
  const ancestorPath: string[] = [];
  {
    const path: string[] = [];
    let cursor: string | undefined = current;
    const visited = new Set<string>();
    while (cursor && !visited.has(cursor)) {
      path.push(cursor);
      visited.add(cursor);
      const p = parents.get(cursor);
      if (!p) break;
      cursor = p;
    }
    // path currently current→...→rootCandidate; reverse
    path.reverse();
    // Ensure root candidate is truly the first element (could differ if findRoot returned current for standalone)
    ancestorPath.push(...path);
  }

  // If --from provided, trim everything before it
  const fromIndex = flags.from ? ancestorPath.indexOf(flags.from) : 0;
  if (flags.from && fromIndex === -1) {
    throw new PlanError(
      `--from ${flags.from} not found in ancestor chain for ${current}`
    );
  }
  const trimmedAncestors = ancestorPath.slice(fromIndex);

  // Descendants collection (excluding current; we'll add current once via ancestors)
  const descendantOrder: string[] = [];
  if (!flags.currentOnly) {
    // BFS / parent-first order using children map (already deterministically sorted sets)
    const queue: string[] = [current];
    const seen = new Set<string>([current]);
    while (queue.length > 0) {
      const b = queue.shift()!;
      const childSet = children.get(b);
      if (!childSet) continue;
      const kids = [...childSet];
      for (const k of kids) {
        if (!seen.has(k)) {
          descendantOrder.push(k); // record visitation order (parent-first)
          seen.add(k);
          queue.push(k);
        }
      }
    }
  }

  // Build steps. For the ancestor chain, each branch rebases onto either baseRef (for the first element) or prior ancestor.
  const steps: RebaseStep[] = [];
  for (let i = 0; i < trimmedAncestors.length; i++) {
    const branch = trimmedAncestors[i]!;
    if (i === 0) {
      steps.push({ branch, onto: baseRef });
    } else {
      steps.push({ branch, onto: trimmedAncestors[i - 1]! });
    }
  }

  // Add descendant steps (each onto its configured parent — which may have moved by the time we execute)
  for (const desc of descendantOrder) {
    const parent = parents.get(desc);
    if (!parent) {
      // A descendant without a parent mapping: treat as onto baseRef (should be rare; config inconsistency)
      steps.push({ branch: desc, onto: baseRef });
    } else {
      steps.push({ branch: desc, onto: parent });
    }
  }

  return { baseRef, steps };
}
