// src/lib/stack.ts
// Simple, explicit data structures: no classes, no hidden state.

export type ParentsMap = Map<string, string | undefined>;
export type ChildrenMap = Map<string, Set<string>>;

/**
 * Build parents/children/roots from a Map(child -> parent).
 * - Parent may be undefined if the branch is a root.
 * - children map uses Sets for O(1) membership and stable iteration after sorting.
 */
export function buildStackIndex(lookup: Map<string, string>): {
  parents: ParentsMap;
  children: ChildrenMap;
  roots: Set<string>;
} {
  const parents: ParentsMap = new Map();
  const children: ChildrenMap = new Map();
  const roots = new Set<string>();

  // Ensure a node exists in children map.
  function ensureChildren(branch: string): Set<string> {
    if (!children.has(branch)) children.set(branch, new Set());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return children.get(branch)!;
  }

  // First pass: record parent links; ensure nodes exist.
  for (const [child, parent] of lookup) {
    parents.set(child, parent);
    ensureChildren(child);
    if (parent && parent.length > 0) ensureChildren(parent);
  }

  // Second pass: build children sets from parent links.
  for (const [child, maybeParent] of parents) {
    if (maybeParent && children.has(maybeParent)) {
      children.get(maybeParent)!.add(child);
    }
  }

  // Roots are branches present in the index that have no parent or whose parent isn’t in the index.
  // (We keep it simple; “bad parent” just means “root” for purposes of listing.)
  const allBranches = new Set<string>([...parents.keys(), ...children.keys()]);
  for (const branch of allBranches) {
    const parent = parents.get(branch);
    if (!parent || !allBranches.has(parent)) {
      roots.add(branch);
    }
  }

  // Sort children deterministically (convert to sorted Sets)
  for (const [branch, childSet] of children) {
    const sorted = [...childSet].sort((a, b) => a.localeCompare(b));
    children.set(branch, new Set(sorted));
  }

  return { parents, children, roots };
}

/**
 * Find the root (top-most ancestor) for a given branch using parent links.
 */
export function findRootForBranch(
  branch: string,
  parents: ParentsMap
): string | undefined {
  // If the branch isn't a key in parents, it might still be a root if other
  // entries reference it as a parent (e.g. 'main' may appear only as a parent
  // value). In that case treat it as its own root. Otherwise return undefined.
  if (!parents.has(branch)) {
    for (const p of parents.values()) {
      if (p === branch) return branch;
    }
    return undefined;
  }

  const visited = new Set<string>();
  let cursor: string | undefined = branch;

  // Walk up until we reach a branch that has no parent recorded or whose parent
  // isn't present in the parents map — that's the top-most ancestor (root).
  while (cursor && !visited.has(cursor)) {
    visited.add(cursor);
    const parent = parents.get(cursor);
    // If parent is missing, cursor is the root.
    if (!parent) {
      return cursor;
    }
    // If the parent exists but isn't itself in the parents map, the parent is
    // the top-most ancestor (e.g. 'main' isn't listed as a child in the map).
    if (!parents.has(parent)) {
      return parent;
    }
    cursor = parent;
  }

  // If we broke due to a cycle, return undefined to signal no clear root.
  return undefined;
}

/**
 * Collect a branch and all of its descendants (DFS).
 */
export function collectBranchAndDescendants(
  start: string,
  children: ChildrenMap
): Set<string> {
  const allowed = new Set<string>();
  const stack = [start];

  while (stack.length > 0) {
    const branch = stack.pop()!;
    if (allowed.has(branch)) continue;
    allowed.add(branch);

    const childSet = children.get(branch);
    if (childSet) {
      for (const child of childSet) {
        stack.push(child);
      }
    }
  }

  return allowed;
}

/**
 * Print the entire forest: each root, then its full subtree.
 */
export function printForest(
  roots: Set<string>,
  children: ChildrenMap,
  currentBranch?: string
): void {
  const rootList = [...roots].sort((a, b) => a.localeCompare(b));
  for (const [r, root] of rootList.entries()) {
    console.log(formatBranchLine(root, currentBranch));
    const childSet = children.get(root);
    if (childSet) {
      const childList = [...childSet];
      for (const [i, child] of childList.entries()) {
        printSubtree(
          child,
          children,
          currentBranch,
          "",
          i === childList.length - 1
        );
      }
    }
    if (r < rootList.length - 1) console.log("");
  }
}

/**
 * Print only the path root→target and target’s descendants (hide unrelated siblings).
 */
export function printPruned(
  root: string,
  allowed: Set<string>,
  children: ChildrenMap,
  currentBranch?: string
): void {
  // Always print the root line.
  console.log(formatBranchLine(root, currentBranch));

  // Print down the unique ancestor chain from root → … → target.
  // We determine the chain by walking through allowed children where exactly one child on the path is allowed.
  // Then print the full subtree for the final node (target).
  function firstAllowedChildOf(branch: string): string | undefined {
    const childSet = children.get(branch);
    if (!childSet) return undefined;
    const candidates = [...childSet].filter((b) => allowed.has(b));
    // For ancestor path, we expect at most 1 allowed child at each level until target.
    return candidates.length === 1 ? candidates[0] : undefined;
  }

  const path: string[] = [root];
  while (true) {
    const next = firstAllowedChildOf(path[path.length - 1]!);
    if (!next) break;
    path.push(next);
  }

  // Print each path step (as a single-child subtree line)
  // Note: the path[0] is root, already printed.
  for (const branch of path.slice(1)) {
    printSubtree(branch, children, currentBranch, "", true, allowed);
  }

  // Finally, print the target subtree (the last in the path) filtered by 'allowed'
  const target = path[path.length - 1] ?? root;
  const childSet = children.get(target);
  if (childSet) {
    const childList = [...childSet].filter((b) => allowed.has(b));
    for (const [i, child] of childList.entries()) {
      printSubtree(
        child,
        children,
        currentBranch,
        "",
        i === childList.length - 1,
        allowed
      );
    }
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────

const TEE = "├─";
const LAST = "└─";
const INDENT = "   ";

function formatBranchLine(name: string, currentBranch?: string): string {
  const star = currentBranch === name ? " *" : "";
  return `${name}${star}`;
}

function printSubtree(
  branch: string,
  children: ChildrenMap,
  currentBranch: string | undefined,
  prefix: string,
  isLast: boolean,
  allowlist?: Set<string>
): void {
  console.log(
    `${prefix}${isLast ? LAST : TEE} ${formatBranchLine(branch, currentBranch)}`
  );

  const childSet = children.get(branch);
  if (!childSet) return;

  const childList = allowlist
    ? [...childSet].filter((b) => allowlist.has(b))
    : [...childSet];

  const nextPrefix = prefix + (isLast ? INDENT : "│  ");
  for (const [i, child] of childList.entries()) {
    if (!child) continue;

    printSubtree(
      child,
      children,
      currentBranch,
      nextPrefix,
      i === childList.length - 1,
      allowlist
    );
  }
}
